(function () {
  var STORAGE_KEY = 'pvq_session_v2';
  var API_BASE = '';

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

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function saveAuthState(payload) {
    if (!payload || !payload.user || !payload.token) {
      clearSession();
      return null;
    }

    var nextSession = {
      token: payload.token,
      expiresInSeconds: payload.expiresInSeconds || null,
      email: payload.user.email,
      emailNormalized: payload.user.emailNormalized,
      displayName: payload.user.displayName || '',
      userId: payload.user.id,
      enrolledCourseIds: Array.isArray(payload.enrolledCourseIds)
        ? payload.enrolledCourseIds
        : [],
      createdAt: payload.user.createdAt || null,
    };

    saveSession(nextSession);
    return nextSession;
  }

  function apiFetch(path, options) {
    return fetch(API_BASE + path, options || {});
  }

  function getToken() {
    var session = getSession();
    return session && session.token ? session.token : '';
  }

  async function refreshSession() {
    var token = getToken();
    if (!token) {
      clearSession();
      return null;
    }

    try {
      var response = await apiFetch('/api/me', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      var payload = await response.json();
      if (!payload.ok) {
        clearSession();
        return null;
      }

      return saveAuthState({
        token: token,
        expiresInSeconds: getSession() && getSession().expiresInSeconds,
        user: payload.user,
        enrolledCourseIds: payload.enrolledCourseIds,
      });
    } catch (error) {
      console.error('[PVQ_Auth] refreshSession failed:', error);
      return getSession();
    }
  }

  async function login(email, password) {
    var response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: String(email || '').trim(),
        password: String(password || ''),
      }),
    });

    var payload = await response.json().catch(function () {
      return {
        ok: false,
        message: 'Không thể đọc phản hồi từ server.',
      };
    });

    if (!response.ok || !payload.ok) {
      var message = payload && payload.message
        ? payload.message
        : 'Đăng nhập thất bại.';
      throw new Error(message);
    }

    return saveAuthState(payload);
  }

  async function register(displayName, email, password) {
    var response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: String(displayName || '').trim(),
        email: String(email || '').trim(),
        password: String(password || ''),
      }),
    });

    var payload = await response.json().catch(function () {
      return {
        ok: false,
        message: 'Không thể đọc phản hồi từ server.',
      };
    });

    if (!response.ok || !payload.ok) {
      var message = payload && payload.message
        ? payload.message
        : 'Đăng ký thất bại.';
      throw new Error(message);
    }

    return saveAuthState(payload);
  }

  function logout() {
    clearSession();
  }

  function hasCourseAccess(courseId) {
    var s = getSession();
    if (!s || !s.enrolledCourseIds) return false;
    return s.enrolledCourseIds.indexOf(courseId) !== -1;
  }

  function isLoggedIn() {
    var session = getSession();
    return !!(session && session.token);
  }

  window.PVQ_Auth = {
    getSession: getSession,
    getToken: getToken,
    login: login,
    register: register,
    logout: logout,
    refreshSession: refreshSession,
    hasCourseAccess: hasCourseAccess,
    isLoggedIn: isLoggedIn,
  };
})();
