from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import MONGODB_URL

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(MONGODB_URL)
    _db = _client.sakedo_db
    print("Đã kết nối thành công tới MongoDB Atlas!")


async def close_db():
    if _client:
        _client.close()
        print("Đã đóng kết nối MongoDB.")


def get_db() -> AsyncIOMotorDatabase:
    """Dependency để inject database vào route handlers."""
    if _db is None:
        raise RuntimeError("Database chưa được khởi tạo. Gọi connect_db() trước.")
    return _db
