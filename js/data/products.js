/**
 * Sản phẩm đàn piano (hàng vật lý) — tách biệt khỏi khóa học online.
 * Chỉ dữ liệu hiển thị công khai (giá, mô tả, ảnh).
 */
window.PVQ_PRODUCTS = [
  {
    id: 'upright-yamaha-u1',
    name: 'Yamaha U1 (Upright)',
    shortDesc: 'Đàn upright cổ điển, âm sắc ổn định, phù hợp phòng khách và studio nhỏ.',
    priceLabel: 'Liên hệ',
    condition: 'Mới / đã qua kiểm định',
    image: 'images/products/product-upright-yamaha-u1-showroom.jpg',
    highlights: ['Bàn phím Ivory Touch', 'Pedal 3 cấp', 'Bảo hành chính hãng'],
  },
  {
    id: 'digital-casio-pxs',
    name: 'Casio Privia PX-S7000',
    shortDesc: 'Đàn kỹ thuật số cao cấp, búa như acoustic, tiện cho học và biểu diễn nhỏ.',
    priceLabel: 'Liên hệ',
    condition: 'Hàng mới',
    image: 'images/products/product-digital-casio-privia-pxs7000-showroom.jpg',
    highlights: ['Nhẹ, dễ di chuyển', 'Nhiều tiếng đàn', 'Kết nối app / USB'],
  },
  {
    id: 'grand-yamaha-c3',
    name: 'Yamaha C3 (Grand)',
    shortDesc: 'Grand piano cho không gian rộng, âm hưởng đầy và rõ nốt.',
    priceLabel: 'Liên hệ',
    condition: 'Đã qua chỉnh âm',
    image: 'images/products/product-grand-yamaha-c3-showroom.jpg',
    highlights: ['Length ~186cm', 'Phù hợp phòng thu / sảnh', 'Xem đàn trực tiếp'],
  },
];

window.PVQ_getProductById = function (id) {
  return window.PVQ_PRODUCTS.find(function (p) {
    return p.id === id;
  }) || null;
};
