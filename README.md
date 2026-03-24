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

## MongoDB local

- Host: `localhost:27017`
- Database: `piano_vinhquang`
- Collection: `customers`

## API

- `GET /api/health`
- `POST /api/customers`

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
