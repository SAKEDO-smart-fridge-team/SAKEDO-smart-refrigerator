from pydantic import BaseModel, EmailStr
from typing import Optional

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

# Khuôn mẫu dữ liệu trả về cho Frontend (không trả về password)
class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str
class Token(BaseModel):
    access_token: str
    token_type: str