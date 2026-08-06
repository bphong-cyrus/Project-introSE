# SmartSpend AI

SmartSpend AI là hệ thống quản lý chi tiêu cá nhân, hỗ trợ nhập giao dịch thủ công, quét hóa đơn bằng AI, quản lý danh mục/ngân sách, cảnh báo vượt ngân sách và dashboard quản trị người dùng/thông báo.

## Nhóm thực hiện

| Tên | MSSV | Vai trò |
| --- | --- | --- |
| Tạ Bỉnh Phong | | PM |
| Nguyễn Trịnh Tuấn Văn | | Developer |
| Nguyễn Trần Lan Viên | | Proposal & Design |
| Phan Văn Bá Đạt | | Tester & Data |

## Công cụ và bối cảnh

- Môn học: Introduction to Software Engineering - 24C07
- Jira: <https://binhphongta993.atlassian.net/jira/software/projects/SCRUM/boards/1>
- Mobile/Web app: Expo + React Native
- Backend AI scanner: Node.js + Express
- Database/Auth/Realtimes: Supabase
- AI OCR provider: Google AI Studio Gemini

## Tính năng chính

- Đăng ký, đăng nhập, cập nhật hồ sơ người dùng.
- Quản lý giao dịch thu/chi.
- Quản lý danh mục mặc định và danh mục tự tạo.
- Quản lý ngân sách theo tháng và theo danh mục.
- Cảnh báo ngân sách 80%/100% bằng notification trong app.
- Quét hóa đơn bằng AI, trích xuất số tiền, cửa hàng, ngày, danh mục gợi ý.
- Notification center cho người dùng.
- Admin dashboard:
  - xem metrics/người dùng,
  - cập nhật trạng thái tài khoản,
  - tạo/gửi/lên lịch/xóa thông báo,
  - xem notification đã gửi.

## Kiến trúc tổng quan

### Run it

1. **Lấy Gemini API key miễn phí** tại <https://aistudio.google.com/apikey>
   (không cần thẻ tín dụng, quota miễn phí 15 RPM / 1500 RPD, bao gồm cả vision).

2. **Backend** (Express.js business layer — nằm trong `src/` theo
   folder spec):
   ```bash
   cd src/backend
   cp .env.example .env                  # paste GEMINI_API_KEYS (4 keys, comma-separated)
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
├── README.md
├── docs/                         Tài liệu môn học, requirement, design, test
├── pa/                           Bài nộp theo giai đoạn
└── src/
    ├── App.tsx                   Entry, tự chọn MobileApp hoặc AdminApp theo route web
    ├── app.json                  Expo config
    ├── package.json              Scripts/dependencies cho Expo app
    ├── apps/
    │   ├── mobile/               Mobile app screens
    │   └── admin/                Admin web dashboard
    ├── modules/
    │   ├── ai-scanner/           Quét hóa đơn AI
    │   ├── budgets/              Ngân sách/cảnh báo
    │   ├── categories/           Danh mục
    │   └── transactions/         Giao dịch
    ├── state/                    React contexts
    ├── shared/                   Types/constants/utils
    ├── data/
    │   ├── repositories/         Repository layer
    │   └── datasources/supabase/ SQL + Supabase client
    └── backend/                  Express backend cho AI scanner
```

## Yêu cầu môi trường

| Thành phần | Khuyến nghị |
| --- | --- |
| Node.js | 18.x trở lên |
| npm | 9.x trở lên |
| Git | bất kỳ bản mới |
| Expo CLI | dùng qua `npx expo ...` |
| Supabase project | đã bật Auth, Database, Realtime |
| Gemini API key | lấy tại <https://aistudio.google.com/apikey> |

Kiểm tra nhanh:

```powershell
node --version
npm --version
git --version
```

## Cài đặt lần đầu

Clone repository:

```powershell
git clone <repo-url>
cd Project-introSE
```

Cài dependencies cho Expo app:

```powershell
cd src
npm install
```

Cài dependencies cho backend AI scanner:

```powershell
cd backend
npm install
```

Nếu đang ở root repo và muốn chạy đầy đủ từ đầu:

```powershell
cd src
npm install
cd backend
npm install
```

## Cấu hình môi trường

### 1. Mobile/Web app env

Tạo file:

```text
src/.env
```

Có thể copy từ:

```text
src/.env.example
```

Nội dung thường dùng:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000
```

Gợi ý URL backend:

| Môi trường chạy app | Giá trị gợi ý |
| --- | --- |
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |
| Web browser | `http://localhost:4000` |
| Thiết bị thật cùng Wi-Fi | `http://<LAN-IP-của-máy-tính>:4000` |

Sau khi đổi `.env`, restart Expo với cache clear:

```powershell
npx expo start -c
```

### 2. Backend AI scanner env

Tạo file:

```text
src/backend/.env
```

Copy từ:

```text
src/backend/.env.example
```

Ví dụ:

```env
GEMINI_API_KEYS=PASTE-KEY-1,PASTE-KEY-2
GEMINI_MODEL=gemini-2.0-flash
GEMINI_KEY_COOLDOWN_MS=60000
PORT=4000
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://10.0.2.2:8081
MAX_UPLOAD_BYTES=4194304
```

Có thể dùng một key legacy:

```env
GOOGLE_API_KEY=PASTE-KEY-1
```

Không commit `.env` lên Git.

### 3. Supabase config

Supabase client hiện nằm tại:

```text
src/data/datasources/supabase/supabase.ts
```

File này chứa:

```ts
const SUPABASE_URL = '...';
const SUPABASE_ANON_KEY = '...';
```

Nếu dùng Supabase project khác, đổi URL và anon key tại đây. Anon key có thể xuất hiện ở frontend, nhưng RLS policies bắt buộc phải đúng để bảo vệ dữ liệu.

## Cấu hình database Supabase

Các SQL quan trọng nằm ở:

```text
src/data/datasources/supabase/
```

### Bản SQL hợp nhất khuyến nghị

File mới đầy đủ cho nhóm notification, budget warning và các bảng liên quan:

```text
src/data/datasources/supabase/notification_subsystem_full.sql
```

File này bao gồm:

- tables/relations liên quan đến users, categories, transactions, budgets, allocations, notifications, campaigns, settings, push tokens, budget warnings, audit logs;
- constraints/indexes;
- seed default categories;
- grants;
- RLS policies;
- RPC/functions cho admin notification, budget warning và transaction delete.

Cách chạy:

1. Tắt app/dev server hoặc đóng các tab app đang mở để tránh lock database.
2. Vào Supabase Dashboard → SQL Editor.
3. Chạy toàn bộ `notification_subsystem_full.sql`.
4. Nếu gặp `lock_timeout`, đợi vài giây rồi chạy lại file.

### Admin user management SQL

Chạy thêm file này nếu cần Admin dashboard đọc `auth.users` và quản lý account:

```text
src/data/datasources/supabase/admin_user_management.sql
```

File này tạo/cập nhật:

- `get_admin_auth_users()`
- `admin_update_user_profile(...)`
- `admin_update_user_account_status(...)`
- các policy/grant phục vụ admin dashboard.

### Các patch cũ

Các file sau là patch nhỏ từng bước, giữ lại để debug hoặc migrate từng phần:

```text
budget_warning_fix_01_allocations.sql
budget_warning_fix_02_budgets.sql
budget_warning_fix_03_rpcs.sql
budget_warning_fix_04_warning_type_constraint.sql
notification_subsystem.sql
```

Với setup mới, ưu tiên dùng `notification_subsystem_full.sql`.

## Chạy hệ thống

### 1. Chạy backend AI scanner

Terminal 1:

```powershell
cd D:\Code_lab\introSE\SmartSpendAI-Repo2\Project-introSE\src\backend
npm start
```

Hoặc dev mode:

```powershell
npm run dev
```

Backend mặc định chạy tại:

```text
http://localhost:4000
```

Health checks:

```powershell
curl.exe -s http://localhost:4000/health
curl.exe -s http://localhost:4000/api/ai-scanner/health
```

Test phân tích hóa đơn:

```powershell
curl.exe -s -F "image=@D:\path\to\receipt.jpg" http://localhost:4000/api/ai-scanner/analyze
```

### 2. Chạy mobile app bằng Expo

Terminal 2:

```powershell
cd D:\Code_lab\introSE\SmartSpendAI-Repo2\Project-introSE\src
npx expo start -c
```

Sau đó chọn:

- `a` để mở Android emulator,
- `i` để mở iOS simulator nếu dùng macOS,
- scan QR bằng Expo Go cho thiết bị thật,
- hoặc mở web theo hướng dẫn bên dưới.

Scripts có sẵn:

```powershell
npm start
npm run android
npm run ios
npm run web
```

### 3. Chạy web/mobile web

```powershell
cd src
npm run web
```

Trang web mặc định mở mobile app UI.

### 4. Chạy Admin dashboard

Admin dashboard dùng chung Expo web app. Route admin được chọn trong `src/App.tsx` khi URL bắt đầu bằng `/admin`.

Chạy web:

```powershell
cd src
npm run web
```

Mở các route:

```text
http://localhost:8081/admin
http://localhost:8081/admin/users
http://localhost:8081/admin/notifications
```

Điều kiện truy cập admin:

- user phải có profile trong `user_profiles`;
- `is_admin = true`;
- `account_status = 'active'`;
- đã chạy `admin_user_management.sql`.

## Luồng dữ liệu chính

### Giao dịch và ngân sách

```text
transactions
  └─ category_id → categories

budgets
  └─ one monthly budget per user/year/month
      └─ budget_category_allocations
          └─ category_id → categories
```

- Khi tạo monthly budget, hệ thống tạo allocation cho toàn bộ expense categories mặc định và tự tạo của user.
- Allocation mới mặc định `allocated_amount = 0`.
- Khi user sửa hạn mức, app cập nhật `allocated_amount`.
- Khi user tạo/sửa/xóa giao dịch, app gọi RPC để refresh `spent_amount` và chạy warning.

RPC liên quan:

```text
ensure_user_monthly_budget(year, month)
refresh_user_budget_spending(year, month)
evaluate_user_budget_notifications()
delete_user_transaction(transaction_id)
```

### Notification

```text
notification_campaigns
  └─ notification_campaign_targets
      └─ notifications

budget_warnings
  └─ notifications(type = 'budget_warning')
```

- User Notification Center đọc `notifications` theo `user_id`, `deleted_at is null`, `created_at <= now`.
- Scheduled campaign được biểu diễn bằng notification có `created_at` ở tương lai.
- Delete notification của user là soft delete qua `deleted_at`.

## Kiểm tra và validation

Chạy TypeScript check:

```powershell
cd src
npx tsc --noEmit
```

Kiểm tra Expo config:

```powershell
cd src
npx expo config --type public
```

Kiểm tra whitespace trong diff:

```powershell
cd ..
git diff --check
```

Kiểm tra trạng thái Git:

```powershell
git status --short
```

## Troubleshooting

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `Failed to fetch` khi quét hóa đơn | Backend chưa chạy hoặc URL sai | Kiểm tra `EXPO_PUBLIC_API_BASE_URL`, chạy `npm start` trong `src/backend` |
| `EADDRINUSE: address already in use :::4000` | Port 4000 đang có process khác | Dừng process hoặc đổi `PORT` trong backend `.env` |
| Gemini báo API key invalid | Key sai/hết hiệu lực | Tạo key mới tại Google AI Studio |
| Supabase RPC 404 | Chưa chạy SQL tạo function | Chạy `notification_subsystem_full.sql` và/hoặc `admin_user_management.sql` |
| Supabase RPC 400 | Function exception hoặc check constraint chưa đúng | Mở Network → Response để xem message, chạy lại SQL hợp nhất |
| `deadlock detected` khi chạy SQL | App đang giữ lock realtime/query | Tắt app/dev server, chạy lại SQL sau vài giây |
| Không thấy warning 80%/100% | Budget allocation chưa có hạn mức hoặc SQL chưa cập nhật | Đặt `allocated_amount > 0`, chạy lại RPC hoặc refresh app |
| Không vào được admin | User chưa phải admin hoặc chưa active | Update `user_profiles.is_admin = true`, `account_status = 'active'` |

## Bảo mật

- Không commit `.env`, Gemini API key hoặc service role key.
- Frontend chỉ dùng Supabase anon key.
- Không đưa Supabase service role key vào mobile/web bundle.
- RLS policies là lớp bảo vệ chính cho dữ liệu user.
- Admin functions dùng `security definer`, vì vậy chỉ expose quyền qua `is_admin()`.

## Tài liệu liên quan

- AI Scanner module: [`src/modules/ai-scanner/README.md`](src/modules/ai-scanner/README.md)
- AI Scanner backend: [`src/backend/README.md`](src/backend/README.md)
- SQL hợp nhất: [`src/data/datasources/supabase/notification_subsystem_full.sql`](src/data/datasources/supabase/notification_subsystem_full.sql)
- Admin SQL: [`src/data/datasources/supabase/admin_user_management.sql`](src/data/datasources/supabase/admin_user_management.sql)
