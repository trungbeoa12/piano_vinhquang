document.addEventListener('DOMContentLoaded', function () {
  var g = document.getElementById('courses-grid');
  if (!g || !window.PVQ_COURSES) return;

  g.innerHTML = window.PVQ_COURSES.map(function (c) {
    return (
      '<a class="pvq-catalog-card" href="course-detail.html?id=' +
      encodeURIComponent(c.id) +
      '">' +
      '<img class="pvq-catalog-card-image" src="' +
      c.heroImage +
      '" alt="">' +
      '<div class="pvq-catalog-card-body">' +
      '<h2>' +
      c.title +
      '</h2>' +
      '<div class="pvq-catalog-meta">' +
      c.level +
      ' • ' +
      c.durationWeeks +
      ' tuần • ' +
      c.priceLabel +
      '</div>' +
      '<p>' +
      c.summary +
      '</p>' +
      '<span class="pvq-link-arrow">Xem chương trình →</span>' +
      '</div></a>'
    );
  }).join('');
});
