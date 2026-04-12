# SAKEDO Smart Refrigerator

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

Nền tảng quản lý thực phẩm trong tủ lạnh theo thời gian thực, kết hợp nhận diện ảnh bằng YOLO và gợi ý công thức nấu ăn bằng AI.

## 1. Giới thiệu

### Mục tiêu dự án

SAKEDO được xây dựng để giúp người dùng theo dõi thực phẩm trong tủ lạnh một cách trực quan, giảm lãng phí, và quyết định nấu món gì nhanh hơn dựa trên nguyên liệu sẵn có.

### Vấn đề dự án giải quyết

- Khó nhớ trong tủ lạnh còn gì, sắp hết hạn món nào.
- Mất thời gian ghi chép thủ công số lượng thực phẩm.
- Không biết nấu món gì từ nguyên liệu hiện có.
- Lãng phí thực phẩm do không có cảnh báo và gợi ý sử dụng kịp thời.

### Cách SAKEDO giải quyết

- Nhận diện thực phẩm từ ảnh để nhập kho nhanh.
- Quản lý tủ lạnh theo từng tài khoản người dùng.
- Theo dõi tồn kho, hạn sử dụng và trạng thái sử dụng.
- Gợi ý món ăn bằng AI theo inventory thực tế.

## 2. Tính năng chính

- Đăng ký, đăng nhập bằng email/mật khẩu.
- Đăng nhập Google OAuth (Google Identity Services).
- Quên mật khẩu và đặt lại mật khẩu qua email SMTP.
- Quét ảnh thực phẩm (YOLO) để nhận diện tên, số lượng và nhóm thực phẩm.
- Quản lý tủ lạnh cá nhân:
	- Thêm nhanh nhiều thực phẩm sau khi scan.
	- Cập nhật/xóa/chỉnh số lượng thực phẩm.
	- Theo dõi hạn sử dụng.
- Gợi ý công thức nấu ăn dựa trên dữ liệu thực phẩm hiện có (OpenRouter).
- Frontend đa trang (HTML/CSS/JS) với dashboard, camera scan, fridge, profile, chat.

## 3. Tech Stack

| Nhóm | Công nghệ |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Vanilla JS) |
| Backend API | Python, FastAPI, Uvicorn |
| Database | MongoDB, Motor (async driver) |
| Authentication | JWT (python-jose), OAuth2 Bearer, Google Identity Services |
| Security | Passlib, bcrypt |
| AI Vision | Ultralytics YOLO |
| AI Recipe | OpenRouter Chat Completions API |
| Upload & Static | FastAPI StaticFiles, Multipart Upload |

Ghi chú: dự án không yêu cầu Node.js để chạy runtime hiện tại.

## 4. Cấu trúc dự án

```
SAKEDO-smart-refrigerator/
├─ index.html                      # Shell app chính (sidebar + topbar)
├─ login.html/register.html/...    # Trang auth và onboarding
├─ pages/                          # Nội dung các trang con (home, fridge, camera...)
├─ js/                             # Logic frontend
├─ css/                            # Styles theo từng trang/tính năng
├─ assets/                         # Ảnh, logo, nhãn thực phẩm
├─ backend/
│  ├─ main.py                      # Entry FastAPI
│  ├─ config.py                    # Đọc biến môi trường
│  ├─ database.py                  # Kết nối MongoDB
│  ├─ models.py                    # Pydantic models
│  ├─ routes/                      # API routes: auth, fridge, inference, recipes, config
│  ├─ services/                    # Business logic (inference, image mapping)
│  ├─ utils/                       # JWT, email
│  ├─ scripts/                     # Script seed dữ liệu mapping ảnh
│  └─ model/best.pt                # YOLO model
└─ README.md
```
## 5. Yêu cầu hệ thống

- Python 3.10+ (khuyên dùng 3.11).
- MongoDB Atlas hoặc MongoDB server có thể truy cập qua URL.
- Mô hình YOLO tại backend/model/best.pt.
- Tài khoản Google Cloud OAuth (nếu bật Google login).
- SMTP account (nếu bật quên mật khẩu qua email).

## 6. Installation (5 phút cho người mới)

### Bước 1: Clone và vào thư mục dự án

```bash
git clone https://github.com/SAKEDO-smart-fridge-team/SAKEDO-smart-refrigerator.git
cd SAKEDO-smart-refrigerator
```

### Bước 2: Tạo virtual environment và cài dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Bước 3: Tạo file môi trường

```bash
cp backend/.env.example backend/.env
```

Thiết lập tối thiểu trong backend/.env:

- MONGODB_URL
- SECRET_KEY

Thiết lập thêm nếu dùng đầy đủ tính năng:

- GOOGLE_CLIENT_ID (Google login)
- SMTP_* (quên mật khẩu qua email)
- OPENROUTER_API_KEY (gợi ý công thức AI)

### Bước 4: Chạy backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Bước 5: Chạy frontend static

Mở terminal mới từ thư mục gốc dự án:

```bash
python3 -m http.server 5501
```

### Bước 6: Truy cập ứng dụng

- Frontend: http://127.0.0.1:5501/login.html
- App shell: http://127.0.0.1:5501/index.html
- Backend API: http://127.0.0.1:8000
- API Docs: http://127.0.0.1:8000/docs

Nếu chạy frontend ở port khác, hãy cập nhật FRONTEND_BASE_URL trong backend/.env.

## 7. Các biến môi trường quan trọng

| Biến | Mô tả |
|---|---|
| MONGODB_URL | Chuỗi kết nối MongoDB |
| GOOGLE_CLIENT_ID | Client ID cho Google Login |
| FRONTEND_BASE_URL | URL frontend dùng trong link reset password |
| SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD | SMTP để gửi email |
| SMTP_FROM_EMAIL, SMTP_FROM_NAME, SMTP_USE_TLS | Thông tin người gửi email |
| PUSH_ENABLED | Bật/tắt kênh Web Push |
| VAPID_PUBLIC_KEY | Public key để frontend đăng ký Push Subscription |
| VAPID_PRIVATE_KEY | Private key để backend gửi Push |
| VAPID_SUBJECT | Subject cho VAPID claims, ví dụ mailto:support@domain.com |
| EXPIRY_ALERT_ENABLED | Bật/tắt gửi email nhắc thực phẩm sắp hết hạn |
| EXPIRY_ALERT_DAYS | Số ngày còn lại để được tính là sắp hết hạn (mặc định 3) |
| EXPIRY_ALERT_CHECK_INTERVAL_MINUTES | Chu kỳ quét và gửi email nhắc hạn (phút) |
| PASSWORD_RESET_RETURN_LINK | true để trả về reset_url khi test local |
| OPENROUTER_API_KEY | API key dùng gợi ý công thức |
| OPENROUTER_MODEL | Model OpenRouter (mặc định openai/gpt-oss-120b:free) |
| YOLO_MODEL_PATH | Đường dẫn model YOLO (mặc định backend/model/best.pt) |
| SECRET_KEY | Khóa ký JWT |

## 8. Seed mapping ảnh thực phẩm (tùy chọn)

Script này đọc label từ model YOLO và tạo dữ liệu mapping vào collection food_label_images.

```bash
cd backend
python scripts/seed_food_label_images.py
```

Kết quả:

- Tạo/cập nhật mapping label -> image_url trong MongoDB.
- Nếu chưa có ảnh phù hợp, hệ thống sẽ trỏ về đường dẫn mặc định trong assets/images/labels.

## 9. API chính

### Authentication

- POST /api/register
- POST /api/login
- POST /api/login/google
- POST /api/forgot-password
- POST /api/reset-password

### Configuration / Upload

- GET /api/config/public
- GET /api/config/food-images
- POST /api/config/food-images/bulk
- POST /api/uploads/manual-image

### Notifications

- GET /api/users/me/settings
- PATCH /api/users/me/settings
- POST /api/push/subscribe
- POST /api/push/unsubscribe

### Inference

- POST /api/scan/detect

### Fridge

- POST /api/fridge/items/bulk
- GET /api/fridge/items
- PATCH /api/fridge/items/{item_id}
- POST /api/fridge/items/{item_id}/adjust
- DELETE /api/fridge/items/{item_id}

### Recipes

- POST /api/recipes/suggest

## 10. Luồng sử dụng đề xuất

1. Người dùng đăng nhập/đăng ký.
2. Vào camera scan ảnh thực phẩm.
3. Xác nhận danh sách nhận diện và lưu vào tủ lạnh.
4. Theo dõi dashboard (sắp hết hạn, tồn kho).
5. Gọi API gợi ý món ăn theo inventory hiện tại.

## 11. Sự cố thường gặp

- Lỗi không kết nối MongoDB:
	- Kiểm tra MONGODB_URL.
	- Kiểm tra IP whitelist trên MongoDB Atlas.

- Lỗi YOLO model không tải được:
	- Đảm bảo backend/model/best.pt tồn tại.
	- Hoặc cấu hình đúng YOLO_MODEL_PATH.

- Google login không hoạt động:
	- Kiểm tra GOOGLE_CLIENT_ID ở backend/.env.
	- Kiểm tra OAuth client là loại Web application.
	- Kiểm tra origin/redirect trong Google Cloud Console.

- Quên mật khẩu không gửi email:
	- Kiểm tra SMTP_HOST/PORT/USERNAME/PASSWORD.
	- Nếu dùng Gmail, cần App Password.

- API gợi ý công thức lỗi:
	- Kiểm tra OPENROUTER_API_KEY còn hiệu lực.
	- Kiểm tra model trong OPENROUTER_MODEL.

## 12. Định hướng phát triển

- Chuẩn hóa phân quyền người dùng/role.
- Bổ sung test tự động (unit + integration).
- Thêm Docker Compose cho môi trường local.
- Đồng bộ tốt hơn giữa trạng thái frontend và dữ liệu backend.
## 13. Nhóm phát triển
| Tên | GIthub |
|Tôn Hoàng Nhớ|
|Dương Thế Khải|
| Nguyễn Văn Trường |
| Huỳnh Lê Khả Như |
| Tống Nhật Thúy |