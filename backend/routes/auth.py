import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from database import get_db
from models import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserRegister,
    UserResponse,
)
from utils.auth import (
    create_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from utils.email import hash_reset_token, send_password_reset_email
from config import ACCESS_TOKEN_EXPIRE_MINUTES, FRONTEND_BASE_URL, PASSWORD_RESET_RETURN_LINK

router = APIRouter()


# ── 1. ĐĂNG KÝ ──────────────────────────────────────────────────────────────
@router.post("/api/register", response_model=UserResponse)
async def register_user(user: UserRegister, db=Depends(get_db)):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký!",
        )

    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu quá dài. Vui lòng dùng mật khẩu tối đa 72 ký tự ASCII hoặc ngắn hơn nếu có dấu.",
        )

    hashed_password = hash_password(user.password)
    user_dict = {
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "password_hash": hashed_password,
        "settings": {
            "email_notification": True,
            "push_notification": False,
            "notification_types": {
                "expiry_alert": True,
                "recipe_suggestion": True,
            },
            "theme": "light",
            "diet_preference": "none",
            "allergies": [],
            "disliked_foods": [],
            "favorite_cuisines": [],
            "onboarding_completed": False,
        },
    }

    new_user = await db.users.insert_one(user_dict)
    return UserResponse(
        id=str(new_user.inserted_id),
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
    )


# ── 2. ĐĂNG NHẬP ─────────────────────────────────────────────────────────────
@router.post("/api/login", response_model=Token)
async def login_user(user: UserLogin, db=Depends(get_db)):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng!",
        )

    if not db_user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản này đang dùng đăng nhập Google. Vui lòng dùng Google Login.",
        )

    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng!",
        )

    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng!",
        )

    access_token = create_access_token(
        data={"sub": str(db_user["_id"])},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "full_name": db_user.get("full_name", ""),
            "email": db_user.get("email", ""),
        },
    }


# ── 3. ĐĂNG NHẬP GOOGLE ──────────────────────────────────────────────────────
@router.post("/api/login/google", response_model=Token)
async def login_user_google(payload: GoogleLoginRequest, db=Depends(get_db)):
    google_profile = verify_google_id_token(payload.id_token)

    email = (google_profile.get("email") or "").strip().lower()
    full_name = (google_profile.get("name") or "").strip() or email.split("@")[0]

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không lấy được email từ Google token.",
        )

    db_user = await db.users.find_one({"email": email})
    if not db_user:
        user_dict = {
            "full_name": full_name,
            "email": email,
            "phone": "",
            "password_hash": None,
            "auth_provider": "google",
            "settings": {
                "email_notification": True,
                "push_notification": False,
                "notification_types": {
                    "expiry_alert": True,
                    "recipe_suggestion": True,
                },
                "theme": "light",
                "diet_preference": "none",
                "allergies": [],
                "disliked_foods": [],
                "favorite_cuisines": [],
                "onboarding_completed": False,
            },
        }
        new_user = await db.users.insert_one(user_dict)
        user_id = str(new_user.inserted_id)
    else:
        user_id = str(db_user["_id"])

    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "full_name": db_user.get("full_name", full_name) if db_user else full_name,
            "email": db_user.get("email", email) if db_user else email,
        },
    }


# ── 4. QUÊN MẬT KHẨU ─────────────────────────────────────────────────────────
@router.post("/api/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db=Depends(get_db)):
    email = payload.email.strip().lower()
    db_user = await db.users.find_one({"email": email})

    response_message = {"message": "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."}

    if not db_user:
        return response_message

    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_reset_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    await db.users.update_one(
        {"_id": db_user["_id"]},
        {
            "$set": {
                "password_reset": {
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                    "created_at": datetime.utcnow(),
                }
            }
        },
    )

    reset_url = f"{FRONTEND_BASE_URL}/reset-password.html?token={raw_token}"

    try:
        await run_in_threadpool(
            send_password_reset_email,
            email,
            db_user.get("full_name", ""),
            reset_url,
        )
    except Exception as exc:
        print(f"[RESET PASSWORD] GUI EMAIL THAT BAI cho {email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Khong the gui email dat lai mat khau. Vui long thu lai sau.",
        )

    print(f"[RESET PASSWORD] Da gui email dat lai mat khau cho: {email}")

    if PASSWORD_RESET_RETURN_LINK:
        return {**response_message, "reset_url": reset_url}

    return response_message


# ── 5. ĐẶT LẠI MẬT KHẨU ─────────────────────────────────────────────────────
@router.post("/api/reset-password")
async def reset_password(payload: ResetPasswordRequest, db=Depends(get_db)):
    if len(payload.new_password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu quá dài. Vui lòng dùng mật khẩu ngắn hơn 72 bytes.",
        )

    token_hash = hash_reset_token(payload.token)
    now = datetime.utcnow()

    db_user = await db.users.find_one(
        {
            "password_reset.token_hash": token_hash,
            "password_reset.expires_at": {"$gt": now},
        }
    )

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
        )

    hashed_password = hash_password(payload.new_password)

    await db.users.update_one(
        {"_id": db_user["_id"]},
        {
            "$set": {"password_hash": hashed_password},
            "$unset": {"password_reset": ""},
        },
    )

    return {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."}
