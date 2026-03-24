# piano_vinhquang

Project này là static multi-page frontend, kèm một backend Node/Express tối giản để nhận form liên hệ vào MongoDB local.

Sau refactor, phần HTML lặp nhiều đã được tách ra theo hướng thực dụng, ít rủi ro:

- `partials/`: header, footer, page hero, common CTA
- `js/common-head.js`: nạp phần head dùng chung như fonts, CSS, theme color
- `js/site-shell.js`: bootstrap chung cho page shell, render partial và init common behavior
- `js/site-header.js`: render header/footer dùng lại được
- `js/pages/`: logic riêng của từng page
- `content/`: dữ liệu courses, lessons, products

## Cấu trúc đang dùng

- Root HTML page vẫn được giữ ở thư mục gốc để không làm gãy link hiện có.
- Page nào cần phần dùng chung chỉ đặt mount point như `#site-header-mount`, `#site-footer-mount`, `[data-site-hero]`, `[data-site-cta]`.
- JS page-level vẫn bám theo các `id` cũ như `#courses-grid`, `#product-title`, `#lesson-access-body`, nên không phải sửa selector hàng loạt.

## Chạy local

Nếu cần đầy đủ cả API liên hệ:

1. `npm install`
2. `npm start`
3. Mở `http://localhost:3000`

Nếu chỉ cần test phần frontend static và partial:

1. `python3 -m http.server 4173`
2. Mở `http://localhost:4173`

Lưu ý: vì partial đang được load bằng `fetch()`, không nên mở page bằng cách double-click file HTML trực tiếp từ file system.

## Environment variables

### Required for production

- `NODE_ENV=production`
- `MONGODB_URI`
- `MONGODB_DB`
- `AUTH_JWT_SECRET`
- `RESOURCE_LINK_SECRET`
- `CORS_ALLOW_ORIGIN` (explicit origin list, no `*`)

### Common optional

- `PORT` (platform thường tự inject)
- `AUTH_TOKEN_TTL_SECONDS`
- `RESOURCE_LINK_TTL_SECONDS`
- `CORS_ALLOW_CREDENTIALS`
- `VERCEL_FRONTEND_ORIGIN`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `ORDER_RATE_LIMIT_WINDOW_MS`
- `ORDER_RATE_LIMIT_MAX`
- `CONTACT_RATE_LIMIT_WINDOW_MS`
- `CONTACT_RATE_LIMIT_MAX`
- `PAYMENT_BANK_CODE`
- `PAYMENT_BANK_NAME`
- `PAYMENT_ACCOUNT_NUMBER`
- `PAYMENT_ACCOUNT_NAME`
- `ORDER_TRANSFER_CODE_PREFIX`
- `MONGODB_CUSTOMERS_COLLECTION`
- `MONGODB_USERS_COLLECTION`
- `MONGODB_ENROLLMENTS_COLLECTION`
- `MONGODB_ORDERS_COLLECTION`
- `MONGODB_LESSON_PROGRESS_COLLECTION`
- `ADMIN_CONFIRM_API_KEY` (required in production for admin confirm APIs)

### Development notes

- Nếu thiếu `MONGODB_URI` trong local dev, backend fallback `mongodb://localhost:27017`.
- Trên production/Railway, thiếu `MONGODB_URI` sẽ fail-fast để tránh kết nối nhầm localhost.

## Deploy frontend + backend khác domain

Nếu frontend deploy trên Vercel/Netlify và backend deploy riêng (Render/Railway/VPS), cần cấu hình 2 chỗ:

1. **Frontend API base**
   - Thêm vào `<head>` của trang (hoặc inject chung):
   - `<meta name="pvq-api-base" content="https://your-backend-domain.com">`
   - Hoặc set global trước khi load `js/auth.js`:
   - `window.PVQ_API_BASE = 'https://your-backend-domain.com';`

2. **Backend CORS**
   - Set env `CORS_ALLOW_ORIGIN` trên backend:
   - Ví dụ: `https://piano-vinhquang.vercel.app`
   - Có thể khai báo nhiều domain, phân tách bằng dấu phẩy.
   - Production không cho phép wildcard `*`.
   - Có thể set thêm `CORS_ALLOW_CREDENTIALS=true` (mặc định true).

## MongoDB local

- Host: `localhost:27017`
- Database: `piano_vinhquang`
- Collection: `customers`

## API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/my/enrollments`
- `GET /api/my/progress`
- `GET /api/courses/:courseId/access`
- `GET /api/courses`
- `GET /api/courses/:courseId`
- `GET /api/courses/:courseId/lessons`
- `POST /api/orders/create` (body: `{ "courseId": "..." }`) — tạo đơn `pending`
- `POST /api/orders/confirm` (header: `x-admin-key`, body: `{ "orderId": "<ObjectId>" }`) — admin confirm thanh toán, ghi `enrollment`
- `POST /api/admin/orders/confirm` (header: `x-admin-key`, body: `{ "orderId": "<ObjectId>" }`) — alias admin confirm (idempotent)
- `GET /api/courses/:courseId/lessons/:lessonId`
- `POST /api/courses/:courseId/lessons/:lessonId/progress`
- `GET /api/resources/:refId/open?token=...`
- `POST /api/customers`

Error format thống nhất cho API lỗi:

```json
{
  "ok": false,
  "message": "Human readable message",
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable message"
  }
}
```

Auth API mẫu:

```json
{
  "email": "hocvien@example.com",
  "password": "matkhau123",
  "displayName": "Hoc vien demo"
}
```

`GET /api/me` cần header:

```http
Authorization: Bearer <token>
```

`GET /api/courses/:courseId/lessons/:lessonId` giờ trả luôn `items` đã được resolve thành signed backend URL. Frontend không còn load file map học liệu private ở phía client nữa.

`GET /api/resources/:refId/open?token=...` là signed redirect link ngắn hạn do backend tạo ra. URL Google Drive thật chỉ tồn tại ở server-side map.

### Lesson data shape (future-proof)

Mỗi `lesson.json` nên hỗ trợ các field sau để cắm URL thật về sau mà không đổi kiến trúc:

- `title`
- `description`
- `order`
- `videoUrl`
- `sheetUrl`
- `audioUrl`
- `isPreview`
- `status` (`draft` / `ready` / `placeholder`)

## Cấu hình học liệu private

- Tạo file `config/resources.private.json` dựa trên [config/resources.private.example.json](/media/trungdt2/New%20Volume/Work/piano_vinhquang/config/resources.private.example.json).
- File này được ignore khỏi git và chỉ dùng ở server-side.
- Mỗi `refId` trong lesson JSON nên map tới một object như:

```json
{
  "pvq-pcb-l01-vid": {
    "type": "video_embed",
    "provider": "google_drive",
    "url": "https://drive.google.com/file/d/REAL_ID/preview"
  }
}
```

Bạn có thể thay `provider` bằng giá trị mô tả thực tế bạn dùng sau này, ví dụ `google_drive`, `vimeo`, `bunny_stream`, `cloudflare_stream`. Logic signed link của backend không phụ thuộc vào provider, miễn là `url` đích là URL bạn muốn redirect tới.

Nếu chưa tạo `config/resources.private.json`, server sẽ fallback sang map placeholder trong [lib/private-resource-map.js](/media/trungdt2/New%20Volume/Work/piano_vinhquang/lib/private-resource-map.js).

Demo auth mặc định sau khi server khởi động:

- email: `hocvien@demo.vn`
- password: `matkhau123`

Frontend auth pages:

- `account.html`: đăng nhập
- `register.html`: tạo tài khoản mới
- `checkout.html`: checkout chuyển khoản thủ công (QR + mã nội dung chuyển khoản)
- `dashboard.html`: tiếp tục học và xem tiến độ

Checkout `POST /api/orders/create` trả thêm:

- `checkout.amount`
- `checkout.bank` (`bankName`, `bankCode`, `accountNumber`, `accountName`)
- `checkout.transferCode`
- `checkout.qr.imageUrl`
- `checkout.qr.data`

Sau khi người dùng chuyển khoản, admin gọi confirm API để đổi đơn sang `paid` và cấp enrollment.

Payload mẫu:

```json
{
  "interest": "course",
  "interestLabel": "Khóa học online",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0900000000",
  "message": "Muon duoc tu van."
}
```
