# AI Scanner Backend — Hướng Dẫn Chạy

## Tổng Quan

Backend là một Express.js server chạy trên **Node.js**, đóng vai trò Business Layer theo kiến trúc 3 tầng:

```
Mobile App (Expo/React Native)
        │ multipart/form-data
        ▼
Express Backend (src/backend/)
        │ HTTP → Gemini API
        ▼
Google AI Studio (Gemini 2.0 Flash vision)
        │ JSON structured response
        ▼
ExtractedReceiptData → Mobile UI
```

- **Port**: 4000
- **Stack**: Node.js + Express.js
- **AI Provider**: Google AI Studio — Gemini 2.0 Flash (free tier)
- **File uploads**: multipart/form-data, max 4 MB
- **API Key**: Nằm trong `.env`, không bao giờ lưu trong code

---

## Yêu Cầu

| Phần mềm | Phiên bản tối thiểu |
|---|---|
| Node.js | 18.x trở lên |
| npm | 9.x trở lên |
| Git | bất kỳ |

Kiểm tra:
```powershell
node --version
npm --version
```

---

## Cách Chạy (5 bước)

### Bước 1 — Di chuyển vào thư mục backend

```powershell
cd D:/projects/introSE/Project-introSE/src/backend
```

### Bước 2 — Cài đặt dependencies

```powershell
npm install
```

Chỉ chạy **lần đầu** hoặc khi `package.json` thay đổi.

### Bước 3 — Tạo file cấu hình `.env`

Tạo file `.env` trong thư mục `src/backend/` với nội dung:

```
GOOGLE_API_KEY=<paste-api-key-của-bạn-vào-đây>
GEMINI_MODEL=gemini-3.6-flash
GEMINI_KEY_COOLDOWN_MS=60000
PORT=4000
MAX_UPLOAD_BYTES=4194304
```

**Cách lấy API key Gemini** (miễn phí, không cần thẻ):

1. Mở trình duyệt → <https://aistudio.google.com/apikey>
2. Đăng nhập tài khoản Google
3. Bấm **"Create API key"**
4. Copy key (format: `AQ.Ab8...` hoặc `AIzaSy...`)
5. Paste vào `.env` như trên

**Lưu ý**: File `.env` chứa API key — **không commit lên Git**. File này đã được liệt kê trong `.gitignore`.

### Bước 4 — Chạy server

```powershell
node src/server.js
```

Nếu port 4000 đang bị chiếm, kill trước:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
node src/server.js
```

Khi chạy thành công, terminal hiển thị:

```
[smartspend-backend] listening on http://localhost:4000
  health   : GET  /health
  scanner  : POST /api/ai-scanner/analyze  (multipart/form-data)
```

**Giữ cửa sổ terminal mở** trong suốt quá trình sử dụng.

### Bước 5 — Test không cần mở app

Mở PowerShell mới, chạy từng lệnh sau:

```powershell
# Test 1: Server sống
curl.exe -s http://localhost:4000/health

# Test 2: API key được nhận
curl.exe -s http://localhost:4000/api/ai-scanner/health

# Test 3: Gửi ảnh hóa đơn (thay đường dẫn ảnh thật)
curl.exe -s -F "image=@D:/projects/introSE/Project-introSE/src/backend/uploads/test.jpg" http://localhost:4000/api/ai-scanner/analyze
```

**Kết quả mong đợi Test 3**:
```json
{
  "success": true,
  "data": {
    "amount": 130000,
    "storeName": "LONG KÝ - CƠM GÀ DA RẤT GIÒN",
    "date": "2026-07-26T05:44:00.000Z",
    "categoryId": "exp-cat-1",
    "categoryName": "Ăn uống",
    "type": "expense",
    "confidence": {
      "amount": 99,
      "storeName": 99,
      "date": 95,
      "category": 99,
      "type": 99
    }
  }
}
```

---

## Cấu Trúc Thư Mục

```
src/backend/
├── .env.example       # Template cấu hình (đã có sẵn)
├── .gitignore        # Bỏ qua .env và node_modules
├── package.json
└── src/
    ├── server.js              # Express app entry point
    ├── routes/
    │   └── aiScanner.routes.js
    ├── controllers/
    │   └── aiScanner.controller.js   # Entry handlers
    ├── services/
    │   ├── geminiClient.js           # Gemini API client
    │   ├── geminiKeyPool.js         # Key rotation + failover
    │   └── receiptParser.js         # Prompt + JSON parsing + category mapping
    └── middleware/
        ├── upload.js          # Multer: multipart handling, 4MB limit
        └── errorHandler.js    # Centralised JSON error responses
```

---

## API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Server alive check |
| GET | `/api/ai-scanner/health` | Key configured? Pool state? |
| GET | `/api/ai-scanner/categories` | List of expense/income categories |
| POST | `/api/ai-scanner/analyze` | Upload receipt image → extract data |

### POST /api/ai-scanner/analyze

**Request**: `multipart/form-data`
- `image` (file, bắt buộc): ảnh hóa đơn (jpg/png/webp, ≤4MB)

**Response thành công**:
```json
{
  "success": true,
  "data": {
    "amount": 118000,
    "storeName": "Gong Cha",
    "date": "2026-07-14T12:21:00.000Z",
    "categoryId": "exp-cat-1",
    "categoryName": "Ăn uống",
    "note": "Trà Sữa Okinawa (L), Trà Xanh Gong Cha (L)",
    "type": "expense",
    "confidence": { "amount": 98, "storeName": 98, "date": 95, "category": 98, "type": 99 }
  },
  "meta": {
    "model": "gemini-3.6-flash",
    "usage": { "promptTokenCount": 1536, "candidatesTokenCount": 155, "totalTokenCount": 2715 }
  }
}
```

**Response lỗi**:
```json
{ "success": false, "error": "Thiếu file ảnh..." }
```

---

## Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `EADDRINUSE: address already in use :::4000` | Server đã chạy ở port 4000 | Kill process trên port 4000 (xem Bước 4) |
| `"GOOGLE_API_KEY chưa được cấu hình"` | Chưa tạo `.env` hoặc key rỗng | Tạo `.env` với key hợp lệ |
| `"API key not valid"` | Key sai/đã bị thu hồi | Lấy key mới từ aistudio.google.com/apikey |
| `"Gemini trả về kết quả không đúng định dạng JSON"` | Gemini bị cắt output | Đã fix: tăng max_tokens lên 4096 |
| HTTP 413 | File upload > 4MB | Nén ảnh nhỏ hơn trước khi gửi |
| HTTP 400 | Không gửi field `image` | Đảm bảo gửi đúng field name |

---

## Quota & Giới Hạn

- **Free tier Gemini**: 15 requests/phút, 1500 requests/ngày
- **Image size**: tối đa 4MB mỗi ảnh
- **Key rotation**: nếu dùng nhiều key, server tự switch khi key nào bị quota

---

## Lưu Ý Bảo Mật

- **API key không bao giờ nằm trong code**. Key được đọc từ biến môi trường (`process.env`), không được commit lên Git.
- **File `.env` đã được `.gitignore` loại trừ** — kiểm tra bằng `git status` sẽ không thấy `.env` trong danh sách changes.
- Backend chỉ chấp nhận upload ảnh, không lưu ảnh vĩnh viễn trên server (chỉ xử lý tạm trong memory rồi trả kết quả).
