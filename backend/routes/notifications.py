from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from database import get_db
from models import PushSubscribeRequest, UserSettingsResponse, UserSettingsUpdate
from services.push_service import is_push_configured, remove_push_subscription, save_push_subscription
from utils.auth import get_current_user_id

router = APIRouter()


def _default_settings(raw_settings: dict | None) -> dict:
    source = raw_settings or {}
    notif_types = source.get("notification_types") or {}

    return {
        "email_notification": bool(source.get("email_notification", True)),
        "push_notification": bool(source.get("push_notification", False)),
        "notification_types": {
            "expiry_alert": bool(notif_types.get("expiry_alert", True)),
            "recipe_suggestion": bool(notif_types.get("recipe_suggestion", True)),
        },
        "theme": str(source.get("theme", "light") or "light"),
    }


@router.get("/api/users/me/settings", response_model=UserSettingsResponse)
async def get_my_settings(
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    return _default_settings(user.get("settings"))


@router.patch("/api/users/me/settings", response_model=UserSettingsResponse)
async def update_my_settings(
    payload: UserSettingsUpdate,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    update_fields: dict = {}

    if payload.email_notification is not None:
        update_fields["settings.email_notification"] = bool(payload.email_notification)

    if payload.push_notification is not None:
        update_fields["settings.push_notification"] = bool(payload.push_notification)

    if payload.notification_types is not None:
        update_fields["settings.notification_types.expiry_alert"] = bool(payload.notification_types.expiry_alert)
        update_fields["settings.notification_types.recipe_suggestion"] = bool(payload.notification_types.recipe_suggestion)

    if payload.theme is not None:
        update_fields["settings.theme"] = str(payload.theme).strip() or "light"

    if update_fields:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields},
        )

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    return _default_settings(user.get("settings"))


@router.post("/api/push/subscribe")
async def subscribe_push(
    payload: PushSubscribeRequest,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not is_push_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notification chưa được cấu hình trên server.",
        )

    try:
        await save_push_subscription(db, user_id, payload.subscription.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"message": "Đã đăng ký nhận thông báo đẩy."}


@router.post("/api/push/unsubscribe")
async def unsubscribe_push(
    payload: PushSubscribeRequest,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    deleted_count = await remove_push_subscription(db, user_id, payload.subscription.model_dump())
    return {"message": "Đã hủy đăng ký thông báo đẩy.", "deleted": deleted_count > 0}
