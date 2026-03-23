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
    if (window.OpenSheetMusicDisplay) return Promise.resolve();
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

        var osmd = new window.OpenSheetMusicDisplay(scoreRoot, {
          autoResize: true,
          drawTitle: false,
          followCursor: false,
          disableCursor: true,
        });

        return osmd.load(musicxmlUrl).then(function () {
          return osmd.render().then(function () {
            // OSMD sometimes renders asynchronously; but render() resolves when SVG is created.
            return true;
          });
        });
      })
      .catch(function (err) {
        // Không crash cả site nếu OSMD lỗi (CDN/CORS/file sai).
        console.error('[PVQ PianoScore] render failed:', err);

        var msg = String(err && err.message ? err.message : err);
        scoreRoot.innerHTML =
          '<div style=\"padding: 10px 0; color: #ffb3b3; font-size: 0.9rem; font-weight: 600;\">Không render được MusicXML.</div>' +
          '<pre style=\"margin-top: 8px; white-space: pre-wrap; color: #ffb3b3; font-size: 0.75rem; max-height: 220px; overflow: auto;\">' +
          msg +
          '</pre>';
      });
  }

  window.PVQ_PianoScoreViewer = {
    renderMusicXML: renderMusicXML,
  };
})();

