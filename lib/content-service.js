const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const COURSES_DIR = path.join(CONTENT_DIR, 'courses');

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
  loadCourseById,
  loadLessonById,
  loadCourseLessonPayload,
};
