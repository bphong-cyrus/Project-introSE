# SmartSpend AI
Ứng dụng quản lý chi tiêu tự động qua hóa đơn

## Nhóm
| Tên | MSSV | Vai trò |
|-----|------|---------|
| Tạ Bỉnh Phong | | PM |
| Nguyễn Trịnh Tuấn Văn | | Developer |
| Nguyễn Trần Lan Viên | | Proposal & Design |
| Phan Văn Bá Đạt | | Tester & Data |

## Công cụ
- Jira: https://binhphongta993.atlassian.net/jira/software/projects/SCRUM/boards/1
- Môn học: Introduction to Software Engineering - 24C07

## AI Receipt Scanner (UC13)

The scanner previously used a mock. It is now wired to the **Google AI
Studio Gemini API** (vision-capable, has a generous free tier) via an
Express.js business-layer service (per SAD §4.2.6 — AI Scanner
Controller).

```
┌────────────────────────┐       multipart/form-data        ┌────────────────────────┐
│  Mobile (Expo, RN)     │ ──────────────────────────────► │  Express Business Layer│
│  src/modules/ai-scanner│                                 │  src/backend/src/...   │
│  Presentation tier     │ ◄────────────────────────────── │  AI Scanner Controller │
│  (SAD §4.1.6)          │   { success, data: Extracted    │  (SAD §4.2.6)          │
└────────────────────────┘     ReceiptData }               └────────────┬───────────┘
                                                                       │ HTTPS
                                                                       ▼
                                                          ┌────────────────────────┐
                                                          │ Google AI Studio       │
                                                          │ (Gemini 2.0 Flash)     │
                                                          └────────────────────────┘
```

### Run it

1. **Lấy Gemini API key miễn phí** tại <https://aistudio.google.com/apikey>
   (không cần thẻ tín dụng, quota miễn phí 15 RPM / 1500 RPD, bao gồm cả vision).

2. **Backend** (Express.js business layer — nằm trong `src/` theo
   folder spec):
   ```bash
   cd src/backend
   cp .env.example .env                  # paste GOOGLE_API_KEY vừa lấy
   npm install
   npm start                              # listens on http://localhost:4000
   ```

3. **Mobile app** (Expo presentation tier):
   ```bash
   cd src
   npx expo start -c                      # `-c` clears the Metro cache
   ```

   Optional `src/.env` (tạo cạnh `src/package.json`):
   ```
   EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-ip>:4000   # cho thiết bị thật
   ```
   Mặc định `http://10.0.2.2:4000` đã chạy được từ Android emulator.

4. **Smoke test API** không cần mở app:
   ```bash
   curl http://localhost:4000/health
   curl http://localhost:4000/api/ai-scanner/health
   curl -F "image=@some-receipt.jpg" http://localhost:4000/api/ai-scanner/analyze
   ```

### Repo layout (relevant slice)

```
Project-introSE/
├── docs/                          ← project documents (management / requirements /
│                                    analysis and design / test)
├── pa/                            ← weekly PA submissions (pa0 / pa1 / pa2 / pa3)
└── src/                           ← all source code (mobile + backend)
    ├── App.tsx, app.json, package.json     ← Expo entry
    ├── apps/{mobile,admin}/...
    ├── modules/
    │   ├── ai-scanner/                     ← real implementation, replaces the mock
    │   │   ├── README.md
    │   │   ├── screens/{AIScannerScreen,AIResultScreen}.tsx
    │   │   ├── components/{CameraViewfinder,ProcessingOverlay,…}.tsx
    │   │   └── services/{aiConfig,backendClient,receiptAnalyzer,imageHelper}.ts
    │   ├── transactions/
    │   ├── budgets/
    │   └── categories/
    ├── state/{Transaction,Category}Context.tsx
    ├── shared/{types,constants,utils}/...
    └── backend/                            ← Express Business Layer (SAD §4.2.6)
        ├── .env.example
        ├── package.json
        └── src/
            ├── server.js
            ├── routes/aiScanner.routes.js
            ├── controllers/aiScanner.controller.js
            ├── services/geminiClient.js
            ├── services/receiptParser.js
            └── middleware/{upload,errorHandler}.js
```

### What changed (compared to the previous mock)

| Before                                  | After                                                   |
| --------------------------------------- | ------------------------------------------------------- |
| `Math.random()` fake amounts            | Real Gemini vision extraction (amount/date/merchant/line items/category with per-field confidence) |
| Hard-coded "Cửa hàng" store name        | Real OCR of merchant name                                |
| Random category from `exp-cat-1`        | Mapped `suggested_category` from Gemini → local `Category.id` with `categoryName` shown alongside |
| Async-alert confirmation from "no image" or "success" branch | Real `expo-image-picker` capture + gallery; canvas → multipart upload → backend → JSON |
| Skill-level tip "chưa cài expo-image-picker" | `expo-image-picker@17` đã cài, permissions requested at runtime |

See [`src/modules/ai-scanner/README.md`](src/modules/ai-scanner/README.md) for module-level details
and [`src/backend/`](src/backend/) for the Express side.