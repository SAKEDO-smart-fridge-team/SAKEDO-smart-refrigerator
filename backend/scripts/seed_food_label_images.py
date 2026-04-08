from __future__ import annotations

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = ROOT_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from config import MONGODB_URL, YOLO_MODEL_PATH  # noqa: E402
from services.food_image_service import normalize_label_key  # noqa: E402


def load_model_labels() -> list[str]:
    from ultralytics import YOLO

    model = YOLO(YOLO_MODEL_PATH)
    names = model.names or {}
    labels = [str(names[idx]).strip() for idx in sorted(names.keys())]
    return [label for label in labels if label]


def collect_available_images() -> dict[str, str]:
    image_dirs = [
        PROJECT_DIR / "assets" / "images",
        PROJECT_DIR / "assets" / "img",
    ]

    image_map: dict[str, str] = {}
    for image_dir in image_dirs:
        if not image_dir.exists():
            continue

        for path in image_dir.iterdir():
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue

            key = normalize_label_key(path.stem)
            if not key:
                continue

            rel_path = path.relative_to(PROJECT_DIR).as_posix()
            if key not in image_map:
                image_map[key] = rel_path

    return image_map


async def seed_food_label_images() -> None:
    labels = load_model_labels()
    if not labels:
        print("Khong doc duoc label nao tu model.")
        return

    available_images = collect_available_images()
    now = datetime.now(UTC)

    client = AsyncIOMotorClient(MONGODB_URL)
    db = client.sakedo_db

    matched = 0
    mapped_to_label_path = 0

    try:
        for label in labels:
            label_key = normalize_label_key(label)
            if not label_key:
                continue

            default_label_path = f"assets/images/labels/{label}.png"
            image_url = available_images.get(label_key, default_label_path)
            if label_key in available_images:
                matched += 1
            else:
                mapped_to_label_path += 1

            await db.food_label_images.update_one(
                {"label_key": label_key},
                {
                    "$set": {
                        "label": label,
                        "label_key": label_key,
                        "image_url": image_url,
                        "aliases": [],
                        "updated_at": now,
                    },
                    "$setOnInsert": {
                        "created_at": now,
                    },
                },
                upsert=True,
            )

        print(f"Da seed {len(labels)} nhan vao collection food_label_images.")
        print(f"- Match anh theo ten file: {matched}")
        print(f"- Da tao duong dan nhan-specific can bo sung file: {mapped_to_label_path}")
        print("Hay dat anh vao assets/images/labels theo ten label_key (vd: thit_heo.png).")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_food_label_images())
