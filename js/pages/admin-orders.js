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
      console.error('[admin-orders] saveAdminKey failed:', error);
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
            (payload && payload.message) || 'Không thể tải dữ liệu admin.'
          );
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function setFeedback(message) {
    var feedbackEl = document.getElementById('admin-orders-feedback');
    if (feedbackEl) feedbackEl.textContent = message || '';
  }

  function renderOrders(items) {
    var target = document.getElementById('admin-orders-list');
    if (!target) return;

    if (!items || !items.length) {
      target.innerHTML =
        '<div class="pvq-account-empty-state"><strong>Không có đơn chờ xác nhận</strong><p class="pvq-muted">Khi học viên bấm "Tôi đã chuyển khoản", đơn sẽ xuất hiện tại đây.</p></div>';
      return;
    }

    target.innerHTML = items
      .map(function (item) {
        var user = item.user || {};
        var course = item.course || {};
        return (
          '<article class="pvq-dashboard-course-card">' +
          '<div class="pvq-dashboard-course-meta">' +
          '<h3>' + (course.title || item.courseId) + '</h3>' +
          '<p class="pvq-muted">User: ' + ((user.displayName || '') ? (user.displayName + ' - ') : '') + (user.email || item.userId) + '</p>' +
          '<p class="pvq-muted">Số tiền: ' + (item.amount || item.price || 0) + ' VND</p>' +
          '<p class="pvq-muted">Tạo lúc: ' + (item.createdAt || '—') + '</p>' +
          '<p class="pvq-dashboard-status">Trạng thái: ' + (item.status || '—') + '</p>' +
          '</div>' +
          '<div class="pvq-course-access-actions">' +
          '<button type="button" class="cta-btn cta-btn-primary admin-confirm-btn" data-order-id="' + item.id + '" style="border:none;cursor:pointer">Confirm</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    Array.prototype.slice.call(
      target.querySelectorAll('.admin-confirm-btn')
    ).forEach(function (button) {
      button.addEventListener('click', function () {
        var orderId = button.getAttribute('data-order-id');
        if (!orderId) return;
        button.disabled = true;
        setFeedback('Đang confirm đơn hàng...');

        adminFetch('/api/admin/orders/' + encodeURIComponent(orderId) + '/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })
          .then(function () {
            setFeedback('Đã confirm đơn hàng và cấp enrollment.');
            loadOrders();
          })
          .catch(function (error) {
            button.disabled = false;
            setFeedback(error.message);
          });
      });
    });
  }

  function loadOrders() {
    setFeedback('Đang tải đơn hàng...');
    return adminFetch('/api/admin/orders?status=payment_submitted')
      .then(function (payload) {
        renderOrders(payload.items || []);
        setFeedback('');
      })
      .catch(function (error) {
        renderOrders([]);
        setFeedback(error.message);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var keyInput = document.getElementById('admin-key-input');
    var saveBtn = document.getElementById('admin-key-save-btn');
    var refreshBtn = document.getElementById('admin-refresh-btn');

    if (keyInput) keyInput.value = getAdminKey();

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        saveAdminKey(keyInput ? keyInput.value : '');
        loadOrders();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        if (keyInput) saveAdminKey(keyInput.value);
        loadOrders();
      });
    }

    if (getAdminKey()) {
      loadOrders();
    } else {
      renderOrders([]);
      setFeedback('Nhập admin key để tải danh sách order.');
    }
  });
})();
