const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const COURSES_DIR = path.join(CONTENT_DIR, 'courses');
const COURSE_INDEX_FILE = path.join(COURSES_DIR, 'index.json');

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function getCourseFilePath(courseId) {
  return path.join(COURSES_DIR, courseId, 'course.json');
}

function getLessonFilePath(courseId, lessonId) {
  return path.join(COURSES_DIR, courseId, 'lessons', lessonId, 'lesson.json');
}

async function loadCourseById(courseId) {
  return readJsonFile(getCourseFilePath(courseId));
}

async function loadLessonById(courseId, lessonId) {
  return readJsonFile(getLessonFilePath(courseId, lessonId));
}

async function listCourseIds() {
  const values = await readJsonFile(COURSE_INDEX_FILE);
  if (!Array.isArray(values)) return [];
  return values.map(String).map(function (v) {
    return v.trim();
  }).filter(Boolean);
}

function normalizeLessonShape(lesson, order) {
  const safeLesson = lesson || {};
  const resources = Array.isArray(safeLesson.resources) ? safeLesson.resources : [];
  const videoResource = resources.find(function (item) {
    return item && (item.kind === 'video');
  });
  const sheetResource = resources.find(function (item) {
    return item && (item.kind === 'sheet' || item.kind === 'pdf');
  });
  const audioResource = resources.find(function (item) {
    return item && item.kind === 'audio';
  });
  const fallbackStatus = resources.length > 0 ? 'placeholder' : 'draft';
  const rawStatus = String(safeLesson.status || fallbackStatus).trim().toLowerCase();
  const status = ['draft', 'ready', 'placeholder'].indexOf(rawStatus) !== -1
    ? rawStatus
    : fallbackStatus;

  return {
    id: String(safeLesson.id || ''),
    title: String(safeLesson.title || 'Bài học chưa đặt tên'),
    description: String(safeLesson.description || ''),
    order: Number(order) || 0,
    durationMin: Number(safeLesson.durationMin) || 0,
    videoUrl: safeLesson.videoUrl || (videoResource && videoResource.url) || null,
    sheetUrl: safeLesson.sheetUrl || (sheetResource && sheetResource.url) || null,
    audioUrl: safeLesson.audioUrl || (audioResource && audioResource.url) || null,
    isPreview: !!safeLesson.isPreview,
    status: status,
    resources: resources,
  };
}

async function listLessonsByCourseId(courseId) {
  const course = await loadCourseById(courseId);
  const lessonOrder = Array.isArray(course.lessonOrder) ? course.lessonOrder : [];
  const lessons = await Promise.all(
    lessonOrder.map(async function (lessonId, index) {
      const lesson = await loadLessonById(course.id, lessonId);
      return normalizeLessonShape(lesson, index + 1);
    })
  );
  return lessons;
}

async function listCoursesSummary() {
  const ids = await listCourseIds();
  const courses = await Promise.all(
    ids.map(async function (courseId) {
      const course = await loadCourseById(courseId);
      const lessons = await listLessonsByCourseId(courseId);
      return {
        id: String(course.id || courseId),
        title: String(course.title || ''),
        summary: String(course.summary || ''),
        audience: String(course.audience || ''),
        contentTopics: Array.isArray(course.contentTopics) ? course.contentTopics : [],
        outcomes: Array.isArray(course.outcomes) ? course.outcomes : [],
        priceLabel: String(course.priceLabel || ''),
        priceVnd: Number(course.priceVnd) || 0,
        level: String(course.level || ''),
        durationWeeks: Number(course.durationWeeks) || 0,
        heroImage: String(course.heroImage || ''),
        lessonOrder: Array.isArray(course.lessonOrder) ? course.lessonOrder : [],
        lessons: lessons,
      };
    })
  );
  return courses;
}

async function loadCourseLessonPayload(courseId, lessonId) {
  const course = await loadCourseById(courseId);
  const lesson = await loadLessonById(courseId, lessonId);
  const lessonOrder = Array.isArray(course.lessonOrder) ? course.lessonOrder : [];

  if (course.id !== courseId) {
    throw new Error('Course payload does not match requested courseId.');
  }

  if (lesson.id !== lessonId) {
    throw new Error('Lesson payload does not match requested lessonId.');
  }

  if (lessonOrder.indexOf(lessonId) === -1) {
    throw new Error('Lesson does not belong to the requested course.');
  }

  return {
    course: course,
    lesson: lesson,
  };
}

module.exports = {
  listCourseIds,
  listCoursesSummary,
  listLessonsByCourseId,
  normalizeLessonShape,
  loadCourseById,
  loadLessonById,
  loadCourseLessonPayload,
};
