from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Khuôn mẫu khi Frontend gửi dữ liệu Đăng ký lên
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

# Khuôn mẫu khi Frontend gửi dữ liệu Đăng nhập lên
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class NotificationTypeSettings(BaseModel):
    expiry_alert: bool = True
    recipe_suggestion: bool = True


class UserSettingsResponse(BaseModel):
    email_notification: bool = True
    push_notification: bool = False
    notification_types: NotificationTypeSettings = NotificationTypeSettings()
    theme: str = "light"


class UserSettingsUpdate(BaseModel):
    email_notification: Optional[bool] = None
    push_notification: Optional[bool] = None
    notification_types: Optional[NotificationTypeSettings] = None
    theme: Optional[str] = None


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionPayload(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


class PushSubscribeRequest(BaseModel):
    subscription: PushSubscriptionPayload

# Khuôn mẫu dữ liệu trả về cho Frontend (không trả về password)
class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[dict] = None


class DetectedItem(BaseModel):
    name: str
    quantity: int
    confidence: float
    category: Optional[str] = None
    image_url: Optional[str] = None


class ScanDetectResponse(BaseModel):
    detections: list[DetectedItem]


class FridgeItemCreate(BaseModel):
    name: str
    quantity: int = 1
    expiry_date: Optional[str] = None
    location: str = "ngandong"
    category: str = "khac"
    note: Optional[str] = None
    image_url: Optional[str] = None


class FridgeBulkCreateRequest(BaseModel):
    items: list[FridgeItemCreate]


class FridgeItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    expiry_date: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    image_url: Optional[str] = None


class FridgeItemAdjustRequest(BaseModel):
    action: str
    quantity: int = 1


class FridgeItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    quantity: int
    expiry_date: Optional[str] = None
    location: str
    category: str
    note: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RecipeIngredient(BaseModel):
    name: str
    weight: str


class RecipeIngredients(BaseModel):
    available: list[RecipeIngredient]
    missing: list[RecipeIngredient]


class RecipeStep(BaseModel):
    stepNumber: int
    title: str
    instructions: list[str]


class RecipeSuggestion(BaseModel):
    name: str
    img: str
    ingredients: RecipeIngredients
    steps: list[RecipeStep]
    prepTime: Optional[int] = None
    tags: Optional[list[str]] = None


class RecipeSuggestResponse(BaseModel):
    recipes: list[RecipeSuggestion]


class FoodImageMappingCreate(BaseModel):
    label: str
    image_url: str
    aliases: list[str] = []


class FoodImageMappingBulkRequest(BaseModel):
    items: list[FoodImageMappingCreate]


class FoodImageMappingResponse(BaseModel):
    label: str
    label_key: str
    image_url: str
    aliases: list[str] = []