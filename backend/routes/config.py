from fastapi import APIRouter
from config import GOOGLE_CLIENT_ID

router = APIRouter()


@router.get("/api/config/public")
async def get_public_config():
    """Trả về các config công khai cho Frontend (ví dụ: Google Client ID)."""
    return {"google_client_id": GOOGLE_CLIENT_ID}
