(function () {
  var STORAGE_KEY = 'pvq_admin_key';

  function getAdminKey() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function saveAdminKey(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value || '').trim());
    } catch (error) {
      console.error('[admin-courses] saveAdminKey failed:', error);
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
            (payload && payload.message) || 'Không thể tải danh sách khóa học.'
          );
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function setFeedback(message) {
    var feedbackEl = document.getElementById('admin-courses-feedback');
    if (feedbackEl) feedbackEl.textContent = message || '';
  }

  function renderCourses(items) {
    var target = document.getElementById('admin-courses-list');
    if (!target) return;

    if (!items || !items.length) {
      target.innerHTML =
        '<div class="pvq-account-empty-state"><strong>Chưa có khóa học</strong><p class="pvq-muted">Khi dữ liệu khóa học có trong content JSON, chúng sẽ xuất hiện tại đây.</p></div>';
      return;
    }

    target.innerHTML = items
      .map(function (item) {
        var description = item.shortDescription || 'Chưa có mô tả ngắn.';
        var publishLabel = item.isPublished ? 'published' : 'draft';
        return (
          '<article class="pvq-dashboard-course-card">' +
          '<div class="pvq-dashboard-course-meta">' +
          '<h3>' + (item.title || item.id) + '</h3>' +
          '<p class="pvq-muted">ID/Slug: ' + (item.slug || item.id) + '</p>' +
          '<p class="pvq-muted">' + description + '</p>' +
          '<p class="pvq-muted">Số lesson: ' + (item.lessonCount || 0) + '</p>' +
          '<p class="pvq-dashboard-status">Trạng thái: ' + publishLabel + '</p>' +
          '</div>' +
          '<div class="pvq-course-access-actions">' +
          '<a href="/admin/courses/' + encodeURIComponent(item.id) + '" class="cta-btn cta-btn-primary">Xem lessons</a>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  function loadCourses() {
    setFeedback('Đang tải danh sách khóa học...');
    return adminFetch('/api/admin/courses')
      .then(function (payload) {
        renderCourses(payload.items || []);
        setFeedback('');
      })
      .catch(function (error) {
        renderCourses([]);
        setFeedback(error.message);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var keyInput = document.getElementById('admin-courses-key-input');
    var saveBtn = document.getElementById('admin-courses-save-btn');
    var refreshBtn = document.getElementById('admin-courses-refresh-btn');

    if (keyInput) keyInput.value = getAdminKey();

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        saveAdminKey(keyInput ? keyInput.value : '');
        loadCourses();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        if (keyInput) saveAdminKey(keyInput.value);
        loadCourses();
      });
    }

    if (getAdminKey()) {
      loadCourses();
    } else {
      renderCourses([]);
      setFeedback('Nhập admin key để tải danh sách khóa học.');
    }
  });
})();
