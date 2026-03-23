# piano_vinhquang

Project hiện có frontend tĩnh và một backend Node/Express tối giản để lưu form liên hệ vào MongoDB local.

Noi dung khoa hoc, bai hoc va san pham da duoc tach sang cau truc folder trong thu muc `content/` de de cap nhat va upload sau nay.

## MongoDB local

- Host: `localhost:27017`
- Database: `piano_vinhquang`
- Collection: `customers`

## Chạy project

1. Cài dependencies:
   `npm install`
2. Tạo file env từ mẫu:
   `cp .env.example .env`
3. Chạy server:
   `npm start`
4. Mở:
   `http://localhost:3000`

## API

- `GET /api/health`
- `POST /api/customers`

## Content folders

- `content/courses/index.json`: danh sach khoa hoc
- `content/courses/<course-id>/course.json`: thong tin tong quan khoa hoc
- `content/courses/<course-id>/lessons/<lesson-id>/lesson.json`: thong tin tung bai hoc
- `content/products/index.json`: danh sach san pham
- `content/products/<product-id>/product.json`: thong tin tung dan piano

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
