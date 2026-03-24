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

function formatCheckoutTime(isoOrDate) {
  try {
    var date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return String(isoOrDate);
  }
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

function getMethodLabel(method) {
  if (method === 'momo') return 'Ví điện tử (mock)';
  if (method === 'card') return 'Thẻ (mock)';
  return 'Chuyển khoản (mock)';
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
    (message ||
      'Đơn hàng lưu trong MongoDB; bước thanh toán chỉ là mô phỏng.') +
    '</p>' +
    '</div>';
}

function renderOrderSummary(course, pendingOrder) {
  var el = document.getElementById('checkout-order-summary');
  if (!el || !course) return;

  var orderId = pendingOrder && pendingOrder.id ? pendingOrder.id : 'Đang tạo đơn...';
  var priceLine =
    pendingOrder && pendingOrder.price !== undefined
      ? formatPriceVnd(pendingOrder.price)
      : '—';
  var statusLine = pendingOrder && pendingOrder.status ? pendingOrder.status : 'pending';
  var createdLine =
    pendingOrder && pendingOrder.createdAt
      ? formatCheckoutTime(pendingOrder.createdAt)
      : '—';

  el.innerHTML =
    '<dl class="pvq-sales-dl">' +
    '<dt>Khóa học</dt><dd>' + course.title + '</dd>' +
    '<dt>Cấp độ</dt><dd>' + course.level + '</dd>' +
    '<dt>Thời lượng</dt><dd>' + course.durationWeeks + ' tuần</dd>' +
    '<dt>Giá (VND)</dt><dd>' + priceLine + '</dd>' +
    '<dt>Mã đơn (MongoDB)</dt><dd style="word-break:break-all">' + orderId + '</dd>' +
    '<dt>Trạng thái đơn</dt><dd>' + statusLine + '</dd>' +
    '<dt>Tạo lúc</dt><dd>' + createdLine + '</dd>' +
    '<dt>Sau thanh toán</dt><dd>Ghi enrollment trên server, quyền học theo DB</dd>' +
    '</dl>';
}

function renderGuestState(course) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Bước 1</p>' +
    '<h3>Đăng nhập hoặc tạo tài khoản trước</h3>' +
    '<p class="pvq-muted">Cần tài khoản để tạo đơn hàng và enrollment cho khóa <strong>' +
    course.title +
    '</strong>.</p>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="account.html" class="cta-btn cta-btn-primary">Đăng nhập</a>' +
    '<a href="register.html" class="cta-btn cta-btn-secondary">Tạo tài khoản</a>' +
    '</div>' +
    '</div>';
}

function renderCreateOrderFailed(course, message) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Lỗi</p>' +
    '<h3>Không tạo được đơn hàng</h3>' +
    '<p class="pvq-muted">' +
    (message || 'Vui lòng thử lại.') +
    '</p>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="course-detail.html?id=' +
    encodeURIComponent(course.id) +
    '" class="cta-btn cta-btn-primary">Quay lại khóa học</a>' +
    '</div>' +
    '</div>';
}

function renderUnlockedState(course, receipt) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl) return;

  var orderId = receipt && receipt.orderId ? receipt.orderId : '—';
  var paidAt =
    receipt && receipt.paidAt
      ? formatCheckoutTime(receipt.paidAt)
      : formatCheckoutTime(new Date());
  var methodLabel = getMethodLabel(receipt && receipt.method);

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Đã cấp quyền</p>' +
    '<h3>Khóa học đã sẵn sàng</h3>' +
    '<p class="pvq-muted">Enrollment đã được lưu trên server. Bạn có thể mở bài học hoặc dashboard.</p>' +
    '<div class="pvq-checkout-receipt">' +
    '<h4>Biên lai (mock thanh toán)</h4>' +
    '<dl class="pvq-sales-dl">' +
    '<dt>Mã đơn</dt><dd style="word-break:break-all">' + orderId + '</dd>' +
    '<dt>Thời gian</dt><dd>' + paidAt + '</dd>' +
    '<dt>Phương thức</dt><dd>' + methodLabel + '</dd>' +
    '<dt>Trạng thái</dt><dd>Đã thanh toán (mock)</dd>' +
    '</dl>' +
    '</div>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="' + lessonHref(course) + '" class="cta-btn cta-btn-primary">Mở bài học đầu tiên</a>' +
    '<a href="dashboard.html" class="cta-btn cta-btn-secondary">Về dashboard</a>' +
    '</div>' +
    '</div>';
}

function renderCheckoutState(course, pendingOrder) {
  var flowEl = document.getElementById('checkout-flow');
  if (!flowEl || !pendingOrder || !pendingOrder.id) return;

  flowEl.innerHTML =
    '<div class="pvq-checkout-state">' +
    '<p class="pvq-course-access-badge">Bước 2</p>' +
    '<h3>Xác nhận thanh toán (mô phỏng)</h3>' +
    '<p class="pvq-muted">Đơn <code style="font-size:0.85em">' +
    pendingOrder.id +
    '</code> đang <strong>pending</strong>. Nút dưới gọi API confirm để ghi <strong>paid</strong> và enrollment.</p>' +
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
    '<strong>Phương thức hiện tại:</strong> Chuyển khoản mock. Xác nhận sẽ gọi POST /api/orders/confirm.' +
    '</div>' +
    '<label class="pvq-checkout-confirm">' +
    '<input type="checkbox" id="checkout-confirm-checkbox"> ' +
    'Tôi hiểu thanh toán là mô phỏng; dữ liệu đơn và enrollment là thật trên MongoDB.' +
    '</label>' +
    '<div class="pvq-course-access-actions">' +
    '<button type="button" id="checkout-submit-btn" class="cta-btn cta-btn-primary" style="border:none;cursor:pointer">Xác nhận thanh toán mock</button>' +
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
          '<strong>Phương thức hiện tại:</strong> Ví điện tử mock. Vẫn dùng POST /api/orders/confirm.';
      } else if (selectedMethod === 'card') {
        methodNote.innerHTML =
          '<strong>Phương thức hiện tại:</strong> Thẻ mock. Vẫn dùng POST /api/orders/confirm.';
      } else {
        methodNote.innerHTML =
          '<strong>Phương thức hiện tại:</strong> Chuyển khoản mock. Xác nhận sẽ gọi POST /api/orders/confirm.';
      }
    });
  });

  submitBtn.addEventListener('click', function () {
    if (!confirmCheckbox.checked) {
      if (feedbackEl) {
        feedbackEl.textContent =
          'Hãy xác nhận bạn hiểu thanh toán là mock trước khi tiếp tục.';
      }
      return;
    }

    submitBtn.disabled = true;
    if (feedbackEl) feedbackEl.textContent = 'Đang gọi /api/orders/confirm...';
    renderCheckoutStatus(
      'processing',
      'Đang xác nhận đơn và tạo enrollment trên server.'
    );

    checkoutFetch('/api/orders/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId: pendingOrder.id }),
    })
      .then(function (payload) {
        return window.PVQ_Auth.refreshSession().then(function () {
          return payload;
        });
      })
      .then(function (payload) {
        var ord = payload.order || {};
        var mergedOrder = Object.assign({}, pendingOrder, ord);
        renderCheckoutStatus(
          'success',
          'Đơn đã paid; enrollment đã ghi. Quyền học kiểm tra qua API lesson và DB.'
        );
        renderOrderSummary(course, mergedOrder);
        renderUnlockedState(course, {
          orderId: ord.id || pendingOrder.id,
          paidAt: new Date(),
          method: selectedMethod,
        });
      })
      .catch(function (error) {
        if (feedbackEl) feedbackEl.textContent = error.message;
        renderOrderSummary(course, pendingOrder);
        renderCheckoutStatus(
          'idle',
          'Chưa xác nhận xong. Kiểm tra lại và thử lại.'
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
    if (summaryEl) summaryEl.textContent = 'Thiếu courseId cho checkout.';
    return;
  }

  window.PVQ_Content.loadCourseWithLessons(courseId)
    .then(function (course) {
      document.title = 'Checkout — ' + course.title + ' — Piano Vinh Quang';
      if (titleEl) titleEl.textContent = course.title;
      if (summaryEl) {
        summaryEl.textContent =
          course.summary + ' Tạo đơn hàng thật trên server, thanh toán mock.';
      }

      renderCheckoutStatus(
        'idle',
        'Đang kiểm tra quyền học và tạo đơn nếu cần.'
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

          return checkoutFetch(
            '/api/courses/' + encodeURIComponent(course.id) + '/access'
          )
            .then(function (payload) {
              if (payload.hasAccess) {
                renderUnlockedState(course);
                return null;
              }

              renderCheckoutStatus(
                'processing',
                'Đang tạo đơn hàng (POST /api/orders/create)...'
              );

              return checkoutFetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: course.id }),
              })
                .then(function (body) {
                  var ord = body.order;
                  renderCheckoutStatus(
                    'idle',
                    'Đơn pending đã tạo. Chọn phương thức mock và xác nhận.'
                  );
                  renderOrderSummary(course, ord);
                  renderCheckoutState(course, ord);
                })
                .catch(function (error) {
                  renderCreateOrderFailed(course, error.message);
                  renderCheckoutStatus('idle', error.message);
                });
            })
            .catch(function () {
              renderCreateOrderFailed(
                course,
                'Không kiểm tra được quyền học. Đăng nhập lại hoặc thử sau.'
              );
            });
        });
    })
    .catch(function (error) {
      if (titleEl) titleEl.textContent = 'Không thể tải checkout';
      if (summaryEl) summaryEl.textContent = 'Vui lòng kiểm tra lại dữ liệu khóa học.';
      console.error('[checkout] load failed:', error);
    });
});
