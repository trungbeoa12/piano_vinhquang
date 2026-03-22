(function () {
  var STORAGE_KEY = 'pvq_session_v1';

  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveSession(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Demo: đăng nhập giả lập + gán quyền khóa học (thay bằng OAuth / API sau).
   */
  function loginDemo(email) {
    saveSession({
      email: email || 'hocvien@demo.vn',
      displayName: 'Học viên demo',
      purchasedCourseIds: ['piano-co-ban', 'dem-hat-thuc-chien'],
    });
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function hasCourseAccess(courseId) {
    var s = getSession();
    if (!s || !s.purchasedCourseIds) return false;
    return s.purchasedCourseIds.indexOf(courseId) !== -1;
  }

  function isLoggedIn() {
    return !!getSession();
  }

  window.PVQ_Auth = {
    getSession: getSession,
    loginDemo: loginDemo,
    logout: logout,
    hasCourseAccess: hasCourseAccess,
    isLoggedIn: isLoggedIn,
  };
})();
