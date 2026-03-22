document.addEventListener('DOMContentLoaded', function () {
  var g = document.getElementById('products-grid');
  if (!g || !window.PVQ_PRODUCTS) return;

  g.innerHTML = window.PVQ_PRODUCTS.map(function (p) {
    return (
      '<a class="pvq-catalog-card" href="product-detail.html?id=' +
      encodeURIComponent(p.id) +
      '">' +
      '<img class="pvq-catalog-card-image" src="' +
      p.image +
      '" alt="' +
      p.name.replace(/"/g, '') +
      '">' +
      '<div class="pvq-catalog-card-body">' +
      '<h2>' +
      p.name +
      '</h2>' +
      '<div class="pvq-catalog-meta">' +
      p.condition +
      ' • ' +
      p.priceLabel +
      '</div>' +
      '<p>' +
      p.shortDesc +
      '</p>' +
      '<span class="pvq-link-arrow">Xem chi tiết →</span>' +
      '</div></a>'
    );
  }).join('');
});
