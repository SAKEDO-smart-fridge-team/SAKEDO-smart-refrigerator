import json
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


def _strip_code_fence(text: str) -> str:
    value = (text or "").strip()
    if value.startswith("```"):
        parts = value.split("```")
        if len(parts) >= 2:
            value = parts[1].strip()
            if value.startswith("json"):
                value = value[4:].strip()
    return value


def _normalize_recipe(raw: dict[str, Any]) -> RecipeSuggestion:
    name = str(raw.get("name") or "").strip() or "Món ăn từ tủ lạnh"
    img = str(raw.get("img") or "").strip() or DEFAULT_IMAGE

    ingredients = raw.get("ingredients") or {}
    available = ingredients.get("available") or []
    missing = ingredients.get("missing") or []

    def _normalize_ingredient(item: dict[str, Any]) -> dict[str, str]:
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

    return RecipeSuggestion(
        name=name,
        img=img,
        ingredients={
            "available": [_normalize_ingredient(item) for item in available],
            "missing": [_normalize_ingredient(item) for item in missing],
        },
        steps=normalized_steps,
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

    items = await db.fridge_items.find({"user_id": user_id}).sort("updated_at", -1).to_list(300)
    if not items:
        return {"recipes": []}

    item_payload = [
        {
            "name": item.get("name", ""),
            "quantity": int(item.get("quantity", 1)),
            "category": item.get("category", "khac"),
            "expiry_date": item.get("expiry_date"),
        }
        for item in items
    ]

    system_prompt = (
        "Ban la dau bep AI. Hay tra ve JSON hop le (khong markdown) la mang cac cong thuc. "
        "Moi cong thuc co cac truong: name, img, ingredients, steps. "
        "ingredients gom available va missing (moi item co name, weight). "
        "steps la danh sach {stepNumber, title, instructions}. "
        "available phai la tap con tu inventory; missing chi la phan thieu de hoan thanh mon. "
        "Neu khong du nguyen lieu thi van goi y mon phu hop va dua phan thieu vao missing."
    )

    user_prompt = json.dumps(
        {
            "inventory": item_payload,
            "constraints": {
                "language": "vi",
                "max_recipes": 3,
                "prefer_quick": True,
                "img_hint": DEFAULT_IMAGE,
                "strict_schema": True,
            },
        },
        ensure_ascii=True,
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
        "temperature": 0.3,
        "max_tokens": 900,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=body)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Khong the ket noi OpenRouter: {exc}",
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenRouter tra ve loi: {response.text}",
        )

    data = response.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )

    cleaned = _strip_code_fence(content)
    try:
        raw_recipes = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenRouter khong tra ve JSON hop le.",
        ) from exc

    if not isinstance(raw_recipes, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Du lieu cong thuc tu OpenRouter khong dung dinh dang.",
        )

    normalized = [_normalize_recipe(recipe) for recipe in raw_recipes]
    return {"recipes": normalized}
