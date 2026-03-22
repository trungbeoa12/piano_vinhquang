/**
 * Header chung — inject vào #site-header-mount (optional).
 * current: 'home' | 'products' | 'courses' | 'account'
 */
window.PVQ_injectSiteHeader = function (current) {
  var mount = document.getElementById('site-header-mount');
  if (!mount) return;

  var session = window.PVQ_Auth && window.PVQ_Auth.getSession();
  var accountLabel = session ? 'Tài khoản' : 'Đăng nhập';
  var accountHref = 'account.html';

  function navClass(id) {
    return id === current ? ' class="active"' : '';
  }

  mount.innerHTML =
    '<header class="site-header">' +
    '<div class="site-header-shell">' +
    '<a href="index.html#hero" class="logo">' +
    '<img src="images/branding/logo-pianovinhquang-main.png" alt="Piano Vinh Quang logo" class="logo-icon">' +
    '<span class="logo-copy"><span class="logo-kicker">Piano Studio &amp; Academy</span><span class="logo-text">Piano Vinh Quang</span></span>' +
    '</a>' +
    '<div class="header-nav-row">' +
    '<div class="nav-container">' +
    '<ul class="nav-links" id="navLinks">' +
    '<li><a' +
    navClass('home') +
    ' href="index.html">Trang chủ</a></li>' +
    '<li><a' +
    navClass('products') +
    ' href="products.html">Đàn piano</a></li>' +
    '<li><a' +
    navClass('courses') +
    ' href="courses.html">Khóa học</a></li>' +
    '<li><a href="index.html#contact">Liên hệ</a></li>' +
    '<li><a' +
    navClass('account') +
    ' href="' +
    accountHref +
    '">' +
    accountLabel +
    '</a></li>' +
    '</ul>' +
    '</div>' +
    '</div>' +
    '<a href="index.html#contact" class="header-cta">Nhận tư vấn</a>' +
    '<div class="nav-toggle" id="navToggle"><span></span><span></span><span></span></div>' +
    '</div>' +
    '</header>';

  window.PVQ_appCommon.initNavigation();
};
