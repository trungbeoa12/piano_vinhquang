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

function ensurePianoMounted(options) {
  var playerCol = getPlayerColumn();
  if (!playerCol) return;
  var settings = options || {};
  var musicxmlUrl = settings.musicxmlUrl || '';
  var midiUrl = settings.midiUrl || '';
  var lessonTitle = settings.lessonTitle || '';

  // Đồng bộ title trong piano widget với bài học hiện tại.
  // Widget hiện dùng PVQ_PIANO_LESSONS làm nguồn data cho UI (tabs + now-playing),
  // nên ta chỉ thay title, giữ nguyên notes để không làm hỏng luồng phát nhạc.
  if (lessonTitle) {
    try {
      var baseSongs = window.PVQ_PIANO_LESSONS;
      if (Array.isArray(baseSongs) && baseSongs.length) {
        window.PVQ_PIANO_LESSONS = baseSongs.map(function (s) {
          return {
            title: lessonTitle,
            notes: Array.isArray(s && s.notes) ? s.notes : [],
          };
        });
      }
    } catch (e) {
      // Không để piano lỗi làm gãy trang lesson.
      // eslint-disable-next-line no-console
      console.warn('[lesson] failed to sync piano song titles: ' + e.message);
    }
  }

  var mountEl = document.getElementById('pvq-piano-mount');
  if (!mountEl) {
    var scoreAttrs = '';
    if (musicxmlUrl) {
      scoreAttrs +=
        ' data-pvq-score-musicxml="' +
        String(musicxmlUrl).replace(/"/g, '&quot;') +
        '"';
    }
    if (midiUrl) {
      scoreAttrs +=
        ' data-pvq-score-midi="' +
        String(midiUrl).replace(/"/g, '&quot;') +
        '"';
    }
    var pianoMountHtml =
      '<div class="pvq-lesson-piano-wrap">' +
      '<div id="pvq-piano-mount"' + scoreAttrs + '>' +
      '</div>' +
      '</div>';
    playerCol.insertAdjacentHTML('afterbegin', pianoMountHtml);
    mountEl = document.getElementById('pvq-piano-mount');
  }

  if (mountEl) {
    if (musicxmlUrl) {
      mountEl.setAttribute('data-pvq-score-musicxml', musicxmlUrl);
    } else {
      mountEl.removeAttribute('data-pvq-score-musicxml');
    }

    if (midiUrl) {
      mountEl.setAttribute('data-pvq-score-midi', midiUrl);
    } else {
      mountEl.removeAttribute('data-pvq-score-midi');
    }
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
  function normalizeResourceUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (window.PVQ_withApiBase) return window.PVQ_withApiBase(url);
    return url;
  }
  var resolvedItems = Array.isArray(data.items) ? data.items : [];
  var resolvedVideo = resolvedItems.find(function (item) {
    return item && item.kind === 'video' && item.url;
  });
  var resolvedSheet = resolvedItems.find(function (item) {
    return item && (item.kind === 'sheet' || item.kind === 'pdf') && item.url;
  });
  var resolvedAudio = resolvedItems.find(function (item) {
    return item && (item.kind === 'audio' || item.kind === 'midi') && item.url;
  });
  var resolvedInlineSheet = resolvedItems.find(function (item) {
    return item && (item.kind === 'sheet' || item.kind === 'pdf') && item.inlineUrl;
  });
  var resolvedInlineMidi = resolvedItems.find(function (item) {
    return item && item.kind === 'midi' && item.inlineUrl;
  });
  // Chỉ hiển thị các nút “mở tài nguyên” thật sự có URL resolve được từ backend.
  // Tránh render thêm danh sách resource raw gây trùng/lộ metadata kỹ thuật.
  var videoUrl = normalizeResourceUrl(
    (resolvedVideo && resolvedVideo.url) || lesson.videoUrl || ''
  );
  var sheetUrl = normalizeResourceUrl(
    (resolvedSheet && resolvedSheet.url) || lesson.sheetUrl || ''
  );
  var audioUrl = normalizeResourceUrl(
    (resolvedAudio && resolvedAudio.url) || lesson.audioUrl || ''
  );

  var videoHtml = videoUrl
    ? '<div class="pvq-resource-item"><div><strong>Video</strong></div><a href="' +
      videoUrl +
      '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở video</a></div>'
    : '';
  var sheetHtml = sheetUrl
    ? '<div class="pvq-resource-item"><div><strong>Sheet nhạc</strong></div><a href="' +
      sheetUrl +
      '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở sheet</a></div>'
    : '';
  var audioHtml = audioUrl
    ? '<div class="pvq-resource-item"><div><strong>Audio</strong></div><a href="' +
      audioUrl +
      '" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-secondary" style="min-height:44px;padding:10px 18px;font-size:0.88rem">Mở audio</a></div>'
    : '';

  var hasAnyResource = !!(videoUrl || sheetUrl || audioUrl);
  sideEl.innerHTML =
    '<p class="pvq-muted" style="margin-bottom:16px">Bạn có thể mở tài nguyên của bài học ở đây. Phần sheet sẽ được render trực tiếp khi MusicXML sẵn sàng.</p>' +
    '<div class="pvq-resource-list">' +
    (hasAnyResource
      ? videoHtml + sheetHtml + audioHtml
      : '<div class="pvq-muted">Bài học này hiện chưa có tài nguyên để mở.</div>') +
    '</div>';

  ensurePianoMounted({
    musicxmlUrl: normalizeResourceUrl(
      resolvedInlineSheet ? resolvedInlineSheet.inlineUrl : ''
    ),
    midiUrl: normalizeResourceUrl(
      resolvedInlineMidi ? resolvedInlineMidi.inlineUrl : ''
    ),
    lessonTitle: lesson.title,
  });
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
        return null;
      }

      return loadProtectedLesson(courseId, lessonId);
    })
    .then(function (payload) {
      if (!payload) return;
      if (!payload.ok || !payload.course || !payload.lesson) {
        renderLocked('Không tìm thấy bài học.');
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
    });
});
