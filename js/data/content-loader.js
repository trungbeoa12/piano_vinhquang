(function () {
  var jsonCache = {};

  function withApiBase(path) {
    if (window.PVQ_withApiBase) return window.PVQ_withApiBase(path);
    return path;
  }

  function fetchJson(path, isApi) {
    var targetPath = isApi ? withApiBase(path) : path;
    if (!jsonCache[targetPath]) {
      jsonCache[targetPath] = fetch(targetPath).then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load ' + targetPath + ' (' + response.status + ')');
        }
        return response.json();
      });
    }

    return jsonCache[targetPath];
  }

  function loadCourseById(id) {
    return fetchJson('/api/courses/' + encodeURIComponent(id), true).then(function (payload) {
      return payload.course;
    });
  }

  function loadLessonById(courseId, lessonId) {
    return fetchJson(
      '/api/courses/' + encodeURIComponent(courseId) + '/lessons',
      true
    ).then(function (payload) {
      var lessons = Array.isArray(payload.items) ? payload.items : [];
      return (
        lessons.find(function (lesson) {
          return lesson && lesson.id === lessonId;
        }) || null
      );
    });
  }

  function loadCourseWithLessons(id) {
    return Promise.all([loadCourseById(id), loadLessonsByCourseId(id)]).then(function (results) {
      var course = results[0] || {};
      var lessons = results[1] || [];
      return Object.assign({}, course, { lessons: lessons });
    });
  }

  function loadCourses() {
    return fetchJson('/api/courses', true).then(function (payload) {
      return Array.isArray(payload.items) ? payload.items : [];
    });
  }

  function loadLessonsByCourseId(courseId) {
    return fetchJson(
      '/api/courses/' + encodeURIComponent(courseId) + '/lessons',
      true
    ).then(function (payload) {
      return Array.isArray(payload.items) ? payload.items : [];
    });
  }

  function findLesson(courseId, lessonId) {
    return Promise.all([loadCourseById(courseId), loadLessonById(courseId, lessonId)]).then(
      function (results) {
        if (!results[0] || !results[1]) return null;
        return {
          course: results[0],
          lesson: results[1],
        };
      }
    ).catch(function () {
      return null;
    });
  }

  function loadProductById(id) {
    return fetchJson(
      'content/products/' + encodeURIComponent(id) + '/product.json'
    );
  }

  function loadProducts() {
    return fetchJson('content/products/index.json').then(function (productIds) {
      return Promise.all(
        productIds.map(function (productId) {
          return loadProductById(productId);
        })
      );
    });
  }

  window.PVQ_Content = {
    loadCourses: loadCourses,
    loadCourseById: loadCourseById,
    loadCourseWithLessons: loadCourseWithLessons,
    loadLessonsByCourseId: loadLessonsByCourseId,
    loadLessonById: loadLessonById,
    findLesson: findLesson,
    loadProducts: loadProducts,
    loadProductById: loadProductById,
  };
})();
