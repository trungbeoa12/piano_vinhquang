/**
 * piano-score-viewer.js — render MusicXML (.xml/.musicxml) bằng OSMD.
 * Vanllia JS; chỉ hoạt động khi loader truyền musicxmlUrl vào.
 */
(function () {
  'use strict';

  var OSMD_SCRIPT_URL =
    'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.7.6/build/opensheetmusicdisplay.min.js';
  var OSMD_CSS_URL =
    'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.7.6/build/opensheetmusicdisplay.css';

  var osmdLibPromise = null;

  function injectCSSOnce(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadOsmdLib() {
    if (
      window.OpenSheetMusicDisplay ||
      (window.opensheetmusicdisplay &&
        window.opensheetmusicdisplay.OpenSheetMusicDisplay)
    ) {
      return Promise.resolve();
    }
    if (osmdLibPromise) return osmdLibPromise;

    injectCSSOnce(OSMD_CSS_URL);

    osmdLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = OSMD_SCRIPT_URL;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Không tải được OSMD từ CDN.'));
      };
      document.body.appendChild(s);
    });

    return osmdLibPromise;
  }

  function renderMusicXML(scoreRoot, musicxmlUrl) {
    if (!scoreRoot) return Promise.resolve();
    if (!musicxmlUrl) return Promise.resolve();

    return loadOsmdLib()
      .then(function () {
        // Clear old render + show status (help debugging when CDN/CORS fails).
        scoreRoot.innerHTML =
          '<div style=\"padding: 10px 0; color: #b5bdd0; font-size: 0.9rem;\">Đang render sheet nhạc...</div>';

        var OpenSheetMusicDisplayCtor =
          window.OpenSheetMusicDisplay ||
          (window.opensheetmusicdisplay &&
            window.opensheetmusicdisplay.OpenSheetMusicDisplay);

        if (!OpenSheetMusicDisplayCtor) {
          throw new Error(
            'OSMD không có OpenSheetMusicDisplay constructor. ' +
              'Kiểm tra window.OpenSheetMusicDisplay và window.opensheetmusicdisplay.'
          );
        }

        var osmd = new OpenSheetMusicDisplayCtor(scoreRoot, {
          autoResize: true,
          drawTitle: false,
          followCursor: false,
          disableCursor: true,
          // OSMD dark mode giúp đổi màu nốt/chữ sang sáng để nhìn rõ trên nền tối.
          darkMode: true,
        });

        return osmd.load(musicxmlUrl).then(function () {
          var renderResult = osmd.render();
          return Promise.resolve(renderResult);
        });
      })
      .catch(function (err) {
        // Không crash cả site nếu OSMD lỗi (CDN/CORS/file sai).
        console.error('[PVQ PianoScore] render failed:', err);

        var msg = String(err && err.message ? err.message : err);
        var debugA = typeof window.OpenSheetMusicDisplay;
        var debugB = window.opensheetmusicdisplay
          ? Object.keys(window.opensheetmusicdisplay).join(',')
          : 'no-window.opensheetmusicdisplay';
        scoreRoot.innerHTML =
          '<div style=\"padding: 10px 0; color: #ffb3b3; font-size: 0.9rem; font-weight: 600;\">Không render được MusicXML.</div>' +
          '<pre style=\"margin-top: 8px; white-space: pre-wrap; color: #ffb3b3; font-size: 0.75rem; max-height: 220px; overflow: auto;\">' +
          msg +
          '\\n\\n' +
          'debug: typeof OpenSheetMusicDisplay=' +
          debugA +
          '\\n' +
          'debug: opensheetmusicdisplay keys=' +
          debugB +
          '</pre>';
      });
  }

  window.PVQ_PianoScoreViewer = {
    renderMusicXML: renderMusicXML,
  };
})();

