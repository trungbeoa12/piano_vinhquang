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
- `PAYMENT_BANK_ACCOUNT_NUMBER`
- `PAYMENT_BANK_ACCOUNT_NAME`
- `ORDER_TRANSFER_CODE_PREFIX`
- `MONGODB_CUSTOMERS_COLLECTION`
- `MONGODB_USERS_COLLECTION`
- `MONGODB_ENROLLMENTS_COLLECTION`
- `MONGODB_ORDERS_COLLECTION`
- `MONGODB_LESSON_PROGRESS_COLLECTION`
- `ADMIN_ACTION_SECRET` (required in production for admin confirm APIs)

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
- `GET /api/orders/:orderId` (owner hoặc admin với `x-admin-key`)
- `GET /api/admin/orders?status=pending` (header: `x-admin-key`) — list orders chờ xác nhận
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
- `admin-orders.html`: trang tối thiểu để admin xem đơn `payment_submitted` và confirm cấp quyền học

## Happy path bán khóa học

Luồng MVP hiện tại:

1. User mở `course-detail.html?id=<courseId>`
2. Bấm mua khóa học
3. Nếu chưa login -> chuyển sang đăng nhập / quay lại checkout
4. Nếu đã login -> hệ thống tạo hoặc tái sử dụng order đang mở
5. Order mới tạo có trạng thái `pending_payment`
6. User vào `checkout.html?courseId=<courseId>` để xem:
   - tên khóa học
   - giá
   - mã đơn hàng
   - trạng thái đơn
   - ngân hàng: `VietinBank`
   - số tài khoản: `103866619999`
   - chủ tài khoản: `Đỗ Thành Trung`
7. User bấm `Tôi đã chuyển khoản`
8. Order đổi sang `payment_submitted`
9. Admin mở `admin-orders.html`
10. Admin confirm đơn
11. Backend đổi order sang `confirmed` và cấp enrollment
12. User reload `dashboard.html` sẽ thấy khóa học đã được cấp và vào lesson học được

## Order states

Flow trạng thái đơn tối thiểu:

- `pending_payment`: user đã tạo đơn, chưa bấm xác nhận chuyển khoản
- `payment_submitted`: user đã bấm `Tôi đã chuyển khoản`, chờ admin xác nhận
- `confirmed`: admin đã confirm, enrollment đã được cấp hoặc đã tồn tại
- `cancelled`: chưa dùng trong happy path hiện tại nhưng đã dành sẵn

Rule chính:

- guest không tạo order được
- user đã có enrollment thì không mua lại cùng course theo flow bình thường
- nếu đã có order mở cho cùng course thì hệ thống tái sử dụng order cũ
- owner mới được `mark-paid`
- chỉ admin mới được confirm
- confirm nhiều lần không tạo enrollment trùng

## API order/enrollment hiện tại

- `POST /api/orders`
- `POST /api/orders/create`
  - body: `{ "courseId": "piano-co-ban" }`
  - yêu cầu auth
  - trả order mới hoặc order đang mở

- `GET /api/orders/:orderId`
  - chỉ owner hoặc admin (`x-admin-key`) xem được

- `POST /api/orders/:orderId/mark-paid`
  - owner bấm `Tôi đã chuyển khoản`
  - chuyển order từ `pending_payment` sang `payment_submitted`

- `GET /api/me/orders`
- `GET /api/orders/my`
  - lấy danh sách order của user hiện tại

- `GET /api/my/enrollments`
- `GET /api/me/enrollments`
  - trả danh sách `enrolledCourseIds`

- `GET /api/admin/orders?status=payment_submitted`
  - list đơn chờ xác nhận

- `POST /api/admin/orders/:orderId/confirm`
  - admin confirm đơn và cấp enrollment

- `POST /api/orders/confirm`
- `POST /api/admin/orders/confirm`
  - alias cũ vẫn còn để tương thích

Checkout `POST /api/orders` hoặc `POST /api/orders/create` trả thêm:

- `checkout.amount`
- `checkout.bank` (`bankName`, `bankCode`, `accountNumber`, `accountName`)
- `checkout.transferCode`
- `checkout.qr.imageUrl`
- `checkout.qr.data`

Sau khi người dùng chuyển khoản:

- frontend gọi `POST /api/orders/:orderId/mark-paid`
- order đổi sang `payment_submitted`
- admin gọi confirm API để đổi đơn sang `confirmed` và cấp enrollment

## Admin key local

Trong local dev, nếu chưa set `ADMIN_ACTION_SECRET`, backend dùng fallback:

- `pvq_admin_dev_key`

Key này chỉ để test local happy path. Trên production nên set `ADMIN_ACTION_SECRET` rõ ràng.

## Checklist test local ngắn

1. `npm start`
2. Mở `account.html` và đăng nhập bằng user chưa có enrollment hoặc đăng ký user mới
3. Vào `course-detail.html?id=piano-co-ban`
4. Bấm mua -> sang `checkout.html`
5. Bấm `Tôi đã chuyển khoản`
6. Mở `admin-orders.html`, nhập `pvq_admin_dev_key`, bấm confirm
7. Quay lại `dashboard.html`, kiểm tra khóa học đã xuất hiện
8. Mở lesson đầu tiên và xác nhận truy cập được

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
