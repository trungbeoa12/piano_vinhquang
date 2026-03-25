# Project Progress Review

Đánh giá ngày: 2026-03-25

Nguồn đối chiếu:
- `plan_detailed.md`
- Trạng thái code hiện tại trong repo

## Tổng quan

- Tiến độ theo mục tiêu MVP bán được: `~70%`
- Tiến độ theo roadmap kỹ thuật Phase 1 -> 5: `~80%`
- Nhận định chung: backend đã đi khá xa, nhưng một phần trải nghiệm học thật và checkout thật vẫn còn ở mức demo / placeholder.

## Đánh giá theo roadmap

| Phase | Mục tiêu plan | Trạng thái | Ước lượng |
|---|---|---|---:|
| Phase 1 | Core Backend: Auth API, User model, JWT middleware | Đã có đủ API register/login/me, hash password, JWT verify, middleware bảo vệ route | 95% |
| Phase 2 | Enrollment: linking users and courses, check quyền học | Đã có enrollment collection, check access, admin confirm order để cấp quyền | 90% |
| Phase 3 | Lesson real: load lesson theo DB/content, không hardcode | Đã load động từ API/content JSON, nhưng lesson content thật vẫn còn thiếu và piano widget còn dùng sample asset | 75% |
| Phase 4 | Resource protection | Đã có signed resource URL và redirect qua backend, nhưng map hiện vẫn còn placeholder fallback | 75% |
| Phase 5 | Payment mock | Đã có tạo order, QR, transfer code, admin confirm; frontend vẫn còn một bước giả lập sau khi user bấm "đã chuyển khoản" | 65% |

## Đánh giá theo từng mục trong plan

### 1. Product Vision

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Học piano online | In progress | Flow đã có, nhưng nội dung bài học thật chưa đầy |
| Bán đàn piano | In progress | Có listing/detail và CTA tư vấn, chưa thấy CRM/sales flow sâu |
| Học trực tiếp trên web | In progress | Có piano widget và lesson page, nhưng chưa phải lesson-interactive hoàn chỉnh |
| Demo -> MVP bán được | In progress | Đã vượt demo, chưa đạt mức MVP hoàn chỉnh |

### 2. Target Users

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Beginner | Done | Nội dung và course positioning đã rõ |
| Hobby learner | Partial | Có hướng nội dung, nhưng chiều sâu khóa học còn mỏng |
| Buyer | Done | Có products + detail + CTA liên hệ |

### 3. Core User Flow

| Flow | Trạng thái | Ghi chú |
|---|---|---|
| Homepage -> Courses -> Course Detail | Done | Flow đã hoạt động |
| Course Detail -> Buy -> Dashboard -> Lesson -> Continue | In progress | Có đủ page và logic chính, nhưng payment/admin confirm chưa khép kín ở UI |
| Homepage -> Products -> Product Detail -> CTA -> Submit lead | In progress | CTA tốt, lead API có; chưa thấy flow bán hàng sâu hơn |
| Register -> Login -> Dashboard -> My Courses | Done | Flow cơ bản đã có |

### 4. System Architecture

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Static frontend pages | Done | Đầy đủ các page chính |
| Express API | Done | API backend đã khá đầy đủ |
| MongoDB | Done | Có collections users, enrollments, orders, lesson_progress, customers |
| Frontend -> API -> MongoDB | Done | Data flow cốt lõi đã vận hành trong code |

### 5. Database Design

| Collection | Trạng thái | Ghi chú |
|---|---|---|
| users | Done | Có dùng thật |
| courses | Partial | Hiện lưu bằng JSON content thay vì Mongo collection |
| lessons | Partial | Hiện lưu bằng JSON content thay vì Mongo collection |
| enrollments | Done | Có dùng thật |
| lesson_progress | Done | Có dùng thật |

### 6. Auth System

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Register | Done | API + frontend |
| Login | Done | API + frontend |
| JWT token | Done | Có sign/verify |
| Middleware protect route | Done | Đã bảo vệ `/api/me`, lesson protected APIs, orders |
| `POST /api/auth/register` | Done | Có |
| `POST /api/auth/login` | Done | Có |
| `GET /api/me` | Done | Có |

### 7. Learning System

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Video player | Partial | Có link mở video, chưa có embedded lesson player hoàn chỉnh |
| Sheet (MusicXML) | Partial | Có tài nguyên và widget demo, chưa gắn đầy đủ theo lesson thật |
| Piano widget | Done | Có nhúng trên lesson/demo |
| Next / Prev lesson | Partial | Có “bài tiếp theo”, chưa thấy prev rõ ràng |
| Progress tracking | Done | Có API + dashboard + mark complete |
| Resume | Partial | Có field `resumeAtSec`, nhưng UI/player chưa dùng thật sự |

### 8. Monetization

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Fake payment / manual unlock | In progress | Backend khá ổn, frontend còn mang tính demo |
| Real payment (Momo / Stripe) | Todo | Chưa thấy triển khai |
| Flow Course Detail -> Buy -> Payment -> Enrollment | In progress | Có luồng chính, nhưng vẫn phụ thuộc admin confirm thủ công ngoài UI người dùng |

### 9. Resource Protection

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Backend generate URL | Done | Có signed open URL |
| Signed URL | Done (MVP) | Đã có token ký và TTL; future có thể tăng mức bảo vệ |
| Chống lộ file public | Partial | Kiến trúc đúng, nhưng resource map hiện còn URL placeholder/fallback |

### 10. Roadmap Execution

| Day | Plan | Trạng thái |
|---|---|---|
| Day 1 | Auth backend | Done |
| Day 2 | Login UI connect API | Done |
| Day 3 | DB schema | Done |
| Day 4 | Enrollment | Done |
| Day 5 | Lesson dynamic | In progress |
| Day 6 | Protect resource | In progress |
| Day 7 | Test full flow | Partial |

### 11. Progress Tracking

| Hạng mục | Trạng thái |
|---|---|
| Demo | Done |
| MVP thật | In progress |

### 12. Risks

| Risk | Mức hiện tại | Ghi chú |
|---|---|---|
| Lộ học liệu | Medium | Đã giảm rủi ro nhờ signed URL, nhưng cần thay map thật |
| Auth yếu | Low -> Medium | Có rate limit + JWT + password hash, tạm ổn cho MVP |
| Không có payment | High | Đây là gap lớn nhất để lên MVP bán được hoàn chỉnh |

## Các phần đã làm tốt

- Auth backend và frontend đã khá đầy đủ.
- Enrollment/check quyền học đã đi vào backend thật.
- Lesson page đã đọc dữ liệu động từ API/content.
- Có progress tracking và dashboard tiếp tục học.
- Resource protection đã có nền tảng đúng hướng.
- Checkout mock đã có order, QR và admin confirm API.

## Các phần còn kéo tụt % tổng

- Nhiều lesson/resource vẫn là placeholder.
- Frontend checkout chưa khép kín sau hành động "đã chuyển khoản".
- Chưa có payment gateway thật.
- Chưa có admin UI vận hành order rõ ràng.
- Resume learning mới có data model, chưa thành trải nghiệm hoàn chỉnh.
- Chưa thấy kiểm thử end-to-end đầy đủ cho full flow.

## Kết luận

- Nếu tính theo góc nhìn kỹ thuật nền tảng: dự án đang ở khoảng `80%`.
- Nếu tính theo góc nhìn sản phẩm MVP có thể bán và vận hành mượt: dự án đang ở khoảng `70%`.

## Ưu tiên tiếp theo để lên 90%

1. Điền học liệu thật cho các lesson trọng điểm.
2. Hoàn thiện checkout mock thành flow rõ ràng từ phía user đến admin confirm.
3. Thêm admin page hoặc ít nhất quy trình quản lý order thuận tiện hơn.
4. Hoàn thiện resume/continue learning sát với video player thật.
5. Chạy test full flow từ đăng ký -> mua -> confirm -> vào học.
