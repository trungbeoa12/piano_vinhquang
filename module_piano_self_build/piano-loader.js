/**
 * piano-loader.js — Điểm vào duy nhất để nhúng module vào site khác.
 * Hiện tại file này chỉ nhúng piano widget; score viewer đang sống riêng ở piano-studio.html.
 * Nếu sau này cần embed cả score, có thể mở rộng loader để mount thêm vùng score và nhận data-score-url.
 *
 * Cách dùng (đặt mount TRƯỚC script, hoặc dùng defer):
 *   <div id="pvq-piano-mount"></div>
 *   <script src="/đường-dẫn/module_piano_self_build/piano-loader.js" data-mount="#pvq-piano-mount" defer></script>
 *
 * Thuộc tính tùy chọn trên thẻ script:
 *   data-mount     — selector vùng chèn HTML (mặc định: #pvq-piano-mount)
 *   data-base      — URL thư mục module kết thúc bằng / (mặc định: thư mục chứa piano-loader.js)
 *   data-no-fonts  — có giá trị bất kỳ thì không inject Google Fonts (site bạn đã có font)
 */
(function () {
  'use strict';

  var TEMPLATE_HTML =
    '<div class="pvq-piano-module">' +
      '<div class="mini-player pvq-piano-widget" data-pvq-piano-root>' +
        '<div class="song-selector">' +
          '<button type="button" class="song-tab active" data-pvq-role="song-tab" data-song="0">Luyện ngón căn bản</button>' +
          '<button type="button" class="song-tab" data-pvq-role="song-tab" data-song="1">Giai điệu căn bản</button>' +
          '<button type="button" class="song-tab" data-pvq-role="song-tab" data-song="2">Bản nhạc ứng dụng</button>' +
        '</div>' +
        '<div class="player-header">' +
          '<div class="song-info">' +
            '<div class="now-playing">Đang phát</div>' +
            '<div class="song-title" data-pvq-role="song-title">Luyện ngón căn bản</div>' +
          '</div>' +
          '<div class="player-controls">' +
            '<button type="button" class="control-btn nav-btn" data-pvq-role="prev-btn" aria-label="Bài trước">‹</button>' +
            '<button type="button" class="control-btn play-btn" data-pvq-role="play-btn" aria-label="Phát hoặc tạm dừng">▶</button>' +
            '<button type="button" class="control-btn nav-btn" data-pvq-role="next-btn" aria-label="Bài sau">›</button>' +
          '</div>' +
        '</div>' +
        '<div class="progress-container">' +
          '<div class="progress-bar">' +
            '<div class="progress-fill" data-pvq-role="progress-fill"></div>' +
          '</div>' +
          '<div class="time-display">' +
            '<span data-pvq-role="current-time">0:00</span>' +
            '<span data-pvq-role="total-time">0:00</span>' +
          '</div>' +
        '</div>' +
        '<div class="mini-piano-container">' +
          '<div class="mini-piano" data-pvq-role="mini-piano"></div>' +
        '</div>' +
        '<div class="player-controls-row">' +
          '<div class="control-group speed-control">' +
            '<span class="control-label">Tốc độ</span>' +
            '<input type="range" class="control-slider" data-pvq-role="speed-slider" min="0.5" max="2" step="0.1" value="1">' +
            '<span class="control-value" data-pvq-role="speed-value">1.0x</span>' +
          '</div>' +
          '<div class="control-group">' +
            '<span class="control-label">Âm lượng</span>' +
            '<input type="range" class="control-slider" data-pvq-role="volume-slider" min="0" max="1" step="0.05" value="0.7">' +
            '<span class="control-value" data-pvq-role="volume-value">70%</span>' +
          '</div>' +
          '<div class="repeat-toggle" data-pvq-role="repeat-toggle" role="button" tabindex="0" aria-label="Lặp lại bài">' +
            '<span class="repeat-icon" aria-hidden="true">🔁</span>' +
            '<div class="toggle-switch" data-pvq-role="repeat-switch"></div>' +
          '</div>' +
        '</div>' +
        '<p class="keyboard-hint">Phím máy tính: Z–M (quãng thấp) · Q–U (quãng cao) · Space (phát / dừng)</p>' +
      '</div>' +
    '</div>';

  var GOOGLE_FONTS =
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap';
  var SCRIPT_CACHE = {};
  var LOADER_FLAG = 'data-pvq-loader-bound';

  function findLoaderScript() {
    var sc = document.currentScript;
    if (sc && sc.src) return sc;
    var all = document.querySelectorAll('script[src*="piano-loader.js"]');
    return all.length ? all[all.length - 1] : null;
  }

  function ensureTrailingSlash(url) {
    return url.endsWith('/') ? url : url + '/';
  }

  function injectCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function injectFonts() {
    injectCss(GOOGLE_FONTS);
  }

  function loadScript(src) {
    if (SCRIPT_CACHE[src]) {
      return SCRIPT_CACHE[src];
    }

    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing && existing.getAttribute(LOADER_FLAG) === 'loaded') {
      SCRIPT_CACHE[src] = Promise.resolve();
      return SCRIPT_CACHE[src];
    }

    SCRIPT_CACHE[src] = new Promise(function (resolve, reject) {
      if (existing) {
        existing.addEventListener('load', function () {
          existing.setAttribute(LOADER_FLAG, 'loaded');
          resolve();
        }, { once: true });
        existing.addEventListener('error', function () {
          reject(new Error('Không tải được: ' + src));
        }, { once: true });
        return;
      }

      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.setAttribute(LOADER_FLAG, 'pending');
      s.onload = function () {
        s.setAttribute(LOADER_FLAG, 'loaded');
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Không tải được: ' + src));
      };
      document.body.appendChild(s);
    }).catch(function (err) {
      delete SCRIPT_CACHE[src];
      throw err;
    });

    return SCRIPT_CACHE[src];
  }

  function getTemplateHtml() {
    var tplScript = document.querySelector('script[data-pvq-inline-template]');
    if (tplScript && tplScript.textContent.trim()) {
      return tplScript.textContent;
    }

    var partialScript = document.querySelector('script[type="text/x-pvq-piano-template"]');
    if (partialScript && partialScript.textContent.trim()) {
      return partialScript.textContent;
    }

    return TEMPLATE_HTML;
  }

  function createPlayer(mount) {
    var root = mount.querySelector('[data-pvq-piano-root]');
    if (!root || !window.PVQ_PianoStudioPlayer) {
      throw new Error('Thiếu [data-pvq-piano-root] hoặc PVQ_PianoStudioPlayer.');
    }
    return new window.PVQ_PianoStudioPlayer({
      root: root,
      songs: window.PVQ_PIANO_LESSONS || window.PVQ_DEMO_SONGS || [],
    });
  }

  function run() {
    var script = findLoaderScript();
    if (!script || !script.src) {
      console.error('[PVQ Piano] Không tìm thấy piano-loader.js trên trang.');
      return;
    }

    var explicitBase = script.getAttribute('data-base');
    var baseUrl = explicitBase
      ? ensureTrailingSlash(new URL(explicitBase, window.location.href).href)
      : ensureTrailingSlash(new URL('.', script.src).href);

    var mountSel = script.getAttribute('data-mount') || '#pvq-piano-mount';
    var mount = document.querySelector(mountSel);
    if (!mount) {
      console.error('[PVQ Piano] Không tìm thấy mount:', mountSel);
      return;
    }

    if (!script.hasAttribute('data-no-fonts')) {
      injectFonts();
    }

    injectCss(baseUrl + 'css/piano-widget.css');
    mount.innerHTML = getTemplateHtml();

    loadScript(baseUrl + 'js/data/piano-lessons.js')
      .then(function () {
        return loadScript(baseUrl + 'js/piano/audio-engine.js');
      })
      .then(function () {
        return loadScript(baseUrl + 'js/piano/piano-keyboard.js');
      })
      .then(function () {
        return loadScript(baseUrl + 'js/piano/piano-player.js');
      })
      .then(function () {
        mount._pvqPianoPlayer = createPlayer(mount);
      })
      .catch(function (err) {
        console.error('[PVQ Piano]', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
