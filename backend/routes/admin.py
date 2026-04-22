from datetime import datetime, timedelta
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from config import ADMIN_EMAILS
from database import get_db
from utils.auth import require_admin_user

router = APIRouter()


class AdminRoleUpdate(BaseModel):
    is_admin: bool


def _user_snapshot(user: dict) -> dict:
    return {
        "id": str(user.get("_id")),
        "email": str(user.get("email") or "").strip().lower(),
        "full_name": str(user.get("full_name") or ""),
    }


async def _record_admin_action(
    db,
    admin_user: dict,
    action: str,
    target_user: dict | None = None,
    metadata: dict | None = None,
) -> None:
    payload = {
        "action": action,
        "admin": _user_snapshot(admin_user),
        "target_user": target_user or {},
        "metadata": metadata or {},
        "created_at": datetime.utcnow(),
    }
    await db.admin_audit_logs.insert_one(payload)


def _to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID người dùng không hợp lệ.",
        ) from exc


@router.get("/api/admin/me")
async def get_admin_me(admin_user: dict = Depends(require_admin_user)):
    return {
        "id": str(admin_user.get("_id")),
        "email": str(admin_user.get("email") or ""),
        "full_name": str(admin_user.get("full_name") or ""),
        "is_admin": True,
    }


@router.get("/api/admin/overview")
async def get_admin_overview(
    db=Depends(get_db),
    admin_user: dict = Depends(require_admin_user),
):
    _ = admin_user

    today = datetime.utcnow().date()
    soon_iso = (today + timedelta(days=3)).isoformat()

    total_users = await db.users.count_documents({})
    total_items = await db.fridge_items.count_documents({})
    total_favorites = await db.favorites.count_documents({})
    expiring_soon = await db.fridge_items.count_documents(
        {"expiry_date": {"$gte": today.isoformat(), "$lte": soon_iso}}
    )

    return {
        "total_users": total_users,
        "total_items": total_items,
        "total_favorites": total_favorites,
        "expiring_soon": expiring_soon,
    }


@router.get("/api/admin/users")
async def list_users_for_admin(
    q: str = Query(default="", max_length=120),
    role: str = Query(default="all"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
    admin_user: dict = Depends(require_admin_user),
):
    _ = admin_user

    normalized_q = q.strip()
    role_filter = role.strip().lower()

    escaped_q = re.escape(normalized_q)
    skip = (page - 1) * page_size
    admin_email_list = sorted(ADMIN_EMAILS)

    pipeline: list[dict] = [
        {
            "$addFields": {
                "_email_lower": {"$toLower": {"$ifNull": ["$email", ""]}},
                "_effective_admin": {
                    "$or": [
                        {"$ifNull": ["$is_admin", False]},
                        {
                            "$in": [
                                {"$toLower": {"$ifNull": ["$email", ""]}},
                                admin_email_list,
                            ]
                        },
                    ]
                },
            }
        }
    ]

    match_filters: list[dict] = []
    if escaped_q:
        match_filters.append(
            {
                "$or": [
                    {"full_name": {"$regex": escaped_q, "$options": "i"}},
                    {"email": {"$regex": escaped_q, "$options": "i"}},
                ]
            }
        )

    if role_filter == "admin":
        match_filters.append({"_effective_admin": True})
    elif role_filter == "user":
        match_filters.append({"_effective_admin": False})

    if match_filters:
        pipeline.append({"$match": {"$and": match_filters}})

    pipeline.extend(
        [
            {
                "$lookup": {
                    "from": "fridge_items",
                    "let": {"uid": {"$toString": "$_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$user_id", "$$uid"]}}},
                        {
                            "$group": {
                                "_id": None,
                                "total_items": {"$sum": 1},
                                "total_quantity": {"$sum": "$quantity"},
                            }
                        },
                    ],
                    "as": "_fridge_stats",
                }
            },
            {
                "$addFields": {
                    "_fridge_stats": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$_fridge_stats", 0]},
                            {"total_items": 0, "total_quantity": 0},
                        ]
                    }
                }
            },
            {"$sort": {"created_at": -1, "_id": -1}},
            {
                "$facet": {
                    "items": [
                        {"$skip": skip},
                        {"$limit": page_size},
                        {
                            "$project": {
                                "_id": 0,
                                "id": {"$toString": "$_id"},
                                "full_name": {"$ifNull": ["$full_name", ""]},
                                "email": "$_email_lower",
                                "phone": {"$ifNull": ["$phone", ""]},
                                "is_admin": "$_effective_admin",
                                "auth_provider": {"$ifNull": ["$auth_provider", "password"]},
                                "created_at": "$created_at",
                                "last_login_at": "$last_login_at",
                                "total_items": {"$ifNull": ["$_fridge_stats.total_items", 0]},
                                "total_quantity": {"$ifNull": ["$_fridge_stats.total_quantity", 0]},
                            }
                        },
                    ],
                    "total": [{"$count": "count"}],
                }
            },
        ]
    )

    result = await db.users.aggregate(pipeline).to_list(length=1)
    facet_payload = result[0] if result else {"items": [], "total": []}
    users = facet_payload.get("items", [])
    total = int((facet_payload.get("total") or [{}])[0].get("count", 0))
    total_pages = (total + page_size - 1) // page_size if total else 0
    return {
        "items": users,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


@router.get("/api/admin/audit-logs")
async def get_admin_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db=Depends(get_db),
    admin_user: dict = Depends(require_admin_user),
):
    _ = admin_user

    total = await db.admin_audit_logs.count_documents({})
    total_pages = (total + page_size - 1) // page_size if total else 0
    skip = (page - 1) * page_size

    docs = await db.admin_audit_logs.find({}).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)

    items = []
    for doc in docs:
        items.append(
            {
                "id": str(doc.get("_id")),
                "action": str(doc.get("action") or ""),
                "admin": doc.get("admin") or {},
                "target_user": doc.get("target_user") or {},
                "metadata": doc.get("metadata") or {},
                "created_at": doc.get("created_at"),
            }
        )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


@router.patch("/api/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: AdminRoleUpdate,
    db=Depends(get_db),
    admin_user: dict = Depends(require_admin_user),
):
    target_user_id = _to_object_id(user_id)

    if str(admin_user.get("_id")) == str(target_user_id) and not payload.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự gỡ quyền admin của chính mình.",
        )

    result = await db.users.update_one(
        {"_id": target_user_id},
        {"$set": {"is_admin": bool(payload.is_admin)}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng.",
        )

    updated_user = await db.users.find_one({"_id": target_user_id})
    if updated_user:
        await _record_admin_action(
            db,
            admin_user,
            action="update_user_role",
            target_user=_user_snapshot(updated_user),
            metadata={"is_admin": bool(payload.is_admin)},
        )

    return {
        "message": "Cập nhật quyền admin thành công.",
        "user_id": user_id,
        "is_admin": bool(payload.is_admin),
    }


@router.delete("/api/admin/users/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    db=Depends(get_db),
    admin_user: dict = Depends(require_admin_user),
):
    target_user_id = _to_object_id(user_id)
    target_user_id_str = str(target_user_id)

    if str(admin_user.get("_id")) == target_user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự xóa tài khoản admin đang đăng nhập.",
        )

    target_user_doc = await db.users.find_one({"_id": target_user_id})
    delete_user_result = await db.users.delete_one({"_id": target_user_id})
    if delete_user_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng cần xóa.",
        )

    await db.fridge_items.delete_many({"user_id": target_user_id_str})
    await db.favorites.delete_many({"user_id": target_user_id_str})
    await db.push_subscriptions.delete_many({"user_id": target_user_id_str})

    if target_user_doc:
        await _record_admin_action(
            db,
            admin_user,
            action="delete_user",
            target_user=_user_snapshot(target_user_doc),
            metadata={},
        )

    return {"message": "Đã xóa người dùng và dữ liệu liên quan."}
