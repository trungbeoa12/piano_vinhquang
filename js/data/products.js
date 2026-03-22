/**
 * Sản phẩm đàn piano (hàng vật lý) — tách biệt khóa học online.
 */
window.PVQ_PRODUCTS = [
  {
    id: 'upright-yamaha-u1',
    name: 'Yamaha U1 (Upright)',
    shortDesc: 'Đàn upright cổ điển, âm sắc ổn định, phù hợp phòng khách và studio nhỏ.',
    priceLabel: 'Liên hệ báo giá',
    condition: 'Mới / đã qua kiểm định',
    image: 'images/products/product-upright-yamaha-u1-showroom.jpg',
    highlights: ['Bàn phím Ivory Touch', 'Pedal 3 cấp', 'Bảo hành chính hãng'],
    warranty: 'Bảo hành theo chính sách Yamaha và điều khoản cửa hàng (thời hạn cụ thể khi chốt đơn).',
    shipping: 'Hỗ trợ vận chuyển nội thành và liên tỉnh; phí và cách đóng gói báo sau khi khảo sát địa điểm.',
    payment: 'Đặt cọc giữ đàn, chuyển khoản, hỗ trợ trả góp nếu áp dụng chương trình đối tác.',
    consultation: 'Hẹn xem đàn trực tiếp, kiểm tra cảm phím và âm trước khi quyết định.',
  },
  {
    id: 'digital-casio-pxs',
    name: 'Casio Privia PX-S7000',
    shortDesc: 'Đàn kỹ thuật số cao cấp, búa như acoustic, tiện cho học và biểu diễn nhỏ.',
    priceLabel: 'Liên hệ báo giá',
    condition: 'Hàng mới',
    image: 'images/products/product-digital-casio-privia-pxs7000-showroom.jpg',
    highlights: ['Nhẹ, dễ di chuyển', 'Nhiều tiếng đàn', 'Kết nối app / USB'],
    warranty: 'Bảo hành chính hãng Casio; gia hạn và gói bảo trì theo gói bạn chọn.',
    shipping: 'Đóng gói an toàn; giao tận nơi hoặc nhận tại showroom.',
    payment: 'Thanh toán linh hoạt; tư vấn combo phụ kiện (giá đỡ, tai nghe luyện tập…).',
    consultation: 'So sánh với các mẫu Privia khác theo ngân sách và nhu cầu biểu diễn.',
  },
  {
    id: 'grand-yamaha-c3',
    name: 'Yamaha C3 (Grand)',
    shortDesc: 'Grand piano cho không gian rộng, âm hưởng đầy và rõ nốt.',
    priceLabel: 'Liên hệ báo giá',
    condition: 'Đã qua chỉnh âm',
    image: 'images/products/product-grand-yamaha-c3-showroom.jpg',
    highlights: ['Chiều dài ~186 cm', 'Phù hợp phòng thu / sảnh', 'Xem đàn trực tiếp'],
    warranty: 'Kiểm tra tình trạng máy và cam kết trong hợp đồng mua bán (grand thường kèm chỉnh âm định kỳ).',
    shipping: 'Cần khảo sát cầu thang, cửa ra vào; hỗ trợ team nâng hạ chuyên dụng.',
    payment: 'Đặt cọc theo tỷ lệ thỏa thuận; hợp đồng rõ ràng trước khi vận chuyển.',
    consultation: 'Tư vấn bố trí acoustic phòng, vị trí đặt đàn và bảo dưỡng định kỳ.',
  },
];

window.PVQ_getProductById = function (id) {
  return window.PVQ_PRODUCTS.find(function (p) {
    return p.id === id;
  }) || null;
};
