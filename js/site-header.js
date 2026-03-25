/**
 * Header/footer chung — inject vào các mount tương ứng.
 * current: 'home' | 'products' | 'courses' | 'account'
 */
window.PVQ_applyHeaderOffset = function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  var height = Math.ceil(header.getBoundingClientRect().height || 0);
  if (!height) return;

  document.documentElement.style.setProperty('--pvq-header-offset', height + 'px');
};

window.PVQ_injectSiteHeader = function (current, options) {
  var mount = document.getElementById('site-header-mount');
  if (!mount || !window.PVQ_appCommon) return Promise.resolve();

  var session = window.PVQ_Auth && window.PVQ_Auth.getSession();
  var accountLabel = session ? 'Tài khoản' : 'Đăng nhập';
  var settings = options || {};

  function navClass(id) {
    return id === current ? ' class="active"' : '';
  }

  return window.PVQ_appCommon
    .mountPartial(mount, 'partials/header.html', {
      logo_href: 'index.html#hero',
      contact_href: settings.contactHref || 'index.html#contact',
      account_href: 'account.html',
      account_label: accountLabel,
      nav_home: navClass('home'),
      nav_products: navClass('products'),
      nav_courses: navClass('courses'),
      nav_account: navClass('account'),
    })
    .then(function () {
      window.PVQ_appCommon.initNavigation();
      window.PVQ_applyHeaderOffset();
    });
};

window.PVQ_injectSiteFooter = function (options) {
  var mount = document.getElementById('site-footer-mount');
  if (!mount || !window.PVQ_appCommon) return Promise.resolve();

  var settings = options || {};
  return window.PVQ_appCommon.mountPartial(mount, 'partials/footer.html', {
    contact_href: settings.contactHref || 'index.html#contact',
  });
};

window.addEventListener('resize', function () {
  if (window.PVQ_applyHeaderOffset) {
    window.PVQ_applyHeaderOffset();
  }
});
