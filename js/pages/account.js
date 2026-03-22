function refreshAccountView() {
  var session = window.PVQ_Auth.getSession();
  var guestPanel = document.getElementById('account-guest');
  var userPanel = document.getElementById('account-user');
  var emailDisplay = document.getElementById('account-email-display');
  var coursesList = document.getElementById('account-courses-list');

  if (!session) {
    if (guestPanel) guestPanel.style.display = 'block';
    if (userPanel) userPanel.style.display = 'none';
    return;
  }

  if (guestPanel) guestPanel.style.display = 'none';
  if (userPanel) userPanel.style.display = 'block';
  if (emailDisplay) emailDisplay.textContent = session.email || '—';

  if (coursesList && session.purchasedCourseIds) {
    coursesList.innerHTML = session.purchasedCourseIds
      .map(function (cid) {
        var c = window.PVQ_getCourseById(cid);
        if (!c) return '';
        return (
          '<div class="pvq-course-owned">' +
          '<a href="course-detail.html?id=' +
          encodeURIComponent(cid) +
          '">' +
          c.title +
          '</a>' +
          '<div class="pvq-muted">Vào khóa học để mở danh sách bài & học liệu.</div></div>'
        );
      })
      .join('');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  refreshAccountView();

  var loginForm = document.getElementById('demo-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = document.getElementById('demo-email');
      var email = emailInput ? emailInput.value.trim() : '';
      window.PVQ_Auth.loginDemo(email || undefined);
      refreshAccountView();
    });
  }

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.PVQ_Auth.logout();
      refreshAccountView();
    });
  }
});
