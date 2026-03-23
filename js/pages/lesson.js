function renderLocked(message) {
  var el = document.getElementById('lesson-access-body');
  if (!el) return;
  el.innerHTML = '<div class="pvq-alert"><p>' + message + '</p></div>';
}

function ensurePianoMounted() {
  var bodyEl = document.getElementById('lesson-access-body');
  if (!bodyEl) return;

  // Nhúng piano module (MusicXML + MIDI) vào bài học.
  // Demo file nằm trong module: assets/scores/waltz-in-a-minorchopin.(xml|mid)
  var mountEl = document.getElementById('pvq-piano-mount');
  if (!mountEl) {
    var pianoMountHtml =
      '<div style="margin: 18px 0 26px;">' +
      '<div id="pvq-piano-mount" ' +
      'data-pvq-score-musicxml="assets/scores/waltz-in-a-minorchopin.xml" ' +
      'data-pvq-score-midi="assets/scores/waltz-in-a-minorchopin.mid">' +
      '</div>' +
      '</div>';
    bodyEl.insertAdjacentHTML('afterbegin', pianoMountHtml);
  }

  // Loader sẽ tự render UI + sheet.
  var existingScript = bodyEl.querySelector(
    'script[src=\"module_piano_self_build/piano-loader.js\"]'
  );
  if (!existingScript) {
    var s = document.createElement('script');
    s.src = 'module_piano_self_build/piano-loader.js';
    s.setAttribute('data-mount', '#pvq-piano-mount');
    bodyEl.appendChild(s);
  }
}

function renderLessonContent(data) {
  var bodyEl = document.getElementById('lesson-access-body');
  if (!bodyEl) return;

  var itemsHtml = data.items
    .map(function (item) {
      if (!item.url) {
        return (
          '<div class="pvq-resource-item"><div><strong>' +
          item.title +
          '</strong><div class="pvq-resource-kind">' +
          item.kind +
          '</div></div><span class="pvq-muted">Chưa cấu hình URL</span></div>'
        );
      }
      return (
        '<div class="pvq-resource-item"><div><strong>' +
        item.title +
        '</strong><div class="pvq-resource-kind">' +
        item.kind +
        '</div></div><a href="' +
        item.url +
        '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở</a></div>'
      );
    })
    .join('');

  bodyEl.innerHTML =
    '<p class="pvq-muted" style="margin-bottom:16px">Học liệu được lưu trên Google Drive / tài liệu đi kèm. Chỉ chia sẻ trong phạm vi học viên.</p>' +
    '<div class="pvq-resource-list">' +
    itemsHtml +
    '</div>';

  ensurePianoMounted();
}

document.addEventListener('DOMContentLoaded', function () {
  var courseId = window.PVQ_getQueryParam('courseId');
  var lessonId = window.PVQ_getQueryParam('lessonId');

  if (!courseId || !lessonId) {
    renderLocked('Thiếu tham số khóa học hoặc bài học.');
    ensurePianoMounted();
    return;
  }

  var found = window.PVQ_findLesson(courseId, lessonId);
  if (!found) {
    renderLocked('Không tìm thấy bài học.');
    ensurePianoMounted();
    return;
  }

  var titleEl = document.getElementById('lesson-title');
  var subEl = document.getElementById('lesson-subtitle');
  if (titleEl) titleEl.textContent = found.lesson.title;
  if (subEl) {
    subEl.textContent =
      found.course.title + ' — ' + found.lesson.durationMin + ' phút';
  }
  document.title = found.lesson.title + ' — Piano Vinh Quang';

  if (!window.PVQ_Auth.isLoggedIn()) {
    renderLocked(
      '<strong>Cần đăng nhập.</strong> Vui lòng vào trang Tài khoản để đăng nhập (demo), sau đó quay lại bài học này.'
    );
    ensurePianoMounted();
    return;
  }

  if (!window.PVQ_Auth.hasCourseAccess(courseId)) {
    renderLocked(
      '<strong>Chưa có quyền truy cập khóa học này.</strong> Sau khi mua khóa, quản trị viên sẽ cấp quyền trong hệ thống (ở bản demo: dùng nút đăng nhập thử để xem luồng).'
    );
    ensurePianoMounted();
    return;
  }

  var s = document.createElement('script');
  s.src = 'js/data/course-resources-private.js';
  s.onload = function () {
    var merged = window.PVQ_mergeLessonResources(courseId, lessonId);
    if (!merged) {
      renderLocked('Không tải được học liệu.');
      return;
    }
    renderLessonContent(merged);
  };
  s.onerror = function () {
    renderLocked('Không tải được cấu hình học liệu. Kiểm tra đường dẫn file.');
  };
  document.body.appendChild(s);
});
