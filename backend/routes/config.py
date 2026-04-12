from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from config import BASE_DIR, GOOGLE_CLIENT_ID, PUSH_ENABLED, VAPID_PUBLIC_KEY
from database import get_db
from models import FoodImageMappingBulkRequest, FoodImageMappingResponse
from services.food_image_service import normalize_label_key
from utils.auth import get_current_user_id

router = APIRouter()
UPLOADS_DIR = BASE_DIR / "uploads" / "manual-images"


@router.get("/api/config/public")
async def get_public_config():
    """Trả về các config công khai cho Frontend (ví dụ: Google Client ID)."""
    return {
        "google_client_id": GOOGLE_CLIENT_ID,
        "push_enabled": PUSH_ENABLED and bool(VAPID_PUBLIC_KEY),
        "vapid_public_key": VAPID_PUBLIC_KEY,
    }


@router.get("/api/config/food-images", response_model=list[FoodImageMappingResponse])
async def get_food_image_mappings(
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    _ = user_id
    docs = await db.food_label_images.find({}).sort("label", 1).to_list(length=500)
    return [
        FoodImageMappingResponse(
            label=str(doc.get("label") or ""),
            label_key=str(doc.get("label_key") or ""),
            image_url=str(doc.get("image_url") or ""),
            aliases=[str(alias) for alias in (doc.get("aliases") or []) if str(alias).strip()],
        )
        for doc in docs
    ]


@router.post("/api/config/food-images/bulk")
async def save_food_image_mappings(
    payload: FoodImageMappingBulkRequest,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    _ = user_id

    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách mapping ảnh đang trống.",
        )

    now = datetime.utcnow()
    upserted_count = 0

    for item in payload.items:
        label = item.label.strip()
        image_url = item.image_url.strip()
        label_key = normalize_label_key(label)

        if not label or not image_url or not label_key:
            continue

        aliases: list[str] = []
        for raw_alias in item.aliases:
            alias_key = normalize_label_key(raw_alias)
            if alias_key and alias_key not in aliases and alias_key != label_key:
                aliases.append(alias_key)

        result = await db.food_label_images.update_one(
            {"label_key": label_key},
            {
                "$set": {
                    "label": label,
                    "label_key": label_key,
                    "image_url": image_url,
                    "aliases": aliases,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )
        if result.upserted_id is not None or result.modified_count > 0:
            upserted_count += 1

    return {
        "message": "Đã lưu mapping ảnh thực phẩm.",
        "total_processed": len(payload.items),
        "inserted_or_updated": upserted_count,
    }


@router.post("/api/uploads/manual-image")
async def upload_manual_image(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    _ = user_id

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File tải lên phải là ảnh.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh rỗng hoặc không đọc được.",
        )

    suffix = Path(file.filename or "upload.jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    upload_dir = UPLOADS_DIR / user_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex}{suffix}"
    file_path = upload_dir / filename
    file_path.write_bytes(file_bytes)

    public_url = f"{str(request.base_url).rstrip('/')}/uploads/manual-images/{user_id}/{filename}"

    return {
        "message": "Đã tải ảnh lên thành công.",
        "image_url": public_url,
    }
