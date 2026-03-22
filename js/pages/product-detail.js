document.addEventListener('DOMContentLoaded', function () {
  var id = window.PVQ_getQueryParam('id');
  var p = window.PVQ_getProductById(id);
  var titleEl = document.getElementById('product-title');
  var descEl = document.getElementById('product-desc');
  var priceEl = document.getElementById('product-price');
  var condEl = document.getElementById('product-condition');
  var imgEl = document.getElementById('product-image');
  var chipsEl = document.getElementById('product-chips');

  if (!p) {
    if (titleEl) titleEl.textContent = 'Không tìm thấy sản phẩm';
    if (descEl)
      descEl.textContent =
        'Mã sản phẩm không hợp lệ. Vui lòng quay lại danh sách đàn piano.';
    return;
  }

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
});
