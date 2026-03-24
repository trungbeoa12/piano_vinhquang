(function () {
  function renderPageHero(mount) {
    if (!mount) return Promise.resolve();

    return window.PVQ_appCommon.mountPartial(mount, 'partials/page-hero.html', {
      badge_html: mount.dataset.badge
        ? '<span class="section-badge pvq-inline-badge">' +
          mount.dataset.badge +
          '</span>'
        : '',
      title: mount.dataset.title || '',
      lead: mount.dataset.lead || '',
    });
  }

  function renderCommonCta(mount) {
    if (!mount) return Promise.resolve();

    var secondaryHtml = '';
    if (mount.dataset.secondaryHref && mount.dataset.secondaryLabel) {
      secondaryHtml =
        '<a href="' +
        mount.dataset.secondaryHref +
        '" class="cta-btn cta-btn-secondary">' +
        mount.dataset.secondaryLabel +
        '</a>';
    }

    return window.PVQ_appCommon.mountPartial(mount, 'partials/common-cta.html', {
      badge_html: mount.dataset.badge
        ? '<span class="section-badge">' + mount.dataset.badge + '</span>'
        : '',
      title: mount.dataset.title || '',
      lead: mount.dataset.lead || '',
      primary_href: mount.dataset.primaryHref || 'index.html#contact',
      primary_label: mount.dataset.primaryLabel || 'Nhận tư vấn',
      secondary_html: secondaryHtml,
    });
  }

  function initHomePageFeatures() {
    window.PVQ_appCommon.initGallery();
    window.PVQ_appCommon.initContactForm();

    var pianoRoot = document.querySelector('#demo-piano [data-pvq-piano-root]');
    if (pianoRoot && window.PVQ_PianoStudioPlayer && window.PVQ_PIANO_LESSONS) {
      new window.PVQ_PianoStudioPlayer({
        root: pianoRoot,
        songs: window.PVQ_PIANO_LESSONS,
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;
    var navCurrent = body.dataset.navCurrent || '';
    var footerContactHref = body.dataset.footerContactHref || 'index.html#contact';

    window.PVQ_appCommon.createSnowflakes();

    var tasks = [
      window.PVQ_injectSiteHeader(navCurrent, {
        contactHref: footerContactHref,
      }),
      window.PVQ_injectSiteFooter({
        contactHref: footerContactHref,
      }),
    ];

    document.querySelectorAll('[data-site-hero]').forEach(function (mount) {
      tasks.push(renderPageHero(mount));
    });

    document.querySelectorAll('[data-site-cta]').forEach(function (mount) {
      tasks.push(renderCommonCta(mount));
    });

    Promise.all(tasks).catch(function (error) {
      console.error('[site-shell] partial render failed:', error);
    });

    if (body.dataset.page === 'home') {
      initHomePageFeatures();
    }
  });
})();
