document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('register-form');
  var feedbackEl = document.getElementById('register-feedback');

  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var displayName = document.getElementById('register-display-name');
    var email = document.getElementById('register-email');
    var password = document.getElementById('register-password');
    var submitButton = form.querySelector('button[type="submit"]');

    if (feedbackEl) feedbackEl.textContent = 'Đang tạo tài khoản...';
    if (submitButton) submitButton.disabled = true;

    Promise.resolve(
      window.PVQ_Auth.register(
        displayName ? displayName.value : '',
        email ? email.value : '',
        password ? password.value : ''
      )
    )
      .then(function () {
        if (feedbackEl) {
          feedbackEl.textContent = 'Đăng ký thành công. Đang chuyển tới dashboard...';
        }
        window.location.href = 'dashboard.html';
      })
      .catch(function (error) {
        if (feedbackEl) feedbackEl.textContent = error.message;
      })
      .finally(function () {
        if (submitButton) submitButton.disabled = false;
      });
  });
});
