document.addEventListener('DOMContentLoaded', function () {
  var id = window.PVQ_getQueryParam('id');
  var c = window.PVQ_getCourseById(id);
  var titleEl = document.getElementById('course-title');
  var summaryEl = document.getElementById('course-summary');
  var metaEl = document.getElementById('course-meta');
  var imgEl = document.getElementById('course-image');
  var lessonsEl = document.getElementById('course-lessons');

  if (!c) {
    if (titleEl) titleEl.textContent = 'Không tìm thấy khóa học';
    if (summaryEl)
      summaryEl.textContent =
        'Mã khóa học không hợp lệ. Vui lòng quay lại danh sách khóa học.';
    return;
  }

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

  if (lessonsEl && c.lessons) {
    lessonsEl.innerHTML = c.lessons
      .map(function (lesson) {
        var link =
          'lesson.html?courseId=' +
          encodeURIComponent(c.id) +
          '&lessonId=' +
          encodeURIComponent(lesson.id);
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
          '<div><a href="' +
          link +
          '">Vào bài học</a></div></li>'
        );
      })
      .join('');
  }
});
