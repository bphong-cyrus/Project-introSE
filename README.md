# SmartSpend AI

SmartSpend AI is a personal finance management application made of a mobile app, a web admin dashboard, an AI scanner backend, and Supabase backend services. The project supports account authentication, transactions, categories, budgets, budget warnings, Gemini-powered receipt scanning, financial reports, and admin workflows for users, notifications, AI scan logs, and feedback.

Repository: <https://github.com/bphong-cyrus/Project-introSE>

## Team

| Name | Student ID | Role |
| --- | --- | --- |
| Ta Binh Phong | | PM |
| Nguyen Trinh Tuan Van | | Developer |
| Nguyen Tran Lan Vien | | Proposal & Design |
| Phan Van Ba Dat | | Tester & Data |

## Technology stack

| Area | Technology currently used in source |
| --- | --- |
| Mobile/Web app | Expo SDK 54, React Native 0.81.5, React 19.1 |
| Web admin | Expo web route `/admin`, React Native Web |
| Navigation/UI | React Navigation, Ionicons, React Native SVG |
| Auth/Database/Realtime/Storage | Supabase JS v2 |
| Local mobile auth storage | `@react-native-async-storage/async-storage` |
| Android OAuth browser session | `expo-web-browser`, custom scheme `smartspendai` |
| AI scanner backend | Node.js, Express, Multer |
| AI provider | Google AI Studio Gemini vision models |
| Report export backend | ExcelJS, PNG chart renderer |
| File sharing | `expo-file-system`, `expo-sharing` |

## Features currently implemented

### Account & Authentication

- Sign up with email and password.
- Sign in and sign out with Supabase Auth.
- Sign in with Google OAuth.
- Forgot password flow via email OTP.
- Change password while signed in.
- Profile setup and profile update.
- Block inactive accounts through `user_profiles.account_status`.

### Transactions

- Add, edit, and delete manual income/expense transactions.
- View transaction history.
- Filter transactions by date, category, type, and amount range.
- View transaction details.
- Validate date/time, amount, transaction name, and category before saving.

### Categories

- Manage income and expense categories.
- Support default categories and user-created categories.
- Add categories with icon and color.
- Validate blank, too-long, or duplicate category names.

### Budgets & Notifications

- Manage monthly budgets.
- Set expected monthly income and category-level expense limits.
- Display budget progress with radial gauge/progress UI.
- Warn when budget usage reaches 80% and when it reaches/exceeds 100%.
- In-app notification center.
- Soft-delete notifications through `deleted_at`.

### AI Receipt Scanner

- Pick receipt images from camera or photo library.
- Send images to the Express backend as `multipart/form-data`.
- Backend calls a Gemini vision model to extract receipt data.
- The scanner returns amount, store name, date, suggested category, transaction type, and confidence values.
- Users review, edit, and save the extracted data as a transaction.
- Scan logs are written for the Admin AI Logs page.

### Reports

- Financial reports screen in the mobile app.
- Analyze income, expenses, budgets, savings rate, weekly allocation, and category breakdowns.
- Export CSV directly from the client.
- Export Excel through the backend, with multiple sheets and PNG charts embedded in the workbook.
- Download/share reports on web or mobile devices.

### Admin Dashboard

The admin dashboard runs on the web route `/admin` and currently includes these pages:

- Overview (`/admin`)
- Users (`/admin/users`)
- Notifications (`/admin/notifications`)
- AI Logs (`/admin/ai-logs`)
- Feedback (`/admin/feedback`)

The admin dashboard supports:

- Admin sign-in with email/password or Google OAuth.
- Admin authorization through `user_profiles.is_admin` and `account_status = active`.
- Metrics, charts, and system warning cards.
- User account status management.
- Create, send, schedule, edit, cancel, and delete notification campaigns.
- View delivered notifications.
- View and relabel/review AI scan logs.
- Manage feedback status and responses.

## Repository structure

```text
Project-introSE/
├── README.md
├── .gitignore
├── docs/                         # Placeholder folders for course documents
├── pa/                           # Submitted documents by phase
│   ├── pa0/
│   ├── pa1/
│   ├── pa2/
│   ├── pa3/
│   └── pa4/
├── supabase/
│   └── functions/                # Supabase Edge Functions
│       ├── send-password-reset-otp/
│       ├── verify-password-reset-otp/
│       ├── reset-password-with-token/
│       └── forward-feedback-dev/
└── src/
    ├── App.tsx                   # Selects MobileApp or AdminApp based on web route
    ├── app.json                  # Expo config
    ├── package.json              # Expo app scripts/dependencies
    ├── .env.example              # Mobile/web env template
    ├── apps/
    │   ├── mobile/               # Mobile app shell, screens, navigation
    │   └── admin/                # Admin web dashboard
    ├── modules/
    │   ├── ai-scanner/           # AI receipt scanner UI/services
    │   ├── budgets/              # Budgets and budget warnings
    │   ├── categories/           # Categories
    │   ├── reports/              # Financial reports
    │   └── transactions/         # Transactions
    ├── state/                    # Auth/Category/Transaction/Notification contexts
    ├── shared/                   # Types, constants, utilities
    ├── data/
    │   ├── datasources/supabase/ # Supabase client + TypeScript schema types
    │   └── repositories/         # Repository layer
    └── backend/                  # Express backend for AI scanner/report export
```

`src/android/` may appear after running `npx expo run:android`. It is the native Android project generated by Expo prebuild.

## Environment requirements

| Component | Recommendation |
| --- | --- |
| Node.js | 18.x or newer |
| npm | 9.x or newer |
| Git | Any recent version |
| Expo CLI | Use through `npx expo ...` |
| Supabase project | Auth, Database, Realtime, Storage, Edge Functions |
| Gemini API key | Get one from <https://aistudio.google.com/apikey> |
| Supabase CLI | Required to deploy Edge Functions |
| Android Studio/JDK | Required only for Android development builds |

Quick checks:

```powershell
node --version
npm --version
git --version
```

If building an Android development build:

```powershell
java -version
adb version
echo $env:ANDROID_HOME
```

The Android project currently uses Expo SDK 54/RN 0.81, so JDK 17 is recommended for native Android builds.

## First-time installation

Clone the repository:

```powershell
git clone https://github.com/bphong-cyrus/Project-introSE.git
cd Project-introSE
```

Install Expo app dependencies:

```powershell
cd src
npm install
```

Install backend dependencies:

```powershell
cd backend
npm install
```

If starting from the repository root and installing both parts:

```powershell
cd src
npm install
cd backend
npm install
```

## Configuration

### 1. Mobile/Web app env

Create:

```text
src/.env
```

You can copy from:

```text
src/.env.example
```

Common value:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000
```

Suggested backend URLs:

| App runtime | Suggested value |
| --- | --- |
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |
| Web browser | `http://localhost:4000` |
| Physical device on the same Wi-Fi | `http://<your-computer-LAN-IP>:4000` |

After changing `.env`, restart Expo with cache clearing:

```powershell
npx expo start -c
```

Do not put Gemini API keys in `src/.env`. Gemini keys belong only in the backend.

### 2. Backend env

Create:

```text
src/backend/.env
```

You can copy from:

```text
src/backend/.env.example
```

Example configuration supported by the current backend:

```env
GEMINI_API_KEYS=PASTE-KEY-1,PASTE-KEY-2,PASTE-KEY-3,PASTE-KEY-4
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
AI_LOW_CONFIDENCE_RETRY=true
AI_LOW_CONFIDENCE_RETRY_THRESHOLD=80
AI_RETRY_TOTAL_BUDGET_MS=8000
GEMINI_KEY_COOLDOWN_MS=60000
GEMINI_REQUEST_TIMEOUT_MS=15000
PORT=4000
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://10.0.2.2:8081
MAX_UPLOAD_BYTES=4194304
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=PASTE-SUPABASE-ANON-KEY
REPORT_EXPORT_TYPE=excel
REPORT_EXPORT_STATUS=success
```

How to get a Gemini API key:

1. Open <https://aistudio.google.com/apikey>.
2. Sign in with a Google account.
3. Click **Create API key**.
4. Copy the key into `GEMINI_API_KEYS`, or use the legacy `GOOGLE_API_KEY` variable.

The backend supports:

- `GEMINI_API_KEYS` as a comma-separated list.
- `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`, ... if you prefer one key per variable.
- `GOOGLE_API_KEY` if using a single key.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are used by the Report & Export Controller. If they are omitted from `src/backend/.env`, the backend reads the same values from `src/data/datasources/supabase/supabase.ts`.

Do not commit `.env` files.

### 3. Supabase client config

The Supabase client is located at:

```text
src/data/datasources/supabase/supabase.ts
```

It creates the client with:

```ts
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
```

If using another Supabase project, update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in this file. The frontend uses only the anon key, not the service role key.

### 4. Supabase schema used by the app

In the current working tree, the schema used by the app is reflected by the `Database` type in:

```text
src/data/datasources/supabase/supabase.ts
```

Public tables referenced by the code:

- `categories`
- `transactions`
- `budgets`
- `budget_category_allocations`
- `receipts`
- `receipt_images`
- `receipt_line_items`
- `user_profiles`
- `ocr_results`
- `recommendation_runs`
- `scan_logs`
- `feedbacks`
- `audit_logs`
- `notifications`
- `notification_campaigns`
- `notification_campaign_targets`
- `user_notification_settings`
- `budget_warnings`
- `push_tokens`

RPC/functions referenced by the code:

- `get_admin_auth_users()`
- `admin_update_user_profile(...)`
- `admin_update_user_account_status(...)`
- `admin_create_notification_campaign(...)`
- `admin_cancel_notification_campaign(...)`
- `evaluate_user_budget_notifications()`
- `ensure_user_monthly_budget(year, month)`
- `refresh_user_budget_spending(year, month)`
- `delete_user_transaction(transaction_id)`

If setting up a new Supabase project, the database must provide the tables/RPC above with suitable RLS policies. In the current source tree, there is no SQL migration file for those tables besides the Edge Functions under `supabase/functions`.

### 5. Supabase Edge Functions

Current Edge Functions:

| Function | Purpose |
| --- | --- |
| `send-password-reset-otp` | Sends a password reset OTP by email |
| `verify-password-reset-otp` | Verifies the OTP and returns a verification token |
| `reset-password-with-token` | Sets the new password using the verification token |
| `forward-feedback-dev` | Forwards feedback to developers by email |

Environment variables used by the Edge Function code:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `JWT_SECRET` or `SUPABASE_JWT_SECRET`

Deploy Edge Functions with Supabase CLI from the repository root:

```powershell
supabase functions deploy send-password-reset-otp
supabase functions deploy verify-password-reset-otp
supabase functions deploy reset-password-with-token
supabase functions deploy forward-feedback-dev
```

If the project is not linked with Supabase CLI yet, link it first using your Supabase CLI workflow.

### 6. Google OAuth

Mobile Google login uses:

- Expo scheme: `smartspendai`
- Native redirect URL: `smartspendai://login-callback`
- `expo-web-browser` to open the auth session on Android/iOS
- `exchangeCodeForSession(...)` or `setSession(...)` to complete the Supabase session

Required configuration:

1. Configure the Google provider in Supabase Auth for your Supabase project.
2. In the Google Cloud OAuth client, add the Supabase callback as an Authorized redirect URI:

   ```text
   https://<your-project>.supabase.co/auth/v1/callback
   ```

3. In Supabase Auth Redirect URLs, add:

   ```text
   smartspendai://login-callback
   ```

4. For web admin/mobile web, the redirect uses the current web origin.

Current Expo config in `src/app.json`:

```json
{
  "scheme": "smartspendai",
  "android": { "package": "com.smartspendai.app" },
  "ios": { "bundleIdentifier": "com.smartspendai.app" },
  "newArchEnabled": false
}
```

## Running the system

### 1. Run the AI scanner/report export backend

Terminal 1:

```powershell
cd src/backend
npm start
```

Or dev mode:

```powershell
npm run dev
```

The backend defaults to:

```text
http://localhost:4000
```

Health checks:

```powershell
curl.exe -s http://localhost:4000/health
curl.exe -s http://localhost:4000/api/ai-scanner/health
curl.exe -s http://localhost:4000/api/reports/health
```

### 2. Run the Expo mobile app

Terminal 2:

```powershell
cd src
npx expo start -c
```

In the Expo CLI:

- Press `a` to open the Android emulator if Android SDK is configured.
- Scan the QR code with Expo Go when using a physical device on the same network.
- Use `npm run web` if you want to run the web target.

Scripts currently available in `src/package.json`:

```powershell
npm start        # expo start
npm run android  # expo run:android
npm run ios      # expo run:ios
npm run web      # expo start --web
```

### 3. Run an Android development build

Use this when testing native behavior such as custom scheme Google OAuth:

```powershell
cd src
npx expo run:android
```

Requirements:

- Android Studio/Android SDK installed.
- `ANDROID_HOME` points to the Android SDK.
- `platform-tools` is on PATH so `adb` is available.
- JDK 17 is active in the terminal running the build.
- An Android device with USB debugging enabled, or an emulator is running.

If you change native config in `app.json` or add a native dependency, run the development build again.

### 4. Run web/mobile web

```powershell
cd src
npm run web
```

Routes that do not start with `/admin` render the mobile app shell.

### 5. Run the Admin dashboard

The Admin dashboard uses the same Expo web app. `src/App.tsx` selects `AdminApp` when the URL starts with `/admin`.

Start web:

```powershell
cd src
npm run web
```

Open:

```text
http://localhost:8081/admin
http://localhost:8081/admin/users
http://localhost:8081/admin/notifications
http://localhost:8081/admin/ai-logs
http://localhost:8081/admin/feedback
```

Admin access requirements:

- The user is signed in with Supabase Auth.
- The user has a record in `user_profiles`.
- `user_profiles.is_admin = true`.
- `user_profiles.account_status = active`.
- RPC `get_admin_auth_users()` and the related admin RPCs exist in the database.

## AI Receipt Scanner (UC13)

This section follows the existing root README content, `src/modules/ai-scanner/README.md`, and `src/backend/README.md`.

### Processing flow

```text
expo-image-picker (camera/gallery)
      │ base64 + mediaType + uri
      ▼
AIScannerScreen.tsx
      │ multipart/form-data POST
      ▼
Express backend
src/backend/src/routes/aiScanner.routes.js
      │ Gemini generateContent API call
      ▼
Gemini vision model
      │ JSON structured response
      ▼
ExtractedReceiptData
      │
      ▼
AIResultScreen.tsx (review, edit, save)
```

The Gemini client is not bundled into the mobile app. The Gemini API key is read only by the backend process from `src/backend/.env`.

### Main files

| File | Purpose |
| --- | --- |
| `src/modules/ai-scanner/screens/AIScannerScreen.tsx` | Pick/capture image, run analysis, write scan logs |
| `src/modules/ai-scanner/screens/AIResultScreen.tsx` | Review, edit, and save transaction after scan |
| `src/modules/ai-scanner/services/imageHelper.ts` | Image picker handling and adaptive compression |
| `src/modules/ai-scanner/services/backendClient.ts` | HTTP client for the Express backend |
| `src/modules/ai-scanner/services/receiptAnalyzer.ts` | Facade for receipt analysis flow |
| `src/modules/ai-scanner/services/aiConfig.ts` | Backend URL and timeout config |
| `src/backend/src/routes/aiScanner.routes.js` | Backend routes for AI scanner |
| `src/backend/src/controllers/aiScanner.controller.js` | Request/response controller |
| `src/backend/src/services/geminiClient.js` | Gemini API client |
| `src/backend/src/services/geminiKeyPool.js` | Key rotation/failover |
| `src/backend/src/services/receiptParser.js` | Prompt, JSON parsing, category/type/confidence mapping |
| `src/backend/src/middleware/upload.js` | Multer upload handling and file size limit |

### Adaptive image compression

The client compresses images based on size to optimize OCR processing speed. If an image does not need resizing and JPEG re-encoding would increase the payload, the client keeps the original file.

| Size category | Image dimensions | Compression quality | Purpose |
| --- | --- | --- | --- |
| Tiny | ≤ 400px | 90% | Preserve small-text detail |
| Small | ≤ 800px | 80% | Balance detail and payload |
| Large | ≤ 1600px | 72% | OCR-ready compression |
| XLarge | > 1600px | 65%, resize to 1600px | Bound upload size and memory |

### Performance tracking

- Frontend shows the selected image file size.
- Backend logs processing time per request and image size category.
- `scan_logs.processing_time_ms` is used for analytics in Admin AI Logs.
- The code tracks the SAD target of OCR + auto-categorization within 8 seconds.
- Gemini requests are aborted after 15 seconds so the UI can recover.
- The mobile scanner HTTP timeout is 20 seconds.

When the Lite pass has `overallConfidence` below 80, the backend retries once with `gemini-3.5-flash` inside the same 8-second budget. If the fallback times out or fails, the backend keeps the first-pass result.

### Backend AI scanner endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/ai-scanner/health` | Readiness/model/key pool check |
| GET | `/api/ai-scanner/categories` | Static categories for the AI result dropdown |
| POST | `/api/ai-scanner/analyze` | Upload a receipt image and receive extracted data |

Test the backend without opening the app:

```powershell
curl.exe -s http://localhost:4000/health
curl.exe -s http://localhost:4000/api/ai-scanner/health
curl.exe -s -F "image=@D:\path\to\receipt.jpg" http://localhost:4000/api/ai-scanner/analyze
```

`POST /api/ai-scanner/analyze` uses `multipart/form-data` with the required field:

```text
image=<receipt image file>
```

Default upload limit from `.env`:

```text
MAX_UPLOAD_BYTES=4194304
```

### Scanner response data

`analyzeReceipt()` returns `ExtractedReceiptData` for the mobile UI:

| Field | Description |
| --- | --- |
| `amount` | Non-negative integer amount in VND |
| `signedAmount` | Signed amount, negative for expense and positive for income |
| `date` | Receipt date/time |
| `storeName` | Store name/transaction source |
| `categoryId` | Category id mapped to a local category |
| `categoryName` | AI-suggested category name |
| `note` | Short note extracted from the receipt |
| `type` | `expense` or `income` |
| `confidence` | 0-100 confidence for amount/storeName/date/category/type |
| `overallConfidence` | Lowest confidence score among required fields |
| `needsManualReview` | `true` when fields are missing or confidence is below threshold |
| `missingFields` | Missing extracted fields |
| `imageUri` | Local image picker URI, saved with the transaction when available |

Successful backend response shape:

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
    "confidence": {
      "amount": 98,
      "storeName": 98,
      "date": 95,
      "category": 98,
      "type": 99
    }
  }
}
```

### Common AI scanner errors

| Cause | UI feedback |
| --- | --- |
| Backend unreachable | Alert `Không thể phân tích hóa đơn` |
| Backend returned non-2xx | Alert `Lỗi AI Scanner`, using the backend `error` message |
| Network failure mid-upload | Alert `Không thể phân tích hóa đơn` |
| File too large | Backend returns 413, UI displays the error |
| Missing `image` field | Backend returns 400 |

Successful and failed scans are written to `scan_logs` by the signed-in mobile client, including confidence, processing time, image URL, extracted fields, and error detail.

## Backend API

Backend entry point:

```text
src/backend/src/server.js
```

Current routes:

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | No | Server alive check |
| GET | `/api/ai-scanner/health` | No | AI scanner readiness |
| GET | `/api/ai-scanner/categories` | No | Static scanner categories |
| POST | `/api/ai-scanner/analyze` | No | Upload receipt image for analysis |
| GET | `/api/reports/health` | No | Report export readiness |
| POST | `/api/reports/export` | Supabase Bearer token | Create a monthly Excel report |
| GET | `/api/reports/exports/:exportId/download` | Supabase Bearer token | Download a generated Excel report |

### Report export API

`POST /api/reports/export`

Headers:

```text
Authorization: Bearer <Supabase access token>
Content-Type: application/json
```

Body:

```json
{ "month": 8, "year": 2026 }
```

Successful response:

```json
{
  "success": true,
  "data": {
    "exportId": "uuid",
    "fileName": "SmartSpendAI-user-2026-08.xlsx",
    "downloadUrl": "/api/reports/exports/uuid/download",
    "summary": {
      "month": 8,
      "year": 2026,
      "transactionCount": 12,
      "incomeTransactionCount": 2,
      "totalIncome": 15000000,
      "totalExpense": 4300000,
      "totalBudget": 7000000,
      "generatedAt": "2026-08-13T00:00:00.000Z"
    }
  }
}
```

The Excel workbook is built in `src/backend/src/services/reportExportService.js` and includes these sheets:

- `Tổng quan`
- `Tổng hợp tài chính tháng`
- `Phân bổ chi tuần`
- `Tỷ trọng danh mục`
- `So sánh nhiều tháng`
- `Tuân thủ ngân sách`
- `Giao dịch trong tháng`
- `Thu nhập trong tháng`
- `Toàn bộ transactions`
- `Hạn mức ngân sách`
- `Biểu đồ`

Excel files are saved under:

```text
src/backend/generated-reports/
```

## Main data flows

### Auth/Profile

```text
Supabase Auth user
      │ user.id
      ▼
public.user_profiles.user_id
```

`user_profiles` stores profile information, admin permission, and account status. Email is stored on the Supabase Auth user, not in the current `user_profiles` type.

### Transactions/Categories

```text
transactions
  └─ category_id → categories
```

A transaction has `type = income | expense`, `amount`, `transaction_date`, `payment_method`, `source`, `note`, and transaction name.

### Budgets

```text
budgets
  └─ budget_category_allocations
      └─ category_id → categories
```

Related RPC:

```text
ensure_user_monthly_budget(year, month)
refresh_user_budget_spending(year, month)
evaluate_user_budget_notifications()
delete_user_transaction(transaction_id)
```

### Notifications

```text
notification_campaigns
  └─ notification_campaign_targets
      └─ notifications

budget_warnings
  └─ notifications(type = 'budget_warning')
```

The user Notification Center reads notifications by `user_id`, ignores records with `deleted_at`, and displays notifications whose `created_at` has arrived.

### AI scan logs

```text
receipt image / backend result / error detail
      ▼
scan_logs
      ▼
Admin AI Logs page
```

Admins can view log details, confidence, extracted fields, matched transaction/receipt data, and relabel categories when needed.

## Checks and validation

TypeScript check for the Expo app:

```powershell
cd src
npm exec tsc -- --noEmit
```

Expo dependency check:

```powershell
cd src
npx expo install --check
```

Expo config check:

```powershell
cd src
npx expo config --type public
```

Whitespace check in Git diff:

```powershell
git diff --check
```

The backend has no dedicated test script in `src/backend/package.json`; use the health endpoints after starting the server for a quick check.

## Troubleshooting

| Error | Common cause | Fix |
| --- | --- | --- |
| `Failed to fetch` when scanning a receipt | Backend is not running or backend URL is wrong | Start the backend and check `EXPO_PUBLIC_API_BASE_URL` |
| `EADDRINUSE: address already in use :::4000` | Another process is using port 4000 | Stop that process or change `PORT` in `src/backend/.env` |
| `GOOGLE_API_KEY chưa được cấu hình` or invalid API key | Missing/wrong Gemini key in backend env | Update `GEMINI_API_KEYS` or `GOOGLE_API_KEY` |
| HTTP 413 when scanning | Image exceeds `MAX_UPLOAD_BYTES` | Compress/select a smaller image |
| HTTP 400 when scanning | Request is missing field `image` | Send the multipart field `image` |
| Report export cannot connect | Backend is not running or Supabase token is missing | Start the backend and sign in again |
| Forgot password OTP cannot be sent | Edge Function/Resend env not deployed/configured | Deploy functions and check `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Non-existing email still goes to OTP screen | Old Edge Function is still deployed | Deploy `send-password-reset-otp` again |
| Google login on Android does not return to app | Supabase redirect URL is missing | Add `smartspendai://login-callback` |
| Cannot access admin | User is not admin or account is inactive | Check `user_profiles.is_admin` and `account_status` |
| Admin cannot load auth users | Admin RPC is missing in database | Create/grant RPC `get_admin_auth_users()` according to the schema used by the app |
| `JAVA_HOME is not set` during Android build | Terminal cannot find JDK | Install JDK 17 and set `JAVA_HOME` |
| `No Android connected device found` | No emulator/device is available | Start an emulator or enable USB debugging on a physical device |

## Security notes

- Do not commit `.env`, Gemini API keys, Resend API keys, or Supabase service role keys.
- Mobile/web uses only the Supabase anon key.
- Supabase service role key is used only in Edge Functions or trusted server environments.
- Gemini API keys belong only in `src/backend/.env`, not in the mobile bundle.
- Supabase RLS policies are the main user data protection layer.
- Report export endpoints require a Supabase Bearer token.
- The AI scanner endpoint processes image uploads in the backend and does not permanently store images in the backend process according to the existing backend README; scan logs/image URLs are written by the mobile client to Supabase when a user session exists.

## Project documents

- Backend AI Scanner: [`src/backend/README.md`](src/backend/README.md)
- AI Scanner module: [`src/modules/ai-scanner/README.md`](src/modules/ai-scanner/README.md)
- PA4 overview text: [`pa/pa4/SmartSpend AI v1.0.txt`](pa/pa4/SmartSpend%20AI%20v1.0.txt)
- PA4 documents: `pa/pa4/`
- Earlier phase documents: `pa/pa0/`, `pa/pa1/`, `pa/pa2/`, `pa/pa3/`