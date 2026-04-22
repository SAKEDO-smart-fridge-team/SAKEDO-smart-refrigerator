from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from config import MONGODB_URL

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(MONGODB_URL)
    _db = _client.sakedo_db
    await _ensure_indexes(_db)
    print("Đã kết nối thành công tới MongoDB Atlas!")


async def _ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    try:
        await db.users.create_index([("email", ASCENDING)], unique=True, name="users_email_unique")
    except Exception as exc:
        print(f"[DB] Canh bao: khong tao duoc unique index users_email_unique: {exc}")
        await db.users.create_index([("email", ASCENDING)], name="users_email")

    await db.users.create_index([("created_at", DESCENDING)], name="users_created_at_desc")
    await db.users.create_index([("is_admin", ASCENDING)], name="users_is_admin")

    await db.fridge_items.create_index([("user_id", ASCENDING)], name="fridge_user_id")
    await db.fridge_items.create_index([("expiry_date", ASCENDING)], name="fridge_expiry_date")

    await db.admin_audit_logs.create_index([("created_at", DESCENDING)], name="audit_created_at_desc")
    await db.admin_audit_logs.create_index([("action", ASCENDING)], name="audit_action")


async def close_db():
    if _client:
        _client.close()
        print("Đã đóng kết nối MongoDB.")


def get_db() -> AsyncIOMotorDatabase:
    """Dependency để inject database vào route handlers."""
    if _db is None:
        raise RuntimeError("Database chưa được khởi tạo. Gọi connect_db() trước.")
    return _db
