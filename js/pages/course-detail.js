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
