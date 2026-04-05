import hashlib
import smtplib
import ssl
from email.message import EmailMessage

from config import (
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_TLS,
)


def hash_reset_token(raw_token: str) -> str:
    """Băm token đặt lại mật khẩu bằng SHA-256."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def is_smtp_configured() -> bool:
    return all([SMTP_HOST, SMTP_PORT, SMTP_FROM_EMAIL, SMTP_USERNAME, SMTP_PASSWORD])


def send_password_reset_email(
    recipient_email: str,
    recipient_name: str,
    reset_url: str,
) -> None:
    if not is_smtp_configured():
        raise RuntimeError("SMTP chưa được cấu hình đầy đủ trên server.")

    name = recipient_name.strip() if recipient_name else "ban"

    message = EmailMessage()
    message["Subject"] = "Sakedo - Dat lai mat khau"
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    message["To"] = recipient_email

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
      <a href="{reset_url}" style="display:inline-block;padding:10px 16px;background:#2b8fd8;color:#fff;text-decoration:none;border-radius:8px;">Dat lai mat khau</a>
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
