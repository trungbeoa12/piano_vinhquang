# Content Structure

Noi dung khoa hoc, bai hoc va san pham duoc to chuc theo folder de de cap nhat sau nay.

## Courses

- `content/courses/index.json`: danh sach `id` khoa hoc
- `content/courses/<course-id>/course.json`: thong tin tong quan khoa hoc
- `content/courses/<course-id>/lessons/<lesson-id>/lesson.json`: thong tin bai hoc trong khoa

## Products

- `content/products/index.json`: danh sach `id` san pham
- `content/products/<product-id>/product.json`: thong tin chi tiet san pham

## Workflow

1. Tao folder moi theo `id`
2. Them file JSON theo dung mau
3. Cap nhat `index.json` de page list hien thi muc moi
