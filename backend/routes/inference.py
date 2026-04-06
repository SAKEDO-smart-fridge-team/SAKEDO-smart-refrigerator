from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from models import ScanDetectResponse
from services.inference_service import predict_detected_items
from utils.auth import get_current_user_id

router = APIRouter()


@router.post("/api/scan/detect", response_model=ScanDetectResponse)
async def detect_items_from_image(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    _ = user_id  # Yêu cầu đăng nhập để sử dụng scan

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File tải lên phải là ảnh.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh rỗng hoặc không đọc được.",
        )

    detections = await run_in_threadpool(predict_detected_items, image_bytes)
    return {"detections": detections}
