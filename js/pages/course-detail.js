function renderListBlock(title, items) {
  if (!items || !items.length) return '';
  return (
    '<div class="pvq-detail-block">' +
    '<h3 class="pvq-detail-block-title">' +
    title +
    '</h3>' +
    '<ul class="pvq-detail-list">' +
    items
      .map(function (t) {
        return '<li>' + t + '</li>';
      })
      .join('') +
    '</ul></div>'
  );
}

function renderCourseAccessCard(course, hasAccess) {
  var accessEl = document.getElementById('course-access-cta');
  if (!accessEl || !course) return;

  var firstLesson = course.lessons && course.lessons.length ? course.lessons[0] : null;
  var firstLessonHref = firstLesson
    ? 'lesson.html?courseId=' +
      encodeURIComponent(course.id) +
      '&lessonId=' +
      encodeURIComponent(firstLesson.id)
    : 'account.html';
  var checkoutHref = 'checkout.html?courseId=' + encodeURIComponent(course.id);

  if (hasAccess) {
    accessEl.innerHTML =
      '<div class="pvq-course-access-card">' +
      '<h3>Bạn đã có quyền truy cập</h3>' +
      '<p class="pvq-muted">Tài khoản hiện tại đã được cấp quyền khóa học này. Bạn có thể mở bài học đầu tiên để bắt đầu ngay.</p>' +
      '<div class="pvq-course-access-actions">' +
      '<a href="' +
      firstLessonHref +
      '" class="cta-btn cta-btn-primary">Mở bài học</a>' +
      '<a href="account.html" class="cta-btn cta-btn-secondary">Vào tài khoản</a>' +
      '</div>' +
      '</div>';
    return;
  }

  accessEl.innerHTML =
    '<div class="pvq-course-access-card">' +
    '<p class="pvq-course-access-badge">Checkout</p>' +
    '<h3>Mua khóa học</h3>' +
    '<p class="pvq-muted">Tài khoản hiện tại chưa có quyền khóa học này. Vào trang checkout để tạo đơn chuyển khoản và chờ admin xác nhận.</p>' +
    '<div class="pvq-course-access-price">' + (course.priceLabel || 'Xem checkout') + '</div>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="' + checkoutHref + '" class="cta-btn cta-btn-primary">Mua khóa học</a>' +
    '<a href="account.html" class="cta-btn cta-btn-secondary">Tài khoản</a>' +
    '<a href="dashboard.html" class="cta-btn cta-btn-secondary">Mở dashboard</a>' +
    '</div>' +
    '</div>';
}

function renderGuestAccessCard(course) {
  var accessEl = document.getElementById('course-access-cta');
  if (!accessEl) return;
  var checkoutHref = course
    ? 'checkout.html?courseId=' + encodeURIComponent(course.id)
    : 'account.html';

  accessEl.innerHTML =
    '<div class="pvq-course-access-card">' +
    '<p class="pvq-course-access-badge">Bước 1</p>' +
    '<h3>Đăng nhập hoặc tạo tài khoản</h3>' +
    '<p class="pvq-muted">Bạn có thể bấm mua khóa học ngay, hệ thống sẽ yêu cầu đăng nhập rồi quay lại checkout.</p>' +
    '<div class="pvq-course-access-actions">' +
    '<a href="' + checkoutHref + '" class="cta-btn cta-btn-primary">Mua khóa học</a>' +
    '<a href="account.html" class="cta-btn cta-btn-secondary">Đăng nhập</a>' +
    '<a href="register.html" class="cta-btn cta-btn-secondary">Tạo tài khoản</a>' +
    '</div>' +
	      '</div>';
}

function renderLessons(course, hasAccess) {
  var lessonsEl = document.getElementById('course-lessons');
  if (!lessonsEl || !course || !course.lessons) return;

  lessonsEl.innerHTML = course.lessons
    .map(function (lesson) {
      var link =
        'lesson.html?courseId=' +
        encodeURIComponent(course.id) +
        '&lessonId=' +
        encodeURIComponent(lesson.id);

      var actionHtml = hasAccess
        ? '<a href="' + link + '">Vào bài học</a>'
        : '<span class="pvq-lesson-link-disabled">Chưa có quyền</span>';

      return (
        '<li class="pvq-lesson-row">' +
        '<div><div class="pvq-lesson-title">' +
        lesson.title +
        '</div>' +
        '<div class="pvq-lesson-meta">' +
        lesson.durationMin +
        ' phút • ' +
        lesson.resources.length +
        ' học liệu</div></div>' +
        '<div>' +
        actionHtml +
        '</div></li>'
      );
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', function () {
  var id = window.PVQ_getQueryParam('id');
  var titleEl = document.getElementById('course-title');
  var summaryEl = document.getElementById('course-summary');
  var metaEl = document.getElementById('course-meta');
  var imgEl = document.getElementById('course-image');
  var lessonsEl = document.getElementById('course-lessons');
  var audienceEl = document.getElementById('course-audience');
  var contentsEl = document.getElementById('course-contents');
  var outcomesEl = document.getElementById('course-outcomes');

  if (!id || !window.PVQ_Content) {
    if (titleEl) titleEl.textContent = 'Không tìm thấy khóa học';
    if (summaryEl) {
      summaryEl.textContent =
        'Mã khóa học không hợp lệ. Vui lòng quay lại danh sách khóa học.';
    }
    return;
  }

  window.PVQ_Content.loadCourseWithLessons(id)
    .then(function (c) {
      document.title = c.title + ' — Piano Vinh Quang';
      if (titleEl) titleEl.textContent = c.title;
      if (summaryEl) summaryEl.textContent = c.summary;
      if (metaEl) {
        metaEl.textContent =
          c.level + ' • ' + c.durationWeeks + ' tuần • ' + c.priceLabel;
      }
      if (imgEl) {
        imgEl.src = c.heroImage;
        imgEl.alt = c.title;
      }

      if (audienceEl && c.audience) {
        audienceEl.innerHTML =
          '<div class="pvq-detail-block"><h3 class="pvq-detail-block-title">Đối tượng phù hợp</h3><p class="pvq-detail-text">' +
          c.audience +
          '</p></div>';
      }

      if (contentsEl && c.contentTopics) {
        contentsEl.innerHTML = renderListBlock('Nội dung chính', c.contentTopics);
      }

      if (outcomesEl && c.outcomes) {
        outcomesEl.innerHTML = renderListBlock('Kết quả mong đợi', c.outcomes);
      }

	      Promise.resolve(
        window.PVQ_Auth && window.PVQ_Auth.refreshSession
          ? window.PVQ_Auth.refreshSession()
          : null
      )
        .catch(function () {
          return null;
        })
        .then(function () {
          if (
            !window.PVQ_Auth ||
            !window.PVQ_Auth.isLoggedIn ||
            !window.PVQ_Auth.isLoggedIn()
          ) {
            renderGuestAccessCard(c);
            renderLessons(c, false);
            return;
          }

	          var accessPath =
	            '/api/courses/' + encodeURIComponent(c.id) + '/access';
	          return fetch(
	            window.PVQ_withApiBase
	              ? window.PVQ_withApiBase(accessPath)
	              : accessPath,
	            {
	            headers: {
	              Authorization: 'Bearer ' + window.PVQ_Auth.getToken(),
	            },
	          })
            .then(function (response) {
              if (!response.ok) {
                throw new Error('Failed to load course access.');
              }
              return response.json();
            })
	            .then(function (payload) {
	              var hasAccess = !!(payload && payload.hasAccess);
	              renderCourseAccessCard(c, hasAccess);
	              renderLessons(c, hasAccess);
	            })
	            .catch(function () {
	              renderCourseAccessCard(c, false);
	              renderLessons(c, false);
	            });
	        });

      if (lessonsEl && c.lessons) {
        renderLessons(c, false);
      }
    })
    .catch(function (error) {
      if (titleEl) titleEl.textContent = 'Không tìm thấy khóa học';
      if (summaryEl) {
        summaryEl.textContent =
          'Không thể tải dữ liệu khóa học. Vui lòng kiểm tra lại nội dung trong folder.';
      }
      console.error('[course-detail] load failed:', error);
    });
});
