(function () {
  var DEFAULT_API_BASE = 'https://pianovinhquang-production.up.railway.app';

  function ensureTag(selector, createTag) {
    if (document.head.querySelector(selector)) return;
    document.head.appendChild(createTag());
  }

  ensureTag('meta[name="pvq-api-base"]', function () {
    var meta = document.createElement('meta');
    meta.name = 'pvq-api-base';
    meta.content = String(window.PVQ_API_BASE || DEFAULT_API_BASE || '')
      .trim()
      .replace(/\/+$/, '');
    return meta;
  });

  ensureTag('meta[name="theme-color"]', function () {
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#0f1626';
    return meta;
  });

  ensureTag('link[data-pvq-fonts="true"]', function () {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap';
    link.setAttribute('data-pvq-fonts', 'true');
    return link;
  });

  ensureTag('link[href="templatemo-604-christmas-piano.css"]', function () {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'templatemo-604-christmas-piano.css';
    return link;
  });

  ensureTag('link[href="css/app-components.css"]', function () {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/app-components.css';
    return link;
  });
})();
