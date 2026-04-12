import json
from datetime import datetime

from pymongo import ASCENDING

from config import PUSH_ENABLED, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

try:
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover
    WebPushException = Exception
    webpush = None

_PUSH_INDEX_READY = False


def is_push_configured() -> bool:
    return bool(PUSH_ENABLED and VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY and VAPID_SUBJECT and webpush)


async def ensure_push_subscription_indexes(db) -> None:
    global _PUSH_INDEX_READY
    if _PUSH_INDEX_READY:
        return

    await db.push_subscriptions.create_index(
        [("user_id", ASCENDING), ("endpoint", ASCENDING)],
        name="uniq_user_endpoint",
        unique=True,
    )
    _PUSH_INDEX_READY = True


async def save_push_subscription(db, user_id: str, subscription: dict) -> None:
    await ensure_push_subscription_indexes(db)

    endpoint = str(subscription.get("endpoint") or "").strip()
    keys = subscription.get("keys") or {}
    p256dh = str(keys.get("p256dh") or "").strip()
    auth = str(keys.get("auth") or "").strip()

    if not endpoint or not p256dh or not auth:
        raise ValueError("Push subscription không hợp lệ.")

    now = datetime.utcnow()

    await db.push_subscriptions.update_one(
        {
            "user_id": user_id,
            "endpoint": endpoint,
        },
        {
            "$set": {
                "keys": {
                    "p256dh": p256dh,
                    "auth": auth,
                },
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )


async def remove_push_subscription(db, user_id: str, subscription: dict) -> int:
    endpoint = str((subscription or {}).get("endpoint") or "").strip()
    if not endpoint:
        return 0

    result = await db.push_subscriptions.delete_one(
        {
            "user_id": user_id,
            "endpoint": endpoint,
        }
    )
    return int(result.deleted_count)


async def send_push_to_user(db, user_id: str, title: str, body: str, data: dict | None = None) -> dict:
    if not is_push_configured():
        return {"sent": 0, "failed": 0, "reason": "push_not_configured"}

    subscriptions = await db.push_subscriptions.find({"user_id": user_id}).to_list(length=100)
    if not subscriptions:
        return {"sent": 0, "failed": 0, "reason": "no_subscription"}

    payload = {
        "title": title,
        "body": body,
        "icon": "/assets/img/logo.png",
        "badge": "/assets/img/logo.png",
        "data": data or {},
    }

    sent = 0
    failed = 0

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.get("endpoint"),
            "keys": sub.get("keys") or {},
        }

        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload, ensure_ascii=False),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
                ttl=3600,
            )
            sent += 1
        except WebPushException:
            failed += 1
            await db.push_subscriptions.delete_one({"_id": sub["_id"]})
        except Exception:
            failed += 1

    return {"sent": sent, "failed": failed}
