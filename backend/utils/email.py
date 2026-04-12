import hashlib
import smtplib
import ssl
from email.message import EmailMessage
from typing import Sequence

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


def send_expiry_alert_email(
    recipient_email: str,
    recipient_name: str,
    items: Sequence[dict],
    days_threshold: int,
) -> None:
    if not is_smtp_configured():
        raise RuntimeError("SMTP chua duoc cau hinh day du tren server.")

    name = recipient_name.strip() if recipient_name else "ban"
    normalized_items = [item for item in items if item.get("name")]
    if not normalized_items:
        return

    subject = f"Sakedo - Nhac nho thuc pham sap het han ({len(normalized_items)} mon)"
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    message["To"] = recipient_email

    lines = []
    html_rows = []
    for item in normalized_items:
        item_name = str(item.get("name") or "")
        item_qty = int(item.get("quantity") or 1)
        expiry_date = str(item.get("expiry_date") or "")
        days_left = int(item.get("days_left") or 0)
        day_text = "hom nay" if days_left == 0 else f"{days_left} ngay nua"

        lines.append(f"- {item_name} (SL: {item_qty}) - Han dung: {expiry_date} ({day_text})")
        html_rows.append(
            f"<tr><td>{item_name}</td><td>{item_qty}</td><td>{expiry_date}</td><td>{day_text}</td></tr>"
        )

    plain_body = (
        f"Chao {name},\n\n"
        f"Ban co {len(normalized_items)} thuc pham sap het han trong {days_threshold} ngay toi:\n"
        + "\n".join(lines)
        + "\n\nHay uu tien su dung som de tranh lang phi."
    )

    html_body = f"""
    <p>Chao {name},</p>
    <p>Ban co <strong>{len(normalized_items)}</strong> thuc pham sap het han trong
    <strong>{days_threshold}</strong> ngay toi.</p>
    <table style="border-collapse:collapse;width:100%;max-width:680px;">
      <thead>
        <tr>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Ten mon</th>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">So luong</th>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Han dung</th>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Con lai</th>
        </tr>
      </thead>
      <tbody>
        {''.join(html_rows)}
      </tbody>
    </table>
    <p style="margin-top:12px;">Hay uu tien su dung som de tranh lang phi.</p>
    """

    message.set_content(plain_body)
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls(context=ssl.create_default_context())
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(message)
