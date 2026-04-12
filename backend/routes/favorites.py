from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from models import FavoriteCreateRequest, FavoriteResponse
from utils.auth import get_current_user_id

router = APIRouter()


def _parse_object_id(favorite_id: str) -> ObjectId:
    try:
        return ObjectId(favorite_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID yêu thích không hợp lệ.",
        ) from exc


@router.post("/api/favorites", response_model=FavoriteResponse)
async def create_favorite(
    payload: FavoriteCreateRequest,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên công thức không được để trống.",
        )

    now = datetime.utcnow()
    normalized_doc = {
        "title": title,
        "img": (payload.img or "assets/images/khac.png").strip() or "assets/images/khac.png",
        "ingredients": (payload.ingredients.dict() if payload.ingredients else {"available": [], "missing": []}),
        "steps": [step.dict() for step in payload.steps],
        "prepTime": payload.prepTime,
        "updated_at": now,
    }

    existing = await db.favorites.find_one({"user_id": user_id, "title": title})

    if existing:
        await db.favorites.update_one(
            {"_id": existing["_id"], "user_id": user_id},
            {"$set": normalized_doc},
        )
        doc = await db.favorites.find_one({"_id": existing["_id"], "user_id": user_id})
    else:
        insert_doc = {
            **normalized_doc,
            "user_id": user_id,
            "created_at": now,
        }
        result = await db.favorites.insert_one(insert_doc)
        doc = await db.favorites.find_one({"_id": result.inserted_id, "user_id": user_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể lưu công thức yêu thích.",
        )

    return FavoriteResponse(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        img=doc.get("img", "assets/images/khac.png"),
        ingredients=doc.get("ingredients", {"available": [], "missing": []}),
        steps=doc.get("steps", []),
        prepTime=doc.get("prepTime"),
        created_at=doc.get("created_at", now),
    )


@router.get("/api/favorites", response_model=list[FavoriteResponse])
async def get_favorites(
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    docs = await db.favorites.find({"user_id": user_id}).sort("created_at", -1).to_list(500)
    now = datetime.utcnow()

    return [
        FavoriteResponse(
            id=str(doc["_id"]),
            title=doc.get("title", ""),
            img=doc.get("img", "assets/images/khac.png"),
            ingredients=doc.get("ingredients", {"available": [], "missing": []}),
            steps=doc.get("steps", []),
            prepTime=doc.get("prepTime"),
            created_at=doc.get("created_at", now),
        )
        for doc in docs
    ]


@router.delete("/api/favorites/{favorite_id}")
async def delete_favorite(
    favorite_id: str,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    object_id = _parse_object_id(favorite_id)
    result = await db.favorites.delete_one({"_id": object_id, "user_id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công thức yêu thích cần xóa.",
        )

    return {"message": "Đã xóa khỏi danh sách yêu thích."}
