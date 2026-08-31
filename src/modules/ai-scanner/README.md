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

## Performance Optimization

The module includes comprehensive performance tracking and optimization:

### Adaptive Image Compression
Images are automatically compressed based on their size for optimal AI processing speed:

For images that do not need resizing, the client keeps the original file when
JPEG re-encoding would make the payload larger. Compression never increases an
upload unnecessarily.

| Size Category | Image Dimensions | Compression Quality | Purpose |
|--------------|------------------|---------------------|---------|
| Tiny | ≤ 400px | 90% | Preserve small-text detail |
| Small | ≤ 800px | 80% | Balance detail and payload |
| Large | ≤ 1600px | 72% | OCR-ready compression |
| XLarge | > 1600px | 65%, resize to 1600px | Bound upload size and memory |

### Performance Tracking
- **Frontend**: Shows the selected image file size; processing time remains an Admin/telemetry concern
- **Backend**: Logs processing time per request with image size categorization
- **Scan Logs**: Records `processing_time_ms` for analytics in Admin dashboard

### Performance Target (Backend)

All image-size categories share the SAD target of **≤8 seconds** for the
complete OCR and auto-categorization pipeline. Size categories are telemetry
labels only; they do not relax that target. Requests over 8 seconds are logged
as slow, and Gemini is aborted after 15 seconds so the UI can recover.

When the Lite pass has overall confidence below 80%, the backend retries once
with `gemini-3.5-flash` inside the same 8-second budget. Agreed fields receive a
conservative consensus score; disagreements remain capped at 60% and force
manual review. A timeout/error in the fallback never discards the first result.

## Files

| File | Layer (SAD §) | Purpose |
| --- | --- | --- |
| `screens/AIScannerScreen.tsx` | Presentation §4.1.6 | Capture, dispatches API call, tracks performance |
| `screens/AIResultScreen.tsx`   | Presentation §4.1.6 | Review + manual correction + save |
| `components/CameraViewfinder.tsx` | Presentation | Viewfinder + corner guides |
| `components/ProcessingOverlay.tsx` | Presentation | Loading overlay with performance stats |
| `components/ReceiptPreview.tsx`    | Presentation | Thumbnail + confidence bar |
| `components/CategoryDropdown.tsx`  | Presentation | Category picker reused from Manual Add |
| `components/SuccessBanner.tsx`     | Presentation | "OCR confident" badge |
| `services/imageHelper.ts`         | Business §4.2.6 | expo-image-picker → base64 + adaptive compression |
| `services/backendClient.ts`       | Business §4.2.6 | HTTP client with performance metadata |
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
and the user can retry without losing context. Successful and failed scans
are also written to `scan_logs` for the Admin AI Logs page (UC17), including
confidence, processing time, image URL, extracted fields and error detail.

## What's in the response

`analyzeReceipt()` returns `ExtractedReceiptData`:

| Field | Description |
| --- | --- |
| `amount` | Tổng tiền VND (integer) |
| `signedAmount` | Số tiền OCR có dấu: âm = chi tiêu, dương = thu nhập |
| `date` | Ngày giờ trên hóa đơn (Date) |
| `storeName` | Tên cửa hàng |
| `categoryId` | Mapped to local `Category.id` |
| `categoryName` | Tên danh mục AI đề xuất |
| `note` | Ghi chú ngắn (≤120 ký tự) |
| `type` | `expense` \| `income` |
| `confidence` | 0-100 cho từng trường (amount/date/storeName/category/type) |
| `overallConfidence` | Điểm thấp nhất của các trường bắt buộc |
| `needsManualReview` | `true` khi thiếu trường hoặc confidence dưới ngưỡng; UI yêu cầu người dùng kiểm tra/điền |
| `missingFields` | Các trường OCR không trích xuất được |
| `imageUri` | local URI from expo-image-picker (saved as `Transaction.imageUrl`) |

## Limitations & future work

- No authentication on the backend yet. Add JWT middleware + user scoping
  before exposing publicly.
- Scan logs are persisted by the authenticated mobile client after the
  backend returns or fails. Run
  `src/data/datasources/supabase/ai_scan_logs_uc17.sql` before testing on a
  fresh Supabase project so the required columns, storage bucket, grants and
  RLS policies exist.
- The mobile side cannot detect "blurry / too dark" images. Add a quick
  pre-check in `backend/src/services/receiptParser.js` to reject them
  before they hit Gemini (saves tokens).
