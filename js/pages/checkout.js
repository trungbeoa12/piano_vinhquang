function checkoutFetch(path, options) {
  var requestOptions = options || {};
  requestOptions.headers = Object.assign({}, requestOptions.headers || {}, {
    Authorization: 'Bearer ' + window.PVQ_Auth.getToken(),
  });

  return fetch(path, requestOptions).then(function (response) {
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

function formatCheckoutTime(date) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return date.toISOString();
  }
}

function createDemoOrderMeta(course, method) {
  var now = new Date();
  var dateCode = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  var timeCode = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  return {
    orderCode:
      'PVQ-DEMO-' +
      String(course.id || 'COURSE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) +
      '-' +
      dateCode +
      '-' +
      timeCode,
    paidAt: now,
    method: method || 'bank',
  };
}

function getMethodLabel(method) {
  if (method === 'momo') return 'Vi dien tu mock';
  if (method === 'card') return 'The mock';
  return 'Chuyen khoan mock';
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
    label = 'Thanh toán thành công';
    toneClass = 'is-success';
  }

  el.innerHTML =
    '<div class="pvq-checkout-status ' + toneClass + '">' +
    '<span class="pvq-checkout-status__label">' + label + '</span>' +
    '<p class="pvq-muted">' +
    (message || 'Checkout mock đã sẵn sàng để mô phỏng bước thanh toán.') +
    '</p>' +
    '</div>';
}

function renderOrderSummary(course, orderMeta) {
  var el = document.getElementById('checkout-order-summary');
  if (!el || !course) return;

  var paymentMethod = orderMeta ? getMethodLabel(orderMeta.method) : 'Chua chon';
  var orderCode = orderMeta ? orderMeta.orderCode : 'Se tao sau khi thanh toan';
  var paidAt = orderMeta ? formatCheckoutTime(orderMeta.paidAt) : 'Se cap nhat sau khi thanh toan';

  el.innerHTML =
    '<dl class="pvq-sales-dl">' +
    '<dt>Khóa học</dt><dd>' + course.title + '</dd>' +
    '<dt>Cấp độ</dt><dd>' + course.level + '</dd>' +
    '<dt>Thời lượng</dt><dd>' + course.durationWeeks + ' tuần</dd>' +
    '<dt>Giá mô phỏng</dt><dd>Miễn phí demo / mock payment</dd>' +
    '<dt>Phương thức</dt><dd>' + paymentMethod + '</dd>' +
    '<dt>Mã đơn demo</dt><dd>' + orderCode + '</dd>' +
    '<dt>Thanh toán lúc</dt><dd>' + paidAt + '</dd>' +
    '<dt>Sau thanh toán</dt><dd>Tự động cấp quyền vào khóa học và lesson</dd>' +
    '</dl>';
}

function renderGuestState(course) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Bước 1</p>' +
    '<h3>Đăng nhập hoặc tạo tài khoản trước</h3>' +
    '<p class="pvq-muted">Checkout mock cần biết tài khoản nào sẽ được cấp quyền cho khóa <strong>' +
    course.title +
    '</strong>.</p>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="account.html" class="cta-btn cta-btn-primary">Đăng nhập</a>' +
    '<a href="register.html" class="cta-btn cta-btn-secondary">Tạo tài khoản</a>' +
    '</div>' +
    '</div>';
}

function renderUnlockedState(course, orderMeta) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  var orderCode = orderMeta ? orderMeta.orderCode : 'PVQ-DEMO';
  var paidAt = orderMeta ? formatCheckoutTime(orderMeta.paidAt) : formatCheckoutTime(new Date());
  var methodLabel = getMethodLabel(orderMeta && orderMeta.method);

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Đã cấp quyền</p>' +
    '<h3>Khóa học đã sẵn sàng</h3>' +
    '<p class="pvq-muted">Tài khoản hiện tại đã có quyền học khóa này. Bạn có thể quay lại dashboard hoặc mở bài học đầu tiên ngay.</p>' +
    '<div class="pvq-checkout-receipt">' +
    '<h4>Receipt / Success Summary</h4>' +
    '<dl class="pvq-sales-dl">' +
    '<dt>Mã đơn demo</dt><dd>' + orderCode + '</dd>' +
    '<dt>Thời gian</dt><dd>' + paidAt + '</dd>' +
    '<dt>Phương thức</dt><dd>' + methodLabel + '</dd>' +
    '<dt>Trạng thái</dt><dd>Thanh toán thành công</dd>' +
    '</dl>' +
    '</div>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="' + lessonHref(course) + '" class="cta-btn cta-btn-primary">Mở bài học đầu tiên</a>' +
    '<a href="dashboard.html" class="cta-btn cta-btn-secondary">Về dashboard</a>' +
    '</div>' +
    '</div>';
}

function renderCheckoutState(course) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Bước 2</p>' +
    '<h3>Xác nhận đăng ký khóa học demo</h3>' +
    '<p class="pvq-muted">Nút bên dưới sẽ mô phỏng thanh toán thành công và gọi API cấp quyền cho tài khoản hiện tại.</p>' +
    '<div class="pvq-checkout-methods">' +
    '<button type="button" class="pvq-checkout-method is-selected" data-method="bank">' +
    '<strong>Chuyển khoản mock</strong>' +
    '<span>Mô phỏng xác nhận thanh toán thủ công</span>' +
    '</button>' +
    '<button type="button" class="pvq-checkout-method" data-method="momo">' +
    '<strong>Ví điện tử mock</strong>' +
    '<span>Mô phỏng callback thanh toán thành công</span>' +
    '</button>' +
    '<button type="button" class="pvq-checkout-method" data-method="card">' +
    '<strong>Thẻ mock</strong>' +
    '<span>Mô phỏng checkout qua cổng thanh toán</span>' +
    '</button>' +
    '</div>' +
    '<div class="pvq-checkout-method-note" id="checkout-method-note">' +
    '<strong>Phương thức hiện tại:</strong> Chuyển khoản mock. Sau khi xác nhận, hệ thống sẽ cấp quyền trực tiếp cho tài khoản đang đăng nhập.' +
    '</div>' +
    '<label class="pvq-checkout-confirm">' +
    '<input type="checkbox" id="checkout-confirm-checkbox"> ' +
    'Tôi hiểu đây là mock checkout để test flow cấp quyền học.' +
    '</label>' +
    '<div class="pvq-course-access-actions">' +
    '<button type="button" id="checkout-submit-btn" class="cta-btn cta-btn-primary" style="border:none;cursor:pointer">Hoàn tất checkout demo</button>' +
    '<a href="course-detail.html?id=' + encodeURIComponent(course.id) + '" class="cta-btn cta-btn-secondary">Quay lại khóa học</a>' +
    '</div>' +
    '<p class="pvq-muted pvq-course-access-feedback" id="checkout-feedback"></p>' +
    '</div>';

  var submitBtn = document.getElementById('checkout-submit-btn');
  var confirmCheckbox = document.getElementById('checkout-confirm-checkbox');
  var feedbackEl = document.getElementById('checkout-feedback');
  var methodButtons = flowEl.querySelectorAll('.pvq-checkout-method');
  var methodNote = document.getElementById('checkout-method-note');
  var selectedMethod = 'bank';
  if (!submitBtn || !confirmCheckbox) return;

  methodButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      methodButtons.forEach(function (item) {
        item.classList.remove('is-selected');
      });
      button.classList.add('is-selected');
      selectedMethod = button.getAttribute('data-method') || 'bank';

      if (!methodNote) return;
      if (selectedMethod === 'momo') {
        methodNote.innerHTML =
          '<strong>Phương thức hiện tại:</strong> Ví điện tử mock. Trang sẽ mô phỏng callback thanh toán thành công rồi cấp quyền học.';
      } else if (selectedMethod === 'card') {
        methodNote.innerHTML =
          '<strong>Phương thức hiện tại:</strong> Thẻ mock. Trang sẽ mô phỏng xác thực giao dịch thành công trước khi mở khóa học.';
      } else {
        methodNote.innerHTML =
          '<strong>Phương thức hiện tại:</strong> Chuyển khoản mock. Sau khi xác nhận, hệ thống sẽ cấp quyền trực tiếp cho tài khoản đang đăng nhập.';
      }
    });
  });

  submitBtn.addEventListener('click', function () {
    if (!confirmCheckbox.checked) {
      if (feedbackEl) feedbackEl.textContent = 'Hãy xác nhận đây là mock checkout trước khi tiếp tục.';
      return;
    }

    submitBtn.disabled = true;
    if (feedbackEl) feedbackEl.textContent = 'Đang xử lý checkout demo...';
    var orderMeta = createDemoOrderMeta(course, selectedMethod);
    renderCheckoutStatus(
      'processing',
      'Hệ thống đang mô phỏng thanh toán qua ' +
        (selectedMethod === 'momo'
          ? 'ví điện tử mock'
          : selectedMethod === 'card'
          ? 'thẻ mock'
          : 'chuyển khoản mock') +
        '.'
    );
    renderOrderSummary(course, orderMeta);

    checkoutFetch('/api/courses/' + encodeURIComponent(course.id) + '/unlock-mock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
      .then(function () {
        return window.PVQ_Auth.refreshSession();
      })
      .then(function () {
        renderCheckoutStatus(
          'success',
          'Thanh toán mock đã hoàn tất. Quyền học đã được cấp cho tài khoản hiện tại.'
        );
        renderOrderSummary(course, orderMeta);
        renderUnlockedState(course, orderMeta);
      })
      .catch(function (error) {
        if (feedbackEl) feedbackEl.textContent = error.message;
        renderOrderSummary(course);
        renderCheckoutStatus(
          'idle',
          'Checkout mock chưa hoàn tất. Bạn có thể kiểm tra lại xác nhận rồi thử lại.'
        );
        submitBtn.disabled = false;
      });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var courseId =
    window.PVQ_getQueryParam('courseId') || window.PVQ_getQueryParam('id');
  var titleEl = document.getElementById('checkout-title');
  var summaryEl = document.getElementById('checkout-summary');

  if (!courseId || !window.PVQ_Content) {
    if (titleEl) titleEl.textContent = 'Không tìm thấy khóa học';
    if (summaryEl) summaryEl.textContent = 'Thiếu courseId cho checkout demo.';
    return;
  }

  window.PVQ_Content.loadCourseWithLessons(courseId)
    .then(function (course) {
      document.title = 'Checkout Demo — ' + course.title + ' — Piano Vinh Quang';
      if (titleEl) titleEl.textContent = course.title;
      if (summaryEl) {
        summaryEl.textContent =
          course.summary + ' Bước này mô phỏng thanh toán trước khi cấp quyền.';
      }

      renderCheckoutStatus(
        'idle',
        'Chọn phương thức thanh toán mock rồi xác nhận để mô phỏng bước checkout.'
      );
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
                return;
              }
              renderCheckoutState(course);
            })
            .catch(function () {
              renderCheckoutState(course);
            });
        });
    })
    .catch(function (error) {
      if (titleEl) titleEl.textContent = 'Không thể tải checkout';
      if (summaryEl) summaryEl.textContent = 'Vui lòng kiểm tra lại dữ liệu khóa học.';
      console.error('[checkout] load failed:', error);
    });
});
