from __future__ import annotations

import re
import unicodedata
from typing import Any

DEFAULT_IMAGE_URL = "assets/images/khac.png"

CATEGORY_IMAGE_MAP = {
    "milk": "assets/images/milk.png",
    "thit": "assets/images/thit.png",
    "traicay": "assets/images/traicay.png",
    "douong": "assets/images/douong.png",
    "khac": DEFAULT_IMAGE_URL,
}


def normalize_label_key(value: str) -> str:
    text = (value or "").strip().lower()
    if not text:
        return ""

    # Remove Vietnamese accents so model labels and mapping keys match consistently.
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))

    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def get_fallback_image_url(category: str | None) -> str:
    key = (category or "khac").strip().lower()
    return CATEGORY_IMAGE_MAP.get(key, DEFAULT_IMAGE_URL)


async def resolve_image_url_for_label(db: Any, label: str, category: str | None = None) -> str:
    label_key = normalize_label_key(label)

    if label_key:
        doc = await db.food_label_images.find_one(
            {
                "$or": [
                    {"label_key": label_key},
                    {"aliases": label_key},
                ]
            }
        )
        if doc and str(doc.get("image_url") or "").strip():
            return str(doc["image_url"]).strip()

    return get_fallback_image_url(category)


async def attach_images_for_detections(db: Any, detections: list[dict]) -> list[dict]:
    enriched: list[dict] = []
    for item in detections:
        label = str(item.get("name") or "").strip()
        category = str(item.get("category") or "khac").strip().lower()
        image_url = await resolve_image_url_for_label(db, label, category)

        merged = dict(item)
        merged["image_url"] = image_url
        enriched.append(merged)

    return enriched
