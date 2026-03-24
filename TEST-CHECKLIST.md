# Checklist test sau refactor

## Chạy local

- Chạy `python3 -m http.server 4173` hoặc `npm start`
- Mở lần lượt `index.html`, `products.html`, `product-detail.html?id=grand-yamaha-c3`, `courses.html`, `course-detail.html?id=piano-co-ban`, `lesson.html?courseId=piano-co-ban&lessonId=pcb-l01`, `account.html`

## Header / footer / nav

- Header xuất hiện ở tất cả page đã refactor
- Link active đúng ở `Trang chủ`, `Đàn piano`, `Khóa học`, `Tài khoản`
- Nút `Nhận tư vấn` trỏ đúng `#contact` ở trang chủ và `index.html#contact` ở các trang còn lại
- Footer xuất hiện đúng và không bị lệch layout
- Mobile nav mở/đóng được bằng click
- Mobile nav đóng lại khi bấm vào một link

## Hero / CTA dùng chung

- `products.html`, `courses.html`, `account.html` có hero block render đúng nội dung
- CTA block render đúng nội dung ở các page list/detail/account/lesson
- Không có chỗ nào bị mất spacing hoặc text bị chèn sai vị trí

## Dữ liệu động

- `products.html` tải danh sách đàn
- `product-detail.html?id=grand-yamaha-c3` tải đúng title, image, price, chips, sales info
- `courses.html` tải danh sách khóa học
- `course-detail.html?id=piano-co-ban` tải đúng overview và danh sách lessons
- `lesson.html?...` hiển thị đúng trạng thái chưa đăng nhập hoặc có quyền
- `account.html` đăng nhập demo và đăng xuất vẫn hoạt động

## Trang chủ

- Gallery lightbox vẫn mở/đóng được
- Form liên hệ vẫn submit như cũ khi backend hoạt động
- Widget piano demo vẫn render và phát được

## Kiểm tra link

- Logo header quay về trang chủ
- Link `Liên hệ` ở header/footer đi đúng nơi
- Link từ list sang detail hoạt động
- Link từ course detail sang lesson hoạt động
- Link từ account sang course detail hoạt động

## Kiểm tra console

- Không có lỗi `Failed to load partial`
- Không có lỗi `Cannot read properties of null` ở các page đã refactor
