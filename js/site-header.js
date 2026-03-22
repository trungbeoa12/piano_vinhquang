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
    '<header>' +
    '<div class="header-logo-row">' +
    '<a href="index.html#hero" class="logo">' +
    '<img src="images/branding/logo-pianovinhquang-main.png" alt="Piano Vinh Quang logo" class="logo-icon">' +
    '<span class="logo-text">Piano Vinh Quang</span>' +
    '</a>' +
    '</div>' +
    '<div class="header-nav-row">' +
    '<div class="nav-container">' +
    '<div class="nav-decor"><span class="ornament">♪</span><span>•</span><span class="ornament">♫</span></div>' +
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
    '<div class="nav-decor"><span class="ornament">♬</span><span>•</span><span class="ornament">♪</span></div>' +
    '<div class="nav-toggle" id="navToggle"><span></span><span></span><span></span></div>' +
    '</div>' +
    '</div>' +
    '</header>';

  window.PVQ_appCommon.initNavigation();
};
