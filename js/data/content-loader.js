(function () {
  var jsonCache = {};

  function fetchJson(path) {
    if (!jsonCache[path]) {
      jsonCache[path] = fetch(path).then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load ' + path + ' (' + response.status + ')');
        }
        return response.json();
      });
    }

    return jsonCache[path];
  }

  function loadCourseById(id) {
    return fetchJson('content/courses/' + encodeURIComponent(id) + '/course.json');
  }

  function loadLessonById(courseId, lessonId) {
    return fetchJson(
      'content/courses/' +
        encodeURIComponent(courseId) +
        '/lessons/' +
        encodeURIComponent(lessonId) +
        '/lesson.json'
    );
  }

  function loadCourseWithLessons(id) {
    return loadCourseById(id).then(function (course) {
      var lessonOrder = Array.isArray(course.lessonOrder) ? course.lessonOrder : [];

      return Promise.all(
        lessonOrder.map(function (lessonId) {
          return loadLessonById(course.id, lessonId);
        })
      ).then(function (lessons) {
        return Object.assign({}, course, { lessons: lessons });
      });
    });
  }

  function loadCourses() {
    return fetchJson('content/courses/index.json').then(function (courseIds) {
      return Promise.all(
        courseIds.map(function (courseId) {
          return loadCourseWithLessons(courseId);
        })
      );
    });
  }

  function findLesson(courseId, lessonId) {
    return Promise.all([loadCourseById(courseId), loadLessonById(courseId, lessonId)])
      .then(function (results) {
        return {
          course: results[0],
          lesson: results[1],
        };
      })
      .catch(function () {
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
    loadLessonById: loadLessonById,
    findLesson: findLesson,
    loadProducts: loadProducts,
    loadProductById: loadProductById,
  };
})();
