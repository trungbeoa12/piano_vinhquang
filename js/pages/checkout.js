function checkoutFetch(path, options) {
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
          (payload && payload.message) || 'Không thể xử lý yêu cầu checkout.'
        );
        error.status = response.status;
        throw error;
      }
      return payload;
    });
  });
}

function lessonHref(course) {
  var lesson = course && Array.isArray(course.lessons) && course.lessons.length
    ? course.lessons[0]
    : null;

  if (!lesson) return 'dashboard.html';
  return (
    'lesson.html?courseId=' +
    encodeURIComponent(course.id) +
    '&lessonId=' +
    encodeURIComponent(lesson.id)
  );
}

function formatPriceVnd(amount) {
  var n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(n);
  } catch (error) {
    return n + ' VND';
  }
}

function renderCheckoutStatus(status, message) {
  var el = document.getElementById('checkout-status-mount');
  if (!el) return;

  var label = 'Sẵn sàng';
  var toneClass = 'is-idle';
  if (status === 'processing') {
    label = 'Đang xử lý';
    toneClass = 'is-processing';
  } else if (status === 'success') {
    label = 'Đang chờ xác nhận';
    toneClass = 'is-success';
  }

  el.innerHTML =
    '<div class="pvq-checkout-status ' + toneClass + '">' +
    '<span class="pvq-checkout-status__label">' + label + '</span>' +
    '<p class="pvq-muted">' +
    (message || 'Đơn hàng đã tạo, chờ admin xác nhận sau khi nhận chuyển khoản.') +
    '</p>' +
    '</div>';
}

function renderOrderSummary(course, order, checkoutData) {
  var el = document.getElementById('checkout-order-summary');
  if (!el || !course) return;

  var amount = checkoutData && checkoutData.amount !== undefined
    ? checkoutData.amount
    : order && order.price;
  var bank = (checkoutData && checkoutData.bank) || {};
  var transferCode = checkoutData && checkoutData.transferCode
    ? checkoutData.transferCode
    : (order && order.transferCode) || '—';

  el.innerHTML =
    '<dl class="pvq-sales-dl">' +
    '<dt>Khóa học</dt><dd>' + course.title + '</dd>' +
    '<dt>Số tiền</dt><dd>' + formatPriceVnd(amount) + '</dd>' +
    '<dt>Ngân hàng</dt><dd>' + (bank.bankName || 'VietinBank') + '</dd>' +
    '<dt>Số tài khoản</dt><dd>' + (bank.accountNumber || '—') + '</dd>' +
    '<dt>Chủ tài khoản</dt><dd>' + (bank.accountName || '—') + '</dd>' +
    '<dt>Nội dung CK</dt><dd><strong>' + transferCode + '</strong></dd>' +
    '<dt>Trạng thái đơn</dt><dd>' + ((order && order.status) || 'pending') + '</dd>' +
    '</dl>';
}

function renderGuestState(course) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;
  var redirectUrl = 'checkout.html?courseId=' + encodeURIComponent(course.id);
  var accountHref = 'account.html?redirect=' + encodeURIComponent(redirectUrl);

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Bước 1</p>' +
    '<h3>Đăng nhập hoặc tạo tài khoản trước</h3>' +
    '<p class="pvq-muted">Cần tài khoản để tạo đơn hàng cho khóa <strong>' +
    course.title +
    '</strong>.</p>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="' + accountHref + '" class="cta-btn cta-btn-primary">Đăng nhập</a>' +
    '<a href="register.html" class="cta-btn cta-btn-secondary">Tạo tài khoản</a>' +
    '</div>' +
    '</div>';
}

function renderUnlockedState(course) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Đã cấp quyền</p>' +
    '<h3>Khóa học đã sẵn sàng</h3>' +
    '<p class="pvq-muted">Tài khoản của bạn đã có quyền học khóa này.</p>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="' + lessonHref(course) + '" class="cta-btn cta-btn-primary">Mở bài học đầu tiên</a>' +
    '<a href="dashboard.html" class="cta-btn cta-btn-secondary">Về dashboard</a>' +
    '</div>' +
    '</div>';
}

function renderManualTransferState(course, order, checkoutData) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  var qrImage = checkoutData && checkoutData.qr && checkoutData.qr.imageUrl
    ? checkoutData.qr.imageUrl
    : '';
  var transferCode = checkoutData && checkoutData.transferCode
    ? checkoutData.transferCode
    : (order && order.transferCode) || '';

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Bước 2</p>' +
    '<h3>Chuyển khoản thủ công</h3>' +
    '<p class="pvq-muted">Quét QR hoặc chuyển khoản theo thông tin bên dưới. Sau khi chuyển, bấm nút xác nhận để hệ thống ghi nhận chờ duyệt.</p>' +
    (qrImage
      ? ('<div style="margin:12px 0"><img src="' + qrImage + '" alt="QR chuyển khoản" style="max-width:240px;border-radius:12px;border:1px solid rgba(255,255,255,0.12)"></div>')
      : '<p class="pvq-muted">QR đang được tạo...</p>') +
    '<p class="pvq-muted"><strong>Nội dung chuyển khoản:</strong> ' + transferCode + '</p>' +
    '<div class="pvq-course-access-actions">' +
    '<button type="button" id="checkout-submit-btn" class="cta-btn cta-btn-primary" style="border:none;cursor:pointer">Tôi đã chuyển khoản</button>' +
    '<a href="course-detail.html?id=' + encodeURIComponent(course.id) + '" class="cta-btn cta-btn-secondary">Quay lại khóa học</a>' +
    '</div>' +
    '<p class="pvq-muted pvq-course-access-feedback" id="checkout-feedback"></p>' +
    '</div>';

  var submitBtn = document.getElementById('checkout-submit-btn');
  var feedbackEl = document.getElementById('checkout-feedback');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', function () {
    submitBtn.disabled = true;
    if (feedbackEl) {
      feedbackEl.textContent =
        'Đã ghi nhận yêu cầu. Admin sẽ xác nhận đơn sau khi kiểm tra chuyển khoản.';
    }
    renderCheckoutStatus(
      'success',
      'Đơn đang chờ admin xác nhận. Sau khi xác nhận, bạn sẽ vào học được ngay.'
    );
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var courseId =
    window.PVQ_getQueryParam('courseId') || window.PVQ_getQueryParam('id');
  var titleEl = document.getElementById('checkout-title');
  var summaryEl = document.getElementById('checkout-summary');

  if (!courseId || !window.PVQ_Content) {
    if (titleEl) titleEl.textContent = 'Không tìm thấy khóa học';
    if (summaryEl) summaryEl.textContent = 'Thiếu courseId cho checkout.';
    return;
  }

  window.PVQ_Content.loadCourseWithLessons(courseId)
    .then(function (course) {
      document.title = 'Checkout — ' + course.title + ' — Piano Vinh Quang';
      if (titleEl) titleEl.textContent = course.title;
      if (summaryEl) {
        summaryEl.textContent =
          course.summary + ' Thanh toán chuyển khoản thủ công với QR.';
      }

      renderCheckoutStatus('idle', 'Đang kiểm tra quyền học và tạo đơn.');
      renderOrderSummary(course);

      return Promise.resolve(window.PVQ_Auth.refreshSession())
        .catch(function () {
          return null;
        })
        .then(function () {
          if (!window.PVQ_Auth.isLoggedIn()) {
            renderGuestState(course);
            return null;
          }

          return checkoutFetch('/api/courses/' + encodeURIComponent(course.id) + '/access')
            .then(function (payload) {
              if (payload.hasAccess) {
                renderUnlockedState(course);
                return null;
              }

              renderCheckoutStatus('processing', 'Đang tạo đơn hàng chuyển khoản...');
              return checkoutFetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: course.id }),
              }).then(function (body) {
                var ord = body.order || {};
                var checkoutData = body.checkout || {};
                renderOrderSummary(course, ord, checkoutData);
                renderCheckoutStatus('idle', 'Đơn đã tạo. Vui lòng chuyển khoản theo QR.');
                renderManualTransferState(course, ord, checkoutData);
              });
            })
            .catch(function (error) {
              renderCheckoutStatus('idle', error.message || 'Không thể tạo checkout.');
            });
        });
    })
    .catch(function (error) {
      if (titleEl) titleEl.textContent = 'Không thể tải checkout';
      if (summaryEl) summaryEl.textContent = 'Vui lòng kiểm tra lại dữ liệu khóa học.';
      console.error('[checkout] load failed:', error);
    });
});
