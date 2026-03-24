function refreshAccountView() {
  var session = window.PVQ_Auth.getSession();
  var guestPanel = document.getElementById('account-guest');
  var userPanel = document.getElementById('account-user');
  var emailDisplay = document.getElementById('account-email-display');
  var coursesList = document.getElementById('account-courses-list');
  var feedbackEl = document.getElementById('account-feedback');

  if (!session) {
    if (guestPanel) guestPanel.style.display = 'block';
    if (userPanel) userPanel.style.display = 'none';
    if (feedbackEl) feedbackEl.textContent = '';
    return;
  }

  if (guestPanel) guestPanel.style.display = 'none';
  if (userPanel) userPanel.style.display = 'block';
  if (emailDisplay) emailDisplay.textContent = session.email || '—';

  if (coursesList && session.enrolledCourseIds && window.PVQ_Content) {
    coursesList.innerHTML = '<p class="pvq-muted">Đang tải khóa học của bạn...</p>';

    Promise.all(
      session.enrolledCourseIds.map(function (cid) {
        return window.PVQ_Content.loadCourseById(cid).catch(function () {
          return null;
        });
      })
    ).then(function (courses) {
      var html = courses
        .map(function (c, index) {
          var cid = session.enrolledCourseIds[index];
          if (!c) return '';
	          return (
	            '<div class="pvq-course-owned">' +
	            '<a href="course-detail.html?id=' +
	            encodeURIComponent(cid) +
	            '">' +
	            c.title +
	            '</a>' +
	            '<div class="pvq-muted">Vào khóa học để mở danh sách bài & học liệu.</div>' +
              '<div class="pvq-course-access-actions" style="margin-top:14px">' +
              '<a href="dashboard.html" class="cta-btn cta-btn-primary">Mở dashboard</a>' +
              '<a href="course-detail.html?id=' + encodeURIComponent(cid) + '" class="cta-btn cta-btn-secondary">Xem khóa học</a>' +
              '</div></div>'
	          );
	        })
        .join('');

      coursesList.innerHTML = html ||
        '<div class="pvq-account-empty-state"><strong>Chưa có khóa học nào</strong><p class="pvq-muted">Tài khoản hiện tại chưa được gán khóa học nào trong hệ thống.</p></div>';
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  Promise.resolve(window.PVQ_Auth.refreshSession())
    .catch(function () {
      return null;
    })
    .then(function () {
      refreshAccountView();
    });

  var loginForm = document.getElementById('demo-login-form');
  var feedbackEl = document.getElementById('account-feedback');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var emailInput = document.getElementById('demo-email');
      var passwordInput = document.getElementById('demo-password');
      var email = emailInput ? emailInput.value.trim() : '';
      var password = passwordInput ? passwordInput.value : '';
      var submitButton = loginForm.querySelector('button[type="submit"]');

      if (feedbackEl) feedbackEl.textContent = 'Đang đăng nhập...';
      if (submitButton) submitButton.disabled = true;

      try {
        await window.PVQ_Auth.login(email, password);
        await window.PVQ_Auth.refreshSession();
        if (feedbackEl) feedbackEl.textContent = '';
        refreshAccountView();
        if (window.PVQ_injectSiteHeader) {
          window.PVQ_injectSiteHeader('account', {
            contactHref: 'index.html#contact',
          });
        }
      } catch (error) {
        if (feedbackEl) feedbackEl.textContent = error.message;
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.PVQ_Auth.logout();
      refreshAccountView();
      if (window.PVQ_injectSiteHeader) {
        window.PVQ_injectSiteHeader('account', {
          contactHref: 'index.html#contact',
        });
      }
    });
  }
});
