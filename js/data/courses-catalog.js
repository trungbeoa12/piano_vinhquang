/**
 * Catalog khóa học — công khai.
 * Không chứa URL Google Drive hay file nhạy cảm; chỉ id tham chiếu tới resource (resolve ở lớp access).
 */
window.PVQ_COURSES = [
  {
    id: 'piano-co-ban',
    title: 'Piano căn bản cho người mới',
    summary: 'Tư thế ngồi, nhịp điệu, đọc nốt và bài tập ngón trên đàn thật hoặc đàn kỹ thuật số.',
    priceLabel: 'Liên hệ',
    level: 'Cơ bản',
    durationWeeks: 8,
    heroImage: 'images/courses/course-piano-basic-cover.jpg',
    lessons: [
      {
        id: 'pcb-l01',
        title: 'Làm quen bàn phím & tư thế',
        durationMin: 35,
        resources: [
          { refId: 'pvq-pcb-l01-vid', kind: 'video', title: 'Video bài học' },
          { refId: 'pvq-pcb-l01-sheet', kind: 'sheet', title: 'Sheet bài tập số 1' },
        ],
      },
      {
        id: 'pcb-l02',
        title: 'Nhịp điệu & đệm tay trái đơn giản',
        durationMin: 40,
        resources: [
          { refId: 'pvq-pcb-l02-vid', kind: 'video', title: 'Video bài học' },
          { refId: 'pvq-pcb-l02-pdf', kind: 'pdf', title: 'Tài liệu PDF' },
        ],
      },
    ],
  },
  {
    id: 'dem-hat-thuc-chien',
    title: 'Piano đệm hát thực chiến',
    summary: 'Hợp âm, vòng công năng pop ballad, intro — đệm theo giọng hát.',
    priceLabel: 'Liên hệ',
    level: 'Trung cấp',
    durationWeeks: 10,
    heroImage: 'images/courses/course-piano-accompaniment-cover.jpg',
    lessons: [
      {
        id: 'dh-l01',
        title: 'Hợp âm major / minor & chuyển nhanh',
        durationMin: 45,
        resources: [
          { refId: 'pvq-dh-l01-vid', kind: 'video', title: 'Video bài học' },
          { refId: 'pvq-dh-l01-sheet', kind: 'sheet', title: 'Lead sheet mẫu' },
        ],
      },
    ],
  },
];

window.PVQ_getCourseById = function (id) {
  return window.PVQ_COURSES.find(function (c) {
    return c.id === id;
  }) || null;
};

window.PVQ_findLesson = function (courseId, lessonId) {
  const course = window.PVQ_getCourseById(courseId);
  if (!course) return null;
  const lesson = course.lessons.find(function (l) {
    return l.id === lessonId;
  });
  if (!lesson) return null;
  return { course: course, lesson: lesson };
};
