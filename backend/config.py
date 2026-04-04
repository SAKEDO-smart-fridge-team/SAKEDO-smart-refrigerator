import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL: str = os.getenv("MONGODB_URL", "")

GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()

FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:5501").strip().rstrip("/")

# Bảo mật JWT
SECRET_KEY: str = os.getenv("SECRET_KEY", "sakedo_tuyet_mat_khong_duoc_lo")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 ngày

# SMTP
SMTP_HOST: str = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USERNAME", "")).strip()
SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Sakedo Smart Fridge").strip()
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}

PASSWORD_RESET_RETURN_LINK: bool = (
    os.getenv("PASSWORD_RESET_RETURN_LINK", "false").strip().lower() in {"1", "true", "yes", "on"}
)
