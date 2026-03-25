(function () {
  var STORAGE_KEY = 'pvq_admin_key';

  function getAdminKey() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function adminFetch(path, options) {
    var requestOptions = options || {};
    requestOptions.headers = Object.assign({}, requestOptions.headers || {}, {
      'x-admin-key': getAdminKey(),
    });
    var endpoint = window.PVQ_withApiBase
      ? window.PVQ_withApiBase(path)
      : path;

    return fetch(endpoint, requestOptions).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok || !payload.ok) {
          var error = new Error(
            (payload && payload.message) || 'Không thể tải dữ liệu khóa học.'
          );
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function getCourseIdFromPath() {
    if (window.PVQ_getQueryParam) {
      var queryCourseId = window.PVQ_getQueryParam('courseId');
      if (queryCourseId) return queryCourseId;
    }
    var pathname = String(window.location.pathname || '');
    var parts = pathname.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function setFeedback(message) {
    var feedbackEl = document.getElementById('admin-course-content-feedback');
    if (feedbackEl) feedbackEl.textContent = message || '';
  }

  function setEditorFeedback(message) {
    var feedbackEl = document.getElementById('admin-lesson-editor-feedback');
    if (feedbackEl) feedbackEl.textContent = message || '';
  }

  function renderSummary(item) {
    var titleEl = document.getElementById('admin-course-content-title');
    var copyEl = document.getElementById('admin-course-content-copy');
    var target = document.getElementById('admin-course-summary');
    if (!target) return;

    if (!item) {
      if (titleEl) titleEl.textContent = 'Không tìm thấy khóa học';
      if (copyEl) copyEl.textContent = 'Khóa học này không tồn tại trong content JSON hiện tại.';
      target.innerHTML = '';
      return;
    }

    if (titleEl) titleEl.textContent = item.title || item.id;
    if (copyEl) {
      copyEl.textContent =
        item.shortDescription ||
        'Đây là tổng quan khóa học trước khi đi tới bước sửa lesson và cập nhật link học liệu.';
    }

    target.innerHTML =
      '<div class="pvq-account-meta-list">' +
      '<div class="pvq-account-meta-item"><span>ID / slug</span><strong>' + (item.slug || item.id || '—') + '</strong></div>' +
      '<div class="pvq-account-meta-item"><span>Trạng thái</span><strong>' + (item.isPublished ? 'published' : 'draft') + '</strong></div>' +
      '<div class="pvq-account-meta-item"><span>Số lesson</span><strong>' + (item.lessonCount || 0) + '</strong></div>' +
      '<div class="pvq-account-meta-item"><span>Level</span><strong>' + (item.level || '—') + '</strong></div>' +
      '<div class="pvq-account-meta-item"><span>Thời lượng</span><strong>' + ((item.durationWeeks || 0) ? item.durationWeeks + ' tuần' : '—') + '</strong></div>' +
      '<div class="pvq-account-meta-item"><span>Giá</span><strong>' + (item.priceLabel || '—') + '</strong></div>' +
      '</div>' +
      '<p class="pvq-muted" style="margin-top:18px">' + (item.summary || 'Chưa có summary.') + '</p>';
  }

  function renderLessons(item) {
    var target = document.getElementById('admin-course-lessons-list');
    if (!target) return;

    var lessons = item && Array.isArray(item.lessons) ? item.lessons : [];
    if (!lessons.length) {
      target.innerHTML =
        '<div class="pvq-account-empty-state"><strong>Chưa có lesson</strong><p class="pvq-muted">Khóa học này hiện chưa có lesson trong content JSON.</p></div>';
      return;
    }

    target.innerHTML = lessons
      .map(function (lesson) {
        var description = lesson.description || 'Chưa có mô tả cho lesson này.';
        return (
          '<article class="pvq-dashboard-course-card">' +
          '<div class="pvq-dashboard-course-meta">' +
          '<h3>' + (lesson.order || 0) + '. ' + (lesson.title || lesson.id) + '</h3>' +
          '<p class="pvq-muted">Lesson ID: ' + (lesson.id || '—') + '</p>' +
          '<p class="pvq-muted">' + description + '</p>' +
          '<p class="pvq-muted">Thời lượng: ' + ((lesson.durationMin || 0) ? lesson.durationMin + ' phút' : '—') + '</p>' +
          '<p class="pvq-muted">Số resource: ' + (lesson.resourceCount || 0) + '</p>' +
          '<p class="pvq-dashboard-status">Trạng thái: ' + (lesson.status || 'draft') + (lesson.isPreview ? ' • preview' : '') + '</p>' +
          '</div>' +
          '<div class="pvq-course-access-actions">' +
          '<button type="button" class="cta-btn cta-btn-secondary admin-lesson-edit-btn" data-lesson-id="' + lesson.id + '">Sửa nội dung</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    Array.prototype.slice.call(
      target.querySelectorAll('.admin-lesson-edit-btn')
    ).forEach(function (button) {
      button.addEventListener('click', function () {
        var lessonId = button.getAttribute('data-lesson-id');
        if (!lessonId) return;
        loadLessonEditor(lessonId);
      });
    });
  }

  function getEditorCourseId() {
    return getCourseIdFromPath();
  }

  function setEditorLoadingState(isLoading) {
    var saveBtn = document.getElementById('admin-lesson-save-btn');
    if (saveBtn) saveBtn.disabled = !!isLoading;
  }

  function populateLessonEditor(item) {
    var form = document.getElementById('admin-lesson-editor-form');
    var titleEl = document.getElementById('admin-lesson-editor-title');
    if (form) form.style.display = item ? '' : 'none';
    if (titleEl) {
      titleEl.textContent = item
        ? 'Sửa lesson: ' + (item.title || item.id)
        : 'Chọn một lesson để sửa';
    }
    if (!item) return;

    form.dataset.lessonId = item.id || '';
    document.getElementById('admin-lesson-title').value = item.title || '';
    document.getElementById('admin-lesson-description').value = item.description || '';
    document.getElementById('admin-lesson-duration').value = item.durationMin || 0;
    document.getElementById('admin-lesson-status').value = item.status || 'draft';
    document.getElementById('admin-lesson-video-link').value = item.videoLink || '';
    document.getElementById('admin-lesson-musicxml-link').value = item.musicxmlLink || '';
    document.getElementById('admin-lesson-midi-link').value = item.midiLink || '';
  }

  function loadLessonEditor(lessonId) {
    var courseId = getEditorCourseId();
    if (!courseId || !lessonId) return Promise.resolve();

    setEditorFeedback('Đang tải lesson...');
    return adminFetch(
      '/api/admin/courses/' +
        encodeURIComponent(courseId) +
        '/lessons/' +
        encodeURIComponent(lessonId)
    )
      .then(function (payload) {
        populateLessonEditor(payload.item || null);
        setEditorFeedback('');
      })
      .catch(function (error) {
        populateLessonEditor(null);
        setEditorFeedback(error.message);
      });
  }

  function bindLessonEditorForm() {
    var form = document.getElementById('admin-lesson-editor-form');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var courseId = getEditorCourseId();
      var lessonId = form.dataset.lessonId || '';
      if (!courseId || !lessonId) {
        setEditorFeedback('Chưa chọn lesson để sửa.');
        return;
      }

      setEditorLoadingState(true);
      setEditorFeedback('Đang lưu lesson...');

      adminFetch(
        '/api/admin/courses/' +
          encodeURIComponent(courseId) +
          '/lessons/' +
          encodeURIComponent(lessonId),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: document.getElementById('admin-lesson-title').value,
            description: document.getElementById('admin-lesson-description').value,
            durationMin: Number(document.getElementById('admin-lesson-duration').value || 0),
            status: document.getElementById('admin-lesson-status').value,
            videoLink: document.getElementById('admin-lesson-video-link').value,
            musicxmlLink: document.getElementById('admin-lesson-musicxml-link').value,
            midiLink: document.getElementById('admin-lesson-midi-link').value,
          }),
        }
      )
        .then(function (payload) {
          populateLessonEditor(payload.item || null);
          setEditorFeedback('Đã lưu lesson thành công.');
          return loadCourseDetail();
        })
        .catch(function (error) {
          setEditorFeedback(error.message);
        })
        .finally(function () {
          setEditorLoadingState(false);
        });
    });
  }

  function loadCourseDetail() {
    var courseId = getCourseIdFromPath();
    if (!courseId) {
      renderSummary(null);
      renderLessons(null);
      setFeedback('Thiếu courseId trên URL.');
      return Promise.resolve();
    }

    setFeedback('Đang tải khóa học và lesson...');
    return adminFetch('/api/admin/courses/' + encodeURIComponent(courseId))
      .then(function (payload) {
        renderSummary(payload.item || null);
        renderLessons(payload.item || null);
        setFeedback('');
      })
      .catch(function (error) {
        renderSummary(null);
        renderLessons(null);
        setFeedback(error.message);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindLessonEditorForm();
    if (!getAdminKey()) {
      renderSummary(null);
      renderLessons(null);
      setFeedback('Chưa có admin key. Vào /admin/courses để lưu admin key trước.');
      return;
    }

    loadCourseDetail();
  });
})();
