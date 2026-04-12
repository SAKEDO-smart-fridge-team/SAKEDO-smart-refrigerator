import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from database import get_db
from models import RecipeSuggestResponse, RecipeSuggestion
from utils.auth import get_current_user_id

router = APIRouter()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_IMAGE = "assets/images/khac.png"

# Ánh xạ category code → nhãn tiếng Việt và hình ảnh gợi ý
CATEGORY_META: dict[str, dict] = {
    "thit":    {"label": "Thịt & Hải sản",   "img": "assets/images/thit.png"},
    "traicay": {"label": "Rau & Trái cây",    "img": "assets/images/traicay.png"},
    "milk":    {"label": "Sữa & Phô mai",     "img": "assets/images/milk.png"},
    "douong":  {"label": "Đồ uống",           "img": "assets/images/douong.png"},
    "khac":    {"label": "Thực phẩm khác",    "img": "assets/images/khac.png"},
}

# Quy tắc theo từng mode gợi ý
MODE_RULES: dict[str, dict] = {
    "gan_het_han": {
        "title": "Ưu tiên nguyên liệu sắp hết hạn",
        "rules": [
            "Ưu tiên tuyệt đối các nguyên liệu có expiry_date gần nhất (trong vòng 7 ngày).",
            "Đề xuất món giúp dùng hết các nguyên liệu sắp hết hạn trước.",
            "Có thể kết hợp nhiều nguyên liệu gần hết hạn trong cùng một món.",
        ],
    },
    "giam_can": {
        "title": "Giảm cân – ít calo, lành mạnh",
        "rules": [
            "Ưu tiên nguyên liệu từ nhóm Rau & Trái cây.",
            "Hạn chế dầu mỡ, không chiên ngập dầu; ưu tiên luộc, hấp, xào ít dầu.",
            "Tránh đề xuất món có nhiều tinh bột đơn (bánh mì trắng, cơm nhiều).",
            "Mỗi món nên dưới 400 calo/phần.",
            "Nếu có thịt, ưu tiên ức gà, cá, tôm; tránh thịt mỡ nhiều.",
        ],
    },
    "nau_nhanh": {
        "title": "Nấu nhanh – dưới 20 phút",
        "rules": [
            "Thời gian chế biến tổng cộng KHÔNG vượt quá 20 phút.",
            "Ưu tiên phương pháp xào, chiên nhanh, trộn salad, hoặc luộc đơn giản.",
            "Tối giản bước sơ chế; tránh món cần ướp lâu hoặc hầm.",
            "Ghi rõ thời gian nấu trong tên hoặc bước đầu tiên.",
        ],
    },
    "tang_co": {
        "title": "Bổ protein – nhiều đạm",
        "rules": [
            "Ưu tiên nguyên liệu từ nhóm Thịt & Hải sản.",
            "Mỗi món phải có ít nhất một nguồn protein chính (thịt/cá/tôm/trứng/đậu hũ).",
            "Có thể kết hợp nhiều nguồn protein trong một món.",
            "Đề xuất cả món phụ giàu đạm nếu có thể.",
        ],
    },
    "thuan_chay": {
        "title": "Thuần chay – không thịt, không hải sản",
        "rules": [
            "TUYỆT ĐỐI không dùng thịt, cá, tôm, hải sản, hoặc sản phẩm từ động vật (kể cả nước mắm).",
            "Ưu tiên nguyên liệu từ nhóm Rau & Trái cây và Thực phẩm khác (đậu hũ, nấm, ngũ cốc).",
            "Thay thế nước mắm bằng nước tương/xì dầu.",
            "Đảm bảo món đủ đạm từ đậu hũ, đậu các loại, hoặc nấm.",
        ],
    },
    "ngau_nhien": {
        "title": "Ngẫu nhiên – bất ngờ từ tủ lạnh",
        "rules": [
            "Gợi ý 3 món đa dạng, khai thác nhiều nhóm thực phẩm khác nhau có trong tủ.",
            "Không cần theo chủ đề dinh dưỡng cố định; ưu tiên sáng tạo và thú vị.",
            "Mỗi món nên dùng nguyên liệu khác nhau để tạo sự đa dạng.",
        ],
    },
}


def _strip_code_fence(text: str) -> str:
    """Loại bỏ markdown code fence và trả về JSON thuần."""
    value = (text or "").strip()
    # Xử lý ```json ... ``` hoặc ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", value)
    if match:
        return match.group(1).strip()
    # Fallback: cắt từ '[' hoặc '{'
    for start_char in ("[", "{"):
        idx = value.find(start_char)
        if idx != -1:
            return value[idx:]
    return value


def _normalize_str(s: str) -> str:
    """Chuẩn hoá chuỗi để so sánh không phân biệt hoa/thường và khoảng trắng."""
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _validate_available(
    raw_recipe: dict[str, Any],
    fridge_names: set[str],
) -> dict[str, Any]:
    """
    Kiểm tra trường 'available' từ AI:
    - Chỉ giữ lại các mục mà tên khớp (gần đúng) với thực phẩm trong kho.
    - Mục không khớp → chuyển sang 'missing' để không hiển thị sai.
    """
    ingredients = raw_recipe.get("ingredients") or {}
    available_raw: list[dict] = ingredients.get("available") or []
    missing_raw: list[dict] = ingredients.get("missing") or []

    confirmed_available: list[dict] = []
    extra_missing: list[dict] = []

    for item in available_raw:
        item_name_norm = _normalize_str(item.get("name", ""))
        # Khớp nếu tên kho chứa/bằng tên AI trả về, hoặc ngược lại (fuzzy nhẹ)
        matched = any(
            item_name_norm in _normalize_str(fn) or _normalize_str(fn) in item_name_norm
            for fn in fridge_names
        )
        if matched:
            confirmed_available.append(item)
        else:
            extra_missing.append(item)

    raw_recipe["ingredients"] = {
        "available": confirmed_available,
        "missing": missing_raw + extra_missing,
    }
    return raw_recipe


def _group_by_category(items: list[dict]) -> dict[str, list[str]]:
    """Nhóm tên nguyên liệu theo danh mục → {label: [tên, ...]}"""
    grouped: dict[str, list[str]] = defaultdict(list)
    for item in items:
        cat = item.get("category_code") or item.get("category", "khac")
        label = CATEGORY_META.get(cat, CATEGORY_META["khac"])["label"]
        qty = item.get("quantity", 1)
        name_with_qty = f"{item['name']} (x{qty})"
        if item.get("expiry_date"):
            name_with_qty += f" [hết hạn: {item['expiry_date']}]"
        grouped[label].append(name_with_qty)
    return dict(grouped)


def _get_img_for_item(category: str) -> str:
    return CATEGORY_META.get(category, CATEGORY_META["khac"])["img"]


def _normalize_recipe(raw: dict[str, Any]) -> RecipeSuggestion:
    name = str(raw.get("name") or "").strip() or "Món ăn từ tủ lạnh"
    img = str(raw.get("img") or "").strip() or DEFAULT_IMAGE

    ingredients = raw.get("ingredients") or {}
    available = ingredients.get("available") or []
    missing = ingredients.get("missing") or []

    def _norm_ing(item: dict[str, Any]) -> dict[str, str]:
        return {
            "name": str(item.get("name") or "").strip() or "Nguyên liệu",
            "weight": str(item.get("weight") or "1 phần").strip() or "1 phần",
        }

    steps = raw.get("steps") or []
    normalized_steps = []
    for idx, step in enumerate(steps, start=1):
        normalized_steps.append(
            {
                "stepNumber": int(step.get("stepNumber") or idx),
                "title": str(step.get("title") or f"Bước {idx}").strip(),
                "instructions": [
                    str(line).strip()
                    for line in (step.get("instructions") or [])
                    if str(line).strip()
                ],
            }
        )

    raw_prep = raw.get("prepTime") or raw.get("prep_time")
    prep_time: int | None = None
    if raw_prep is not None:
        try:
            prep_time = int(raw_prep)
        except (ValueError, TypeError):
            prep_time = None

    return RecipeSuggestion(
        name=name,
        img=img,
        ingredients={
            "available": [_norm_ing(i) for i in available],
            "missing": [_norm_ing(i) for i in missing],
        },
        steps=normalized_steps,
        prepTime=prep_time,
    )


@router.post("/api/recipes/suggest", response_model=RecipeSuggestResponse)
async def suggest_recipes(
    payload: Optional[dict] = None,
    db=Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENROUTER_API_KEY chưa được cấu hình.",
        )

    # Đọc mode từ payload gửi lên (nếu có)
    mode: str = (payload or {}).get("mode", "ngau_nhien")
    mode_cfg = MODE_RULES.get(mode, MODE_RULES["ngau_nhien"])

    # Lấy toàn bộ thực phẩm trong tủ từ DB
    items = await db.fridge_items.find({"user_id": user_id}).to_list(300)
    if not items:
        return {"recipes": []}

    # Sắp xếp: thực phẩm có expiry_date (gần hết hạn nhất trước), sau đó mới đến None
    # MongoDB .sort("expiry_date", 1) đặt None lên đầu – sai với chế độ gần hết hạn
    items.sort(key=lambda x: (
        x.get("expiry_date") is None,          # False (0) < True (1) → có hạn dùng lên trước
        x.get("expiry_date") or ""             # sắp xếp tăng dần trong nhóm có hạn
    ))

    # Chuẩn bị danh sách nguyên liệu có đầy đủ thông tin danh mục
    item_list = [
        {
            "name": item.get("name", ""),
            "quantity": int(item.get("quantity", 1)),
            "category_code": item.get("category", "khac"),
            "category_label": CATEGORY_META.get(
                item.get("category", "khac"), CATEGORY_META["khac"]
            )["label"],
            "expiry_date": item.get("expiry_date") or None,
        }
        for item in items
    ]

    # Nhóm nguyên liệu theo danh mục để AI dễ hiểu bối cảnh
    grouped = _group_by_category(item_list)

    # ── System prompt – quy tắc cố định ──────────────────────────────────────
    system_prompt = (
        "Bạn là đầu bếp AI chuyên về ẩm thực Việt Nam. "
        "Nhiệm vụ: dựa trên kho nguyên liệu CÓ SẴN trong tủ lạnh, tạo công thức nấu ăn phù hợp "
        "và chỉ rõ những nguyên liệu cần mua thêm.\n\n"
        "QUY TẮC BẮT BUỘC:\n"
        "1. Trả về JSON hợp lệ, KHÔNG có markdown, KHÔNG có giải thích ngoài JSON.\n"
        "2. Định dạng mỗi công thức:\n"
        "   {\"name\":\"...\",\"img\":\"...\",\"prepTime\":20,"
        "\"ingredients\":{\"available\":[{\"name\":\"...\",\"weight\":\"...\"}],\"missing\":[{\"name\":\"...\",\"weight\":\"...\"}]},"
        "\"steps\":[{\"stepNumber\":1,\"title\":\"...\",\"instructions\":[\"...\"]}]}\n"
        "3. prepTime = số phút chuẩn bị + nấu (số nguyên, ví dụ 15 hoặc 30).\n"
        "4. QUAN TRỌNG – Trường 'available':\n"
        "   - CHỈ được liệt kê nguyên liệu CÓ TRONG danh sách kho tủ lạnh đã cung cấp.\n"
        "   - Dùng ĐÚNG tên như trong danh sách kho (không đổi tên, không sáng tạo thêm).\n"
        "   - KHÔNG được thêm vào available bất kỳ nguyên liệu nào KHÔNG có trong kho.\n"
        "5. QUAN TRỌNG – Trường 'missing':\n"
        "   - Liệt kê TẤT CẢ nguyên liệu cần thiết cho món nhưng KHÔNG có trong kho.\n"
        "   - Đây là danh sách 'cần mua thêm' cho người dùng.\n"
        "6. Mỗi món phải dùng ÍT NHẤT 2 nguyên liệu từ kho làm nguyên liệu chính.\n"
        "   Không gợi ý món mà gần như toàn bộ nguyên liệu đều thiếu.\n"
        "7. Tên món bằng tiếng Việt có dấu. Mỗi bước instructions là mảng chuỗi chi tiết.\n"
        "8. Trường img dùng đường dẫn phù hợp với nguyên liệu chính của món:\n"
        "   - Thịt/hải sản: \"assets/images/thit.png\"\n"
        "   - Rau/chay: \"assets/images/traicay.png\"\n"
        "   - Sữa/trứng: \"assets/images/milk.png\"\n"
        "   - Khác: \"assets/images/khac.png\"\n"
    )

    # ── User prompt – context cụ thể cho từng lần gọi ────────────────────────
    rules_text = "\n".join(f"   - {r}" for r in mode_cfg["rules"])
    grouped_text = "\n".join(
        f"   [{cat}]: {', '.join(names)}"
        for cat, names in grouped.items()
    )
    # Flat list of exact names for AI to copy verbatim into "available"
    flat_names = ", ".join(f'"{it["name"]}"' for it in item_list)

    user_prompt = (
        f"NHU CẦU ĂN: {mode_cfg['title']}\n"
        f"YÊU CẦU ĐẶC BIỆT:\n{rules_text}\n\n"
        f"DANH SÁCH TÊN NGUYÊN LIỆU TRONG KHO (dùng ĐÚNG các tên này cho trường 'available'):\n"
        f"   {flat_names}\n\n"
        f"KHO THỰC PHẨM (phân theo danh mục, số lượng và hạn dùng):\n{grouped_text}\n\n"
        f"Yêu cầu:\n"
        f"1. Gợi ý 3 công thức nấu ăn phù hợp nhất với nhu cầu '{mode_cfg['title']}', "
        f"lấy nguyên liệu từ kho làm GỐC.\n"
        f"2. Mỗi món phải dùng ít nhất 2 nguyên liệu từ kho ở trên.\n"
        f"3. Những nguyên liệu cần thêm mà không có trong kho → liệt kê vào 'missing' (cần mua).\n"
        f"4. Trả về JSON array (không markdown, không giải thích)."
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 2500,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=body)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể kết nối OpenRouter: {exc}",
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenRouter trả về lỗi: {response.text}",
        )

    data = response.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )

    cleaned = _strip_code_fence(content)
    try:
        raw_parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenRouter không trả về JSON hợp lệ.",
        )

    # Chấp nhận cả dạng [...] và {"recipes": [...]}
    if isinstance(raw_parsed, dict):
        raw_recipes = raw_parsed.get("recipes", [])
    elif isinstance(raw_parsed, list):
        raw_recipes = raw_parsed
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dữ liệu công thức từ OpenRouter không đúng định dạng.",
        )

    # Tập tên thực phẩm trong kho (để cross-check 'available' từ AI)
    fridge_name_set: set[str] = {it["name"] for it in item_list}

    validated = [
        _validate_available(r, fridge_name_set)
        for r in raw_recipes
        if isinstance(r, dict)
    ]
    normalized = [_normalize_recipe(r) for r in validated]
    return {"recipes": normalized}
