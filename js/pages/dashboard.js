function apiFetch(path, options) {
  var endpoint = window.PVQ_withApiBase
    ? window.PVQ_withApiBase(path)
    : path;
  return fetch(endpoint, options || {}).then(function (response) {
    return response.json().then(function (payload) {
      if (!response.ok || !payload.ok) {
        var error = new Error(
          (payload && payload.message) || 'Không thể tải dữ liệu dashboard.'
        );
        error.status = response.status;
        throw error;
      }
      return payload;
    });
  });
}

function lessonLink(courseId, lessonId) {
  return (
    'lesson.html?courseId=' +
    encodeURIComponent(courseId) +
    '&lessonId=' +
    encodeURIComponent(lessonId)
  );
}

function courseLink(courseId) {
  return 'course-detail.html?id=' + encodeURIComponent(courseId);
}

function getProgressMap(items) {
  var map = {};
  (items || []).forEach(function (item) {
    if (!item || !item.lessonId) return;
    map[item.lessonId] = item;
  });
  return map;
}

function findNextLesson(course, progressMap) {
  if (!course || !Array.isArray(course.lessons) || !course.lessons.length) {
    return null;
  }

  var lessonOrder = Array.isArray(course.lessonOrder) ? course.lessonOrder : [];
  for (var i = 0; i < lessonOrder.length; i += 1) {
    var lessonId = lessonOrder[i];
    var progress = progressMap[lessonId];
    if (!progress || !progress.completed) {
      return course.lessons.find(function (lesson) {
        return lesson.id === lessonId;
      }) || null;
    }
  }

  return course.lessons[course.lessons.length - 1] || null;
}

function renderStats(session, progressItems) {
  var statsEl = document.getElementById('dashboard-stats');
  if (!statsEl) return;

  var totalCourses = Array.isArray(session.enrolledCourseIds)
    ? session.enrolledCourseIds.length
    : 0;
  var completedLessons = (progressItems || []).filter(function (item) {
    return !!item.completed;
  }).length;

  statsEl.innerHTML =
    '<div class="pvq-dashboard-stat"><span>Khóa đã mở</span><strong>' +
    totalCourses +
    '</strong></div>' +
    '<div class="pvq-dashboard-stat"><span>Bài đã hoàn thành</span><strong>' +
    completedLessons +
    '</strong></div>';
}

function renderContinueLearning(courses, progressItems) {
  var target = document.getElementById('dashboard-continue-list');
  if (!target) return;

  if (!courses.length) {
    target.innerHTML =
      '<div class="pvq-account-empty-state"><strong>Chưa có khóa học</strong><p class="pvq-muted">Hãy mở khóa demo ở trang chi tiết khóa học để bắt đầu flow học thử.</p></div>';
    return;
  }

  var progressMap = getProgressMap(progressItems);
  var html = courses
    .map(function (course) {
      var nextLesson = findNextLesson(course, progressMap);
      if (!nextLesson) return '';

      var progress = progressMap[nextLesson.id];
      var statusLabel = progress && progress.completed
        ? 'Đã hoàn thành, có thể xem lại'
        : progress
        ? 'Đang học dở'
        : 'Bắt đầu khóa học';

      return (
        '<article class="pvq-dashboard-continue-card">' +
        '<div>' +
        '<p class="pvq-account-kicker">Tiếp tục</p>' +
        '<h3>' + course.title + '</h3>' +
        '<p class="pvq-muted">' + nextLesson.title + '</p>' +
        '<p class="pvq-dashboard-status">' + statusLabel + '</p>' +
        '</div>' +
        '<div class="pvq-course-access-actions">' +
        '<a href="' + lessonLink(course.id, nextLesson.id) + '" class="cta-btn cta-btn-primary">Vào bài học</a>' +
        '<a href="' + courseLink(course.id) + '" class="cta-btn cta-btn-secondary">Xem khóa học</a>' +
        '</div>' +
        '</article>'
      );
    })
    .join('');

  target.innerHTML = html || '<p class="pvq-muted">Chưa có bài học để tiếp tục.</p>';
}

function renderCourses(courses, progressItems) {
  var target = document.getElementById('dashboard-courses-list');
  if (!target) return;

  if (!courses.length) {
    target.innerHTML =
      '<div class="pvq-account-empty-state"><strong>Chưa có khóa học nào</strong><p class="pvq-muted">Tài khoản này chưa được cấp quyền khóa học.</p></div>';
    return;
  }

  var progressMap = getProgressMap(progressItems);
  target.innerHTML = courses
    .map(function (course) {
      var totalLessons = Array.isArray(course.lessons) ? course.lessons.length : 0;
      var completedCount = (course.lessons || []).filter(function (lesson) {
        var progress = progressMap[lesson.id];
        return !!(progress && progress.completed);
      }).length;
      var nextLesson = findNextLesson(course, progressMap);
      var nextHref = nextLesson ? lessonLink(course.id, nextLesson.id) : courseLink(course.id);

      return (
        '<article class="pvq-dashboard-course-card">' +
        '<div class="pvq-dashboard-course-meta">' +
        '<h3><a href="' + courseLink(course.id) + '">' + course.title + '</a></h3>' +
        '<p class="pvq-muted">' + course.summary + '</p>' +
        '<p class="pvq-dashboard-status">' +
        completedCount + '/' + totalLessons + ' bài đã hoàn thành' +
        '</p>' +
        '</div>' +
        '<div class="pvq-course-access-actions">' +
        '<a href="' + nextHref + '" class="cta-btn cta-btn-primary">Tiếp tục học</a>' +
        '<a href="' + courseLink(course.id) + '" class="cta-btn cta-btn-secondary">Xem chi tiết</a>' +
        '</div>' +
        '</article>'
      );
    })
    .join('');
}

function renderOrders(orders, courseMap) {
  var target = document.getElementById('dashboard-orders-list');
  if (!target) return;

  var pendingOrders = (orders || []).filter(function (order) {
    return order && (
      order.status === 'pending_payment' ||
      order.status === 'payment_submitted'
    );
  });

  if (!pendingOrders.length) {
    target.innerHTML =
      '<div class="pvq-account-empty-state"><strong>Không có đơn chờ xác nhận</strong><p class="pvq-muted">Khi bạn tạo đơn mua khóa học, trạng thái sẽ xuất hiện tại đây cho tới khi admin xác nhận.</p></div>';
    return;
  }

  target.innerHTML = pendingOrders
    .map(function (order) {
      var course = courseMap[order.courseId] || null;
      var courseTitle = course ? course.title : order.courseId;
      var statusLabel = order.status === 'payment_submitted'
        ? 'Đã báo chuyển khoản, chờ admin xác nhận'
        : 'Đơn đã tạo, chờ bạn chuyển khoản';

      return (
        '<article class="pvq-dashboard-course-card">' +
        '<div class="pvq-dashboard-course-meta">' +
        '<h3>' + courseTitle + '</h3>' +
        '<p class="pvq-muted">Mã đơn: ' + (order.id || '—') + '</p>' +
        '<p class="pvq-dashboard-status">' + statusLabel + '</p>' +
        '</div>' +
        '<div class="pvq-course-access-actions">' +
        '<a href="checkout.html?courseId=' + encodeURIComponent(order.courseId) + '" class="cta-btn cta-btn-primary">Xem đơn hàng</a>' +
        '<a href="course-detail.html?id=' + encodeURIComponent(order.courseId) + '" class="cta-btn cta-btn-secondary">Xem khóa học</a>' +
        '</div>' +
        '</article>'
      );
    })
    .join('');
}

async function loadDashboard() {
  var session = await window.PVQ_Auth.refreshSession();
  var guestEl = document.getElementById('dashboard-guest');
  var userEl = document.getElementById('dashboard-user');

  if (!session) {
    if (guestEl) guestEl.style.display = 'block';
    if (userEl) userEl.style.display = 'none';
    return;
  }

  if (guestEl) guestEl.style.display = 'none';
  if (userEl) userEl.style.display = 'grid';

  var greetingEl = document.getElementById('dashboard-greeting');
  var emailEl = document.getElementById('dashboard-email');
  if (greetingEl) {
    greetingEl.textContent = 'Xin chào ' + (session.displayName || 'học viên');
  }
  if (emailEl) {
    emailEl.textContent = session.email || '—';
  }

  var progressPayload = await apiFetch('/api/my/progress', {
    headers: {
      Authorization: 'Bearer ' + window.PVQ_Auth.getToken(),
    },
  }).catch(function () {
    return { items: [] };
  });
  var ordersPayload = await apiFetch('/api/me/orders', {
    headers: {
      Authorization: 'Bearer ' + window.PVQ_Auth.getToken(),
    },
  }).catch(function () {
    return { items: [] };
  });

  var enrolledCourseIds = Array.isArray(session.enrolledCourseIds)
    ? session.enrolledCourseIds
    : [];
  var pendingOrderCourseIds = ((ordersPayload && ordersPayload.items) || [])
    .filter(function (order) {
      return order && (
        order.status === 'pending_payment' ||
        order.status === 'payment_submitted'
      );
    })
    .map(function (order) {
      return order.courseId;
    });
  var courseIdsForLookup = enrolledCourseIds.slice();
  pendingOrderCourseIds.forEach(function (courseId) {
    if (courseIdsForLookup.indexOf(courseId) === -1) {
      courseIdsForLookup.push(courseId);
    }
  });
  var courses = await Promise.all(
    courseIdsForLookup.map(function (courseId) {
      return window.PVQ_Content.loadCourseWithLessons(courseId).catch(function () {
        return null;
      });
    })
  );
  var validCourses = courses.filter(Boolean);
  var progressItems = Array.isArray(progressPayload.items) ? progressPayload.items : [];
  var orders = Array.isArray(ordersPayload.items) ? ordersPayload.items : [];
  var courseMap = {};
  validCourses.forEach(function (course) {
    if (course && course.id) {
      courseMap[course.id] = course;
    }
  });
  var enrolledCourses = enrolledCourseIds
    .map(function (courseId) {
      return courseMap[courseId] || null;
    })
    .filter(Boolean);

  renderStats(session, progressItems);
  renderContinueLearning(enrolledCourses, progressItems);
  renderCourses(enrolledCourses, progressItems);
  renderOrders(orders, courseMap);
}

document.addEventListener('DOMContentLoaded', function () {
  loadDashboard().catch(function (error) {
    console.error('[dashboard] load failed:', error);
  });

  var logoutBtn = document.getElementById('dashboard-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.PVQ_Auth.logout();
      window.location.href = 'account.html';
    });
  }
});
