from collections import Counter
from io import BytesIO

from fastapi import HTTPException, status
from PIL import Image

from config import YOLO_MODEL_PATH

_model = None


def get_yolo_model():
    global _model
    if _model is not None:
        return _model

    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Thiếu thư viện ultralytics. Hãy cài dependencies backend mới nhất.",
        ) from exc

    model_path = YOLO_MODEL_PATH
    try:
        _model = YOLO(model_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Không tải được model YOLO. Hãy đặt file tại backend/model/best.pt "
                "hoặc cấu hình biến YOLO_MODEL_PATH."
            ),
        ) from exc

    return _model


def infer_category_from_label(label: str) -> str:
    text = (label or "").strip().lower()
    normalized = text.replace("&", " ").replace("/", " ")

    if any(keyword in normalized for keyword in ["milk", "cheese", "sua", "pho mai", "butter", "yogurt", "cream"]):
        return "milk"

    if any(keyword in normalized for keyword in ["meat", "fish", "shrimp", "beef", "pork", "chicken", "thit", "ca", "hai san", "seafood"]):
        return "thit"

    if any(keyword in normalized for keyword in ["vegetable", "veggie", "fruit", "vegetable", "rau", "trai cay", "traicay", "cucumber", "tomato", "lettuce", "carrot"]):
        return "traicay"

    if any(keyword in normalized for keyword in ["drink", "juice", "water", "soda", "beer", "coffee", "tea", "nuoc", "douong"]):
        return "douong"

    return "khac"


def predict_detected_items(image_bytes: bytes, conf_threshold: float = 0.35) -> list[dict]:
    model = get_yolo_model()

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    results = model.predict(source=image, conf=conf_threshold, verbose=False)

    if not results:
        return []

    result = results[0]
    names_map = result.names or {}
    boxes = result.boxes

    if boxes is None or len(boxes) == 0:
        return []

    counter: Counter[str] = Counter()
    best_confidence: dict[str, float] = {}

    for cls_idx, conf in zip(boxes.cls.tolist(), boxes.conf.tolist()):
        class_id = int(cls_idx)
        label = str(names_map.get(class_id, f"class_{class_id}")).strip()
        if not label:
            label = f"class_{class_id}"

        counter[label] += 1
        score = round(float(conf), 4)
        if label not in best_confidence or score > best_confidence[label]:
            best_confidence[label] = score

    detections = [
        {
            "name": label,
            "quantity": qty,
            "confidence": round(best_confidence.get(label, 0.0), 4),
            "category": infer_category_from_label(label),
        }
        for label, qty in counter.items()
    ]
    detections.sort(key=lambda item: (-item["quantity"], -item["confidence"], item["name"]))
    return detections
