from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from models import UserRegister, UserResponse
from bson import ObjectId
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from jose import JWTError, jwt
from models import (
    UserRegister,
    UserResponse,
    UserLogin,
    Token,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
import json
import urllib.parse
import urllib.request
import secrets
import hashlib
import smtplib
import ssl
from email.message import EmailMessage

# Load biến môi trường
load_dotenv()

app = FastAPI(title="Sakedo Smart Fridge API")
MONGODB_URL = os.getenv("MONGODB_URL")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:5501").strip().rstrip("/")
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Sakedo Smart Fridge").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
PASSWORD_RESET_RETURN_LINK = os.getenv("PASSWORD_RESET_RETURN_LINK", "false").strip().lower() in {"1", "true", "yes", "on"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Hằng số bảo mật cho JWT
SECRET_KEY = "sakedo_tuyet_mat_khong_duoc_lo" # Sau này bạn nên đưa cái này vào file .env cho an toàn
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Token có hạn trong 7 ngày


def verify_google_id_token(id_token: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Login chưa được cấu hình trên server."
        )

    token_info_url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + urllib.parse.quote(id_token)

    try:
        with urllib.request.urlopen(token_info_url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token không hợp lệ hoặc đã hết hạn."
        )

    if payload.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token không thuộc ứng dụng này."
        )

    if str(payload.get("email_verified", "")).lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email Google chưa được xác minh."
        )

    return payload


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def is_smtp_configured() -> bool:
    return all([SMTP_HOST, SMTP_PORT, SMTP_FROM_EMAIL, SMTP_USERNAME, SMTP_PASSWORD])


def send_password_reset_email(recipient_email: str, recipient_name: str, reset_url: str):
    if not is_smtp_configured():
        raise RuntimeError("SMTP chưa được cấu hình đầy đủ trên server.")

    message = EmailMessage()
    message["Subject"] = "Sakedo - Dat lai mat khau"
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    message["To"] = recipient_email

    name = recipient_name.strip() if recipient_name else "ban"
    plain_body = (
        f"Chao {name},\n\n"
        "Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.\n"
        "Hay mo lien ket ben duoi de dat lai mat khau (hieu luc 30 phut):\n\n"
        f"{reset_url}\n\n"
        "Neu ban khong yeu cau, hay bo qua email nay."
    )
    html_body = f"""
    <p>Chao {name},</p>
    <p>Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.</p>
    <p>
      Hay bam vao nut ben duoi de dat lai mat khau (hieu luc <strong>30 phut</strong>):
    </p>
    <p>
      <a href=\"{reset_url}\" style=\"display:inline-block;padding:10px 16px;background:#2b8fd8;color:#fff;text-decoration:none;border-radius:8px;\">Dat lai mat khau</a>
    </p>
    <p>Neu ban khong yeu cau, hay bo qua email nay.</p>
    """

    message.set_content(plain_body)
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls(context=ssl.create_default_context())
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(message)

# Hàm tạo JWT Token
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Thiết lập công cụ mã hóa mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client.sakedo_db
    print("Đã kết nối thành công tới MongoDB Atlas!")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    print("Đã đóng kết nối MongoDB.")

# ==========================================
# CÁC API CỦA HỆ THỐNG
# ==========================================

@app.get("/")
async def root():
    return {"message": "Sakedo Backend đang chạy ngon lành!"}


@app.get("/api/config/public")
async def get_public_config():
    return {
        "google_client_id": GOOGLE_CLIENT_ID
    }

# 1. API ĐĂNG KÝ TÀI KHOẢN
@app.post("/api/register", response_model=UserResponse)
async def register_user(user: UserRegister):
    global db
    
    # Kiểm tra xem email đã tồn tại trong database chưa
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký!"
        )

    # bcrypt chỉ hỗ trợ tối đa 72 bytes cho password gốc.
    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu quá dài. Vui lòng dùng mật khẩu tối đa 72 ký tự ASCII hoặc ngắn hơn nếu có dấu."
        )
    
    # Mã hóa mật khẩu
    hashed_password = pwd_context.hash(user.password)
    
    # Tạo document để lưu vào MongoDB
    user_dict = {
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "password_hash": hashed_password,
        "settings": {
            "email_notification": True,
            "theme": "light"
        }
    }
    
    # Lưu vào collection 'users'
    new_user = await db.users.insert_one(user_dict)
    
    # Trả về kết quả cho Frontend (không bao gồm password)
    return UserResponse(
        id=str(new_user.inserted_id),
        full_name=user.full_name,
        email=user.email,
        phone=user.phone
    )
# 2. API ĐĂNG NHẬP
@app.post("/api/login", response_model=Token)
async def login_user(user: UserLogin):
    global db
    
    # 1. Tìm user theo email
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng!"
        )

    if not db_user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản này đang dùng đăng nhập Google. Vui lòng dùng Google Login."
        )

    # bcrypt chỉ hỗ trợ tối đa 72 bytes cho password gốc.
    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng!"
        )

    # 2. Kiểm tra mật khẩu xem có khớp với mã băm trong database không
    if not pwd_context.verify(user.password, db_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng!"
        )

    # 3. Tạo token nếu đúng hết
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user["_id"])}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/login/google", response_model=Token)
async def login_user_google(payload: GoogleLoginRequest):
    global db

    google_profile = verify_google_id_token(payload.id_token)

    email = (google_profile.get("email") or "").strip().lower()
    full_name = (google_profile.get("name") or "").strip() or email.split("@")[0]

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không lấy được email từ Google token."
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
                "theme": "light"
            }
        }
        new_user = await db.users.insert_one(user_dict)
        user_id = str(new_user.inserted_id)
    else:
        user_id = str(db_user["_id"])

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    global db

    email = payload.email.strip().lower()
    db_user = await db.users.find_one({"email": email})

    # Không tiết lộ email có tồn tại hay không để tránh user enumeration.
    response_message = {
        "message": "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."
    }

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
            detail="Khong the gui email dat lai mat khau. Vui long thu lai sau."
        )

    print(f"[RESET PASSWORD] Da gui email dat lai mat khau cho: {email}")

    if PASSWORD_RESET_RETURN_LINK:
        return {
            **response_message,
            "reset_url": reset_url,
        }

    return response_message


@app.post("/api/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    global db

    if len(payload.new_password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu quá dài. Vui lòng dùng mật khẩu ngắn hơn 72 bytes."
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
            detail="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."
        )

    hashed_password = pwd_context.hash(payload.new_password)

    await db.users.update_one(
        {"_id": db_user["_id"]},
        {
            "$set": {"password_hash": hashed_password},
            "$unset": {"password_reset": ""},
        },
    )

    return {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."}