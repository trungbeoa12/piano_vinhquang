document.addEventListener('DOMContentLoaded', function () {
  var id = window.PVQ_getQueryParam('id');
  var titleEl = document.getElementById('product-title');
  var descEl = document.getElementById('product-desc');
  var priceEl = document.getElementById('product-price');
  var condEl = document.getElementById('product-condition');
  var imgEl = document.getElementById('product-image');
  var chipsEl = document.getElementById('product-chips');
  var salesEl = document.getElementById('product-sales');

  if (!id || !window.PVQ_Content) {
    if (titleEl) titleEl.textContent = 'Không tìm thấy sản phẩm';
    if (descEl) {
      descEl.textContent =
        'Mã sản phẩm không hợp lệ. Vui lòng quay lại danh sách đàn piano.';
    }
    return;
  }

  window.PVQ_Content.loadProductById(id)
    .then(function (p) {
      document.title = p.name + ' — Piano Vinh Quang';
      if (titleEl) titleEl.textContent = p.name;
      if (descEl) descEl.textContent = p.shortDesc;
      if (priceEl) priceEl.textContent = p.priceLabel;
      if (condEl) condEl.textContent = p.condition;
      if (imgEl) {
        imgEl.src = p.image;
        imgEl.alt = p.name;
      }

      if (chipsEl && p.highlights) {
        chipsEl.innerHTML = p.highlights
          .map(function (h) {
            return '<span class="pvq-chip">' + h + '</span>';
          })
          .join('');
      }

      if (salesEl) {
        salesEl.innerHTML =
          '<div class="pvq-detail-block">' +
          '<h3 class="pvq-detail-block-title">Chính sách & mua hàng</h3>' +
          '<dl class="pvq-sales-dl">' +
          '<dt>Bảo hành</dt><dd>' +
          (p.warranty || '—') +
          '</dd>' +
          '<dt>Vận chuyển</dt><dd>' +
          (p.shipping || '—') +
          '</dd>' +
          '<dt>Thanh toán</dt><dd>' +
          (p.payment || '—') +
          '</dd>' +
          '<dt>Tư vấn xem đàn</dt><dd>' +
          (p.consultation || '—') +
          '</dd>' +
          '</dl></div>';
      }
    })
    .catch(function (error) {
      if (titleEl) titleEl.textContent = 'Không tìm thấy sản phẩm';
      if (descEl) {
        descEl.textContent =
          'Không thể tải dữ liệu sản phẩm. Vui lòng kiểm tra lại nội dung trong folder.';
      }
      console.error('[product-detail] load failed:', error);
    });
});
