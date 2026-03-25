# Ghi chú dọn tiếp

- Có thể gom thêm các inline style nhỏ trong `course-detail.html`, `product-detail.html`, `lesson.html`, `account.html` sang `css/app-components.css` nếu muốn sạch markup hơn nữa.
- Có thể chuyển các block CTA hiện đang cấu hình bằng `data-*` sang JSON config hoặc map JS nếu sau này số lượng page tăng nhiều.
- Có thể cân nhắc refactor tiếp `index.html` thành nhiều section partial nếu muốn, nhưng hiện tại mình giữ nguyên phần nội dung lớn để tránh rủi ro layout.
- `js/site-header.js` hiện đang kiêm luôn footer injector; nếu muốn tách trách nhiệm rõ hơn có thể đổi tên file thành `js/site-layout.js`.
- Nếu sau này project phát triển mạnh hơn, có thể chuyển từ fetch partial sang một bước build nhẹ với Nunjucks hoặc Eleventy để tránh render bất đồng bộ trên client.
