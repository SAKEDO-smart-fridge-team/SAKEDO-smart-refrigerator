from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from models import FridgeBulkCreateRequest, FridgeItemAdjustRequest, FridgeItemResponse, FridgeItemUpdate
from utils.auth import get_current_user_id

router = APIRouter()


def _parse_object_id(item_id: str) -> ObjectId:
    try:
        return ObjectId(item_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID sản phẩm không hợp lệ.",
        ) from exc


@router.post("/api/fridge/items/bulk")
async def add_items_to_fridge(
    payload: FridgeBulkCreateRequest,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách sản phẩm đang trống.",
        )

    now = datetime.utcnow()
    inserted_or_updated = 0

    for item in payload.items:
        name = item.name.strip()
        qty = max(1, int(item.quantity))

        if not name:
            continue

        filter_query = {
            "user_id": user_id,
            "name": name,
            "expiry_date": item.expiry_date,
            "location": item.location,
        }

        update_result = await db.fridge_items.update_one(
            filter_query,
            {
                "$inc": {"quantity": qty},
                "$set": {
                    "category": item.category,
                    "note": item.note,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                    "user_id": user_id,
                    "name": name,
                    "expiry_date": item.expiry_date,
                    "location": item.location,
                },
            },
            upsert=True,
        )

        if update_result.upserted_id is not None or update_result.modified_count > 0:
            inserted_or_updated += 1

    return {
        "message": "Đã thêm sản phẩm vào tủ lạnh.",
        "total_processed": len(payload.items),
        "inserted_or_updated": inserted_or_updated,
    }


@router.get("/api/fridge/items", response_model=list[FridgeItemResponse])
async def get_fridge_items(
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cursor = db.fridge_items.find({"user_id": user_id}).sort("updated_at", -1)
    items = await cursor.to_list(length=500)

    response: list[FridgeItemResponse] = []
    for doc in items:
        response.append(
            FridgeItemResponse(
                id=str(doc["_id"]),
                user_id=str(doc.get("user_id", "")),
                name=doc.get("name", ""),
                quantity=int(doc.get("quantity", 1)),
                expiry_date=doc.get("expiry_date"),
                location=doc.get("location", "tulanh"),
                category=doc.get("category", "khac"),
                note=doc.get("note"),
                created_at=doc.get("created_at", datetime.utcnow()),
                updated_at=doc.get("updated_at", datetime.utcnow()),
            )
        )

    return response


@router.patch("/api/fridge/items/{item_id}")
async def update_fridge_item(
    item_id: str,
    payload: FridgeItemUpdate,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    object_id = _parse_object_id(item_id)

    existing_item = await db.fridge_items.find_one({"_id": object_id, "user_id": user_id})
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm cần cập nhật.",
        )

    update_fields = {}
    for field_name in ("name", "expiry_date", "location", "category", "note"):
        value = getattr(payload, field_name)
        if value is not None:
            update_fields[field_name] = value.strip() if isinstance(value, str) else value

    if payload.quantity is not None:
        update_fields["quantity"] = max(1, int(payload.quantity))

    if not update_fields:
        return {"message": "Không có thay đổi nào để cập nhật."}

    update_fields["updated_at"] = datetime.utcnow()

    await db.fridge_items.update_one(
        {"_id": object_id, "user_id": user_id},
        {"$set": update_fields},
    )

    return {"message": "Đã cập nhật sản phẩm."}


@router.post("/api/fridge/items/{item_id}/adjust")
async def adjust_fridge_item(
    item_id: str,
    payload: FridgeItemAdjustRequest,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    object_id = _parse_object_id(item_id)

    existing_item = await db.fridge_items.find_one({"_id": object_id, "user_id": user_id})
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm cần cập nhật.",
        )

    adjust_qty = max(1, int(payload.quantity))
    current_qty = max(1, int(existing_item.get("quantity", 1)))

    normalized_action = (payload.action or "").strip().lower()
    if normalized_action not in {"use", "delete"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hành động không hợp lệ. Chỉ hỗ trợ 'use' hoặc 'delete'.",
        )

    if adjust_qty >= current_qty:
        await db.fridge_items.delete_one({"_id": object_id, "user_id": user_id})
        return {"message": "Đã xóa sản phẩm.", "deleted": True}

    new_qty = current_qty - adjust_qty
    await db.fridge_items.update_one(
        {"_id": object_id, "user_id": user_id},
        {
            "$set": {
                "quantity": new_qty,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return {"message": "Đã cập nhật số lượng.", "deleted": False, "quantity": new_qty}


@router.delete("/api/fridge/items/{item_id}")
async def delete_fridge_item(
    item_id: str,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    object_id = _parse_object_id(item_id)
    result = await db.fridge_items.delete_one({"_id": object_id, "user_id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sản phẩm cần xóa.",
        )

    return {"message": "Đã xóa sản phẩm."}
