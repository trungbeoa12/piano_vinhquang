function getPlayerColumn() {
  return document.getElementById('lesson-player-column');
}

function getSidebarColumn() {
  return document.getElementById('lesson-sidebar-column');
}

function renderLocked(message) {
  var playerCol = getPlayerColumn();
  var sideCol = getSidebarColumn();
  if (sideCol) sideCol.innerHTML = '';
  if (!playerCol) return;
  playerCol.innerHTML = '<div class="pvq-alert"><p>' + message + '</p></div>';
}

function ensurePianoMounted() {
  var playerCol = getPlayerColumn();
  if (!playerCol) return;

  var mountEl = document.getElementById('pvq-piano-mount');
  if (!mountEl) {
    var pianoMountHtml =
      '<div class="pvq-lesson-piano-wrap">' +
      '<div id="pvq-piano-mount" ' +
      'data-pvq-score-musicxml="assets/scores/waltz-in-a-minorchopin.musicxml" ' +
      'data-pvq-score-midi="assets/scores/waltz-in-a-minorchopin.mid">' +
      '</div>' +
      '</div>';
    playerCol.insertAdjacentHTML('afterbegin', pianoMountHtml);
  }

  var existingScript = playerCol.querySelector(
    'script[src*="module_piano_self_build/piano-loader.js"]'
  );
  if (!existingScript) {
    var s = document.createElement('script');
    s.src = 'module_piano_self_build/piano-loader.js';
    s.setAttribute('data-mount', '#pvq-piano-mount');
    playerCol.appendChild(s);
  }
}

function renderLessonContent(data) {
  var sideEl = getSidebarColumn();
  if (!sideEl) return;

  var lesson = data.lesson || {};
  var statusLabel = lesson.status || 'placeholder';
  var videoHtml = lesson.videoUrl
    ? '<div class="pvq-resource-item"><div><strong>Video bài học</strong><div class="pvq-resource-kind">' +
      statusLabel +
      '</div></div><a href="' +
      lesson.videoUrl +
      '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở video</a></div>'
    : '<div class="pvq-resource-item"><div><strong>Video bài học</strong><div class="pvq-resource-kind">' +
      statusLabel +
      '</div></div><span class="pvq-muted">Video sẽ được cập nhật sau</span></div>';
  var sheetHtml = lesson.sheetUrl
    ? '<div class="pvq-resource-item"><div><strong>Sheet nhạc</strong><div class="pvq-resource-kind">' +
      statusLabel +
      '</div></div><a href="' +
      lesson.sheetUrl +
      '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở sheet</a></div>'
    : '<div class="pvq-resource-item"><div><strong>Sheet nhạc</strong><div class="pvq-resource-kind">' +
      statusLabel +
      '</div></div><span class="pvq-muted">Sheet sẽ được cập nhật sau</span></div>';
  var audioHtml = lesson.audioUrl
    ? '<div class="pvq-resource-item"><div><strong>Audio luyện tập</strong><div class="pvq-resource-kind">' +
      statusLabel +
      '</div></div><a href="' +
      lesson.audioUrl +
      '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở audio</a></div>'
    : '<div class="pvq-resource-item"><div><strong>Audio luyện tập</strong><div class="pvq-resource-kind">' +
      statusLabel +
      '</div></div><span class="pvq-muted">Audio sẽ được cập nhật sau</span></div>';
  var itemsHtml = (Array.isArray(data.items) ? data.items : [])
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

  sideEl.innerHTML =
    '<p class="pvq-muted" style="margin-bottom:16px">Bài học có thể đang ở trạng thái placeholder. Bạn vẫn có thể theo dõi flow học, tiến độ và mở tài nguyên ngay khi URL thật được cập nhật.</p>' +
    '<div class="pvq-resource-list">' +
    videoHtml +
    sheetHtml +
    audioHtml +
    itemsHtml +
    '</div>';

  ensurePianoMounted();
}

function fetchAuthJson(path, options) {
  var requestOptions = options || {};
  requestOptions.headers = Object.assign({}, requestOptions.headers || {}, {
    Authorization: 'Bearer ' + window.PVQ_Auth.getToken(),
  });

  var endpoint = window.PVQ_withApiBase
    ? window.PVQ_withApiBase(path)
    : path;
  return fetch(endpoint, requestOptions).then(function (response) {
    return response.json().then(function (payload) {
      if (!response.ok || !payload.ok) {
        var error = new Error(
          (payload && payload.message) || 'Không thể xử lý yêu cầu.'
        );
        error.status = response.status;
        throw error;
      }
      return payload;
    });
  });
}

function renderProgressCard(found, progressItem) {
  var mount = document.getElementById('lesson-progress-mount');
  if (!mount || !found || !found.lesson) return;

  var lessonOrder = Array.isArray(found.course.lessonOrder)
    ? found.course.lessonOrder
    : [];
  var currentIndex = lessonOrder.indexOf(found.lesson.id);
  var nextLessonId =
    currentIndex !== -1 && currentIndex < lessonOrder.length - 1
      ? lessonOrder[currentIndex + 1]
      : '';
  var nextLessonHref = nextLessonId
    ? 'lesson.html?courseId=' +
      encodeURIComponent(found.course.id) +
      '&lessonId=' +
      encodeURIComponent(nextLessonId)
    : 'dashboard.html';
  var completed = !!(progressItem && progressItem.completed);
  var statusLabel = completed ? 'Đã hoàn thành bài này' : 'Đang học';
  var actionLabel = completed ? 'Đã hoàn thành' : 'Đánh dấu đã học xong';

  mount.innerHTML =
    '<div class="pvq-lesson-progress-card">' +
    '<div><strong>' + statusLabel + '</strong><p class="pvq-muted">Tiến độ của bài học này được lưu theo tài khoản để bạn tiếp tục học trên dashboard.</p></div>' +
    '<div class="pvq-course-access-actions">' +
    '<button type="button" id="lesson-complete-btn" class="cta-btn cta-btn-primary" style="border:none;cursor:pointer" ' +
    (completed ? 'disabled' : '') +
    '>' + actionLabel + '</button>' +
    '<a href="' + nextLessonHref + '" class="cta-btn cta-btn-secondary">' +
    (nextLessonId ? 'Bài tiếp theo' : 'Về dashboard') +
    '</a>' +
    '</div>' +
    '<p class="pvq-muted pvq-course-access-feedback" id="lesson-progress-feedback"></p>' +
    '</div>';
}

function saveLessonProgress(courseId, lessonId, payload) {
  return fetchAuthJson(
    '/api/courses/' +
      encodeURIComponent(courseId) +
      '/lessons/' +
      encodeURIComponent(lessonId) +
      '/progress',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    }
  );
}

function bindProgressAction(found, progressItem) {
  renderProgressCard(found, progressItem);

  var button = document.getElementById('lesson-complete-btn');
  var feedbackEl = document.getElementById('lesson-progress-feedback');
  if (!button || button.disabled) return;

  button.addEventListener('click', function () {
    button.disabled = true;
    if (feedbackEl) feedbackEl.textContent = 'Đang lưu tiến độ...';

    saveLessonProgress(found.course.id, found.lesson.id, {
      completed: true,
      resumeAtSec: 0,
    })
      .then(function (payload) {
        renderProgressCard(found, payload.item);
        if (feedbackEl) feedbackEl.textContent = 'Đã đánh dấu hoàn thành bài học.';
      })
      .catch(function (error) {
        if (feedbackEl) feedbackEl.textContent = error.message;
        button.disabled = false;
      });
  });
}

function loadProtectedLesson(courseId, lessonId) {
  return fetchAuthJson(
    '/api/courses/' +
      encodeURIComponent(courseId) +
      '/lessons/' +
      encodeURIComponent(lessonId)
  );
}

document.addEventListener('DOMContentLoaded', async function () {
  var courseId = window.PVQ_getQueryParam('courseId');
  var lessonId = window.PVQ_getQueryParam('lessonId');
  var bc = document.getElementById('lesson-breadcrumb');

  if (!courseId || !lessonId) {
    renderLocked('Thiếu tham số khóa học hoặc bài học.');
    ensurePianoMounted();
    return;
  }

  Promise.resolve(window.PVQ_Auth.refreshSession())
    .catch(function () {
      return null;
    })
    .then(function () {
      if (!window.PVQ_Auth.isLoggedIn()) {
        renderLocked(
          '<strong>Cần đăng nhập.</strong> Vui lòng vào trang Tài khoản để đăng nhập, sau đó quay lại bài học này.'
        );
        ensurePianoMounted();
        return null;
      }

      return loadProtectedLesson(courseId, lessonId);
    })
    .then(function (payload) {
      if (!payload) return;
      if (!payload.ok || !payload.course || !payload.lesson) {
        renderLocked('Không tìm thấy bài học.');
        ensurePianoMounted();
        return;
      }

	      var found = {
	        course: payload.course,
	        lesson: payload.lesson,
	        items: Array.isArray(payload.items) ? payload.items : [],
	      };

      var titleEl = document.getElementById('lesson-title');
      var subEl = document.getElementById('lesson-subtitle');
      if (titleEl) titleEl.textContent = found.lesson.title;
      if (subEl) {
        var parts = [
          found.course.title,
          String(found.lesson.durationMin || 0) + ' phút',
          found.lesson.status ? ('trạng thái: ' + found.lesson.status) : '',
        ].filter(Boolean);
        subEl.textContent = parts.join(' — ');
      }
      if (bc) {
        bc.innerHTML =
          '<a href="course-detail.html?id=' +
          encodeURIComponent(courseId) +
          '" style="color:inherit">' +
          found.course.title +
          '</a> / ' +
          found.lesson.title;
	      }
	      document.title = found.lesson.title + ' — Piano Vinh Quang';
        Promise.resolve(
          saveLessonProgress(found.course.id, found.lesson.id, {
            completed: false,
            resumeAtSec: 0,
          })
        )
          .catch(function () {
            return { item: null };
          })
          .then(function (progressPayload) {
            bindProgressAction(found, progressPayload ? progressPayload.item : null);
          });
	      renderLessonContent(found);
	    })
    .catch(function (error) {
      if (error && error.status === 403) {
        renderLocked(
          '<strong>Chưa có quyền truy cập khóa học này.</strong> Tài khoản hiện tại chưa được cấp quyền học khóa này.'
        );
      } else if (error && error.status === 404) {
        renderLocked('Không tìm thấy bài học.');
      } else {
        renderLocked('Không thể tải dữ liệu bài học từ server.');
      }
      ensurePianoMounted();
    });
});
