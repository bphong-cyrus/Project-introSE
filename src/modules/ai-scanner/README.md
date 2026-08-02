# AI Scanner Module (UC13)

This module replaces the previous mock receipt scanner with a real
implementation. The flow now goes:

```
  expo-image-picker (camera/gallery)
        │ base64 + mediaType + uri
        ▼
  AIScannerScreen.tsx          (Presentation - SAD §4.1.6)
        │ multipart/form-data POST
        ▼
  Express backend              (Business     - SAD §4.2.6)
  src/backend/src/routes/aiScanner.routes.js
        │ Gemini generateContent API call
        ▼
  Gemini vision model
        │ JSON
        ▼
  ExtractedReceiptData  ──► AIResultScreen.tsx (review, edit, save)
```

## Files

| File | Layer (SAD §) | Purpose |
| --- | --- | --- |
| `screens/AIScannerScreen.tsx` | Presentation §4.1.6 | Capture, dispatches API call |
| `screens/AIResultScreen.tsx`   | Presentation §4.1.6 | Review + manual correction + save |
| `components/CameraViewfinder.tsx` | Presentation | Viewfinder + corner guides |
| `components/ProcessingOverlay.tsx` | Presentation | "AI đang xử lý..." overlay |
| `components/ReceiptPreview.tsx`    | Presentation | Thumbnail + confidence bar |
| `components/CategoryDropdown.tsx`  | Presentation | Category picker reused from Manual Add |
| `components/SuccessBanner.tsx`     | Presentation | "OCR confident" badge |
| `services/imageHelper.ts`         | Business §4.2.6 | expo-image-picker → base64 + mime |
| `services/backendClient.ts`       | Business §4.2.6 | HTTP client for our Express backend |
| `services/receiptAnalyzer.ts`     | Business §4.2.6 | Façade: maps mobile types → backend call |
| `services/aiConfig.ts`            | Business §4.2.6 | Backend URL config |

The Gemini client is **not** in this folder — it lives on the server.
The Gemini API key is only ever read inside the `backend/` process
(see `backend/.env.example`).

## Configuration

Set `EXPO_PUBLIC_API_BASE_URL` in `src/.env` if the backend is not on
the default host.

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4000
```

Default: `http://10.0.2.2:4000` (Android emulator → host machine).

## Setup

1. Install deps (already done in this repo):
   ```
   cd src && npm install
   ```
2. Get a free Gemini API key at https://aistudio.google.com/apikey
3. Start the backend (see repo-level README).
4. Start Expo with cache clear so the env var picks up:
   ```
   npx expo start -c
   ```

## Common errors & UI feedback

| Cause | Alert title | Description |
| --- | --- | --- |
| Backend unreachable | "Không thể phân tích hóa đơn" | `BackendApiError.status === 0` |
| Backend returned non-2xx | "Lỗi AI Scanner" | message from backend's `error` field |
| Network failure mid-upload | "Không thể phân tích hóa đơn" | fetch timeout / abort |
| File too big (>4 MB) | "Lỗi AI Scanner" | multer `LIMIT_FILE_SIZE` mapped to 413 by backend |

All errors surface via `Alert.alert(...)` in `AIScannerScreen.runAnalysis`
and the user can retry without losing context.

## What's in the response

`analyzeReceipt()` returns `ExtractedReceiptData`:

| Field | Description |
| --- | --- |
| `amount` | Tổng tiền VND (integer) |
| `date` | Ngày giờ trên hóa đơn (Date) |
| `storeName` | Tên cửa hàng |
| `categoryId` | Mapped to local `Category.id` |
| `categoryName` | Tên danh mục AI đề xuất |
| `note` | Ghi chú ngắn (≤120 ký tự) |
| `type` | `expense` \| `income` |
| `confidence` | 0-100 cho từng trường (amount/date/storeName/category/type) |
| `imageUri` | local URI from expo-image-picker (saved as `Transaction.imageUrl`) |

## Limitations & future work

- No authentication on the backend yet. Add JWT middleware + user scoping
  before exposing publicly.
- No scan-log persistence (per UCS §2.13 step 7). When the Supabase
  tables (`receipts`, `receipt_images`, `ocr_results`, `expenses`) ship,
  add a repository module and call it from the controller after a
  successful save.
- The mobile side cannot detect "blurry / too dark" images. Add a quick
  pre-check in `backend/src/services/receiptParser.js` to reject them
  before they hit Gemini (saves tokens).