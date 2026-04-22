from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from config import ADMIN_EMAILS
from database import get_db
from utils.auth import require_admin_user

router = APIRouter()


class AdminRoleUpdate(BaseModel):
    is_admin: bool


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
    db=Depends(get_db),
    admin_user: dict = Depends(require_admin_user),
):
    _ = admin_user

    user_docs = await db.users.find({}).sort("created_at", -1).to_list(length=1000)
    if not user_docs:
        return []

    user_ids = [doc.get("_id") for doc in user_docs if doc.get("_id")]

    fridge_stats = await db.fridge_items.aggregate(
        [
            {"$match": {"user_id": {"$in": [str(uid) for uid in user_ids]}}},
            {
                "$group": {
                    "_id": "$user_id",
                    "total_items": {"$sum": 1},
                    "total_quantity": {"$sum": "$quantity"},
                }
            },
        ]
    ).to_list(length=2000)

    stats_by_user: dict[str, dict] = {str(item["_id"]): item for item in fridge_stats}

    users = []
    for user in user_docs:
        uid = str(user.get("_id"))
        user_stats = stats_by_user.get(uid, {})
        email = str(user.get("email") or "").strip().lower()
        effective_admin = bool(user.get("is_admin", False)) or email in ADMIN_EMAILS
        users.append(
            {
                "id": uid,
                "full_name": str(user.get("full_name") or ""),
                "email": email,
                "phone": str(user.get("phone") or ""),
                "is_admin": effective_admin,
                "auth_provider": str(user.get("auth_provider") or "password"),
                "created_at": user.get("created_at"),
                "last_login_at": user.get("last_login_at"),
                "total_items": int(user_stats.get("total_items", 0)),
                "total_quantity": int(user_stats.get("total_quantity", 0)),
            }
        )

    return users


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

    delete_user_result = await db.users.delete_one({"_id": target_user_id})
    if delete_user_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng cần xóa.",
        )

    await db.fridge_items.delete_many({"user_id": target_user_id_str})
    await db.favorites.delete_many({"user_id": target_user_id_str})
    await db.push_subscriptions.delete_many({"user_id": target_user_id_str})

    return {"message": "Đã xóa người dùng và dữ liệu liên quan."}
