from datetime import date, datetime

from bson import ObjectId
from fastapi.concurrency import run_in_threadpool
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError

from utils.email import send_expiry_alert_email
from services.push_service import send_push_to_user

_INDEX_READY = False


async def ensure_expiry_alert_indexes(db) -> None:
    global _INDEX_READY
    if _INDEX_READY:
        return

    await db.expiry_alert_logs.create_index(
        [
            ("user_id", ASCENDING),
            ("item_key", ASCENDING),
            ("alert_date", ASCENDING),
            ("alert_type", ASCENDING),
        ],
        name="uniq_daily_expiry_alert",
        unique=True,
    )
    _INDEX_READY = True


def parse_expiry_date(expiry_date: str | None) -> date | None:
    if not expiry_date:
        return None

    value = expiry_date.strip()
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _to_object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except Exception:
        return None


async def process_expiry_alerts(db, days_threshold: int = 3) -> dict:
    await ensure_expiry_alert_indexes(db)

    today = date.today()
    today_str = today.isoformat()

    raw_items = await db.fridge_items.find(
        {
            "expiry_date": {"$exists": True, "$type": "string", "$ne": ""},
            "quantity": {"$gt": 0},
        }
    ).to_list(length=5000)

    grouped_items: dict[str, list[dict]] = {}

    for item in raw_items:
        user_id = str(item.get("user_id") or "").strip()
        if not user_id:
            continue

        expiry_date = parse_expiry_date(item.get("expiry_date"))
        if not expiry_date:
            continue

        days_left = (expiry_date - today).days
        if days_left < 0 or days_left > days_threshold:
            continue

        item_name = str(item.get("name") or "").strip()
        if not item_name:
            continue

        grouped_items.setdefault(user_id, []).append(
            {
                "name": item_name,
                "quantity": max(1, int(item.get("quantity") or 1)),
                "expiry_date": expiry_date.isoformat(),
                "days_left": days_left,
                "item_key": f"{item_name.lower()}|{expiry_date.isoformat()}",
            }
        )

    if not grouped_items:
        return {
            "users_scanned": 0,
            "emails_sent": 0,
            "push_sent": 0,
            "items_in_email": 0,
            "skipped_already_sent": 0,
        }

    user_ids = [obj_id for obj_id in (_to_object_id(uid) for uid in grouped_items.keys()) if obj_id]
    if not user_ids:
        return {
            "users_scanned": 0,
            "emails_sent": 0,
            "push_sent": 0,
            "items_in_email": 0,
            "skipped_already_sent": 0,
        }

    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=2000)

    users_by_id = {str(user["_id"]): user for user in users}

    emails_sent = 0
    push_sent = 0
    items_in_email = 0
    skipped_already_sent = 0

    for user_id, expiring_items in grouped_items.items():
        user_doc = users_by_id.get(user_id)
        if not user_doc:
            continue

        settings = user_doc.get("settings") or {}
        notif_types = settings.get("notification_types") or {}

        expiry_alert_enabled = bool(notif_types.get("expiry_alert", True))
        if not expiry_alert_enabled:
            continue

        email_enabled = bool(settings.get("email_notification", True)) and bool(user_doc.get("email"))
        push_enabled = bool(settings.get("push_notification", False))
        if not email_enabled and not push_enabled:
            continue

        to_send: list[dict] = []
        for item in expiring_items:
            existed = await db.expiry_alert_logs.find_one(
                {
                    "user_id": user_id,
                    "item_key": item["item_key"],
                    "alert_type": "near_expiry",
                    "alert_date": today_str,
                }
            )
            if existed:
                skipped_already_sent += 1
                continue
            to_send.append(item)

        if not to_send:
            continue

        sent_any_channel = False

        if email_enabled:
            try:
                await run_in_threadpool(
                    send_expiry_alert_email,
                    user_doc.get("email", "").strip(),
                    user_doc.get("full_name", "").strip(),
                    to_send,
                    days_threshold,
                )
                emails_sent += 1
                items_in_email += len(to_send)
                sent_any_channel = True
            except Exception as exc:
                print(f"[EXPIRY ALERT] Gui email that bai cho user {user_id}: {exc}")

        if push_enabled:
            nearest_item = min(to_send, key=lambda item: item["days_left"])
            title = "Thuc pham sap het han"
            body = (
                f"{nearest_item['name']} còn {nearest_item['days_left']} ngay. "
                f"Ban co tong cong {len(to_send)} mon can uu tien dung."
            )
            push_result = await send_push_to_user(
                db,
                user_id,
                title,
                body,
                {
                    "type": "expiry_alert",
                    "items": to_send,
                },
            )
            if push_result.get("sent", 0) > 0:
                push_sent += int(push_result.get("sent", 0))
                sent_any_channel = True

        if not sent_any_channel:
            continue

        for item in to_send:
            try:
                await db.expiry_alert_logs.insert_one(
                    {
                        "user_id": user_id,
                        "item_key": item["item_key"],
                        "item_name": item["name"],
                        "expiry_date": item["expiry_date"],
                        "days_left": item["days_left"],
                        "alert_type": "near_expiry",
                        "alert_date": today_str,
                        "sent_at": datetime.utcnow(),
                    }
                )
            except DuplicateKeyError:
                skipped_already_sent += 1

    return {
        "users_scanned": len(grouped_items),
        "emails_sent": emails_sent,
        "push_sent": push_sent,
        "items_in_email": items_in_email,
        "skipped_already_sent": skipped_already_sent,
    }
