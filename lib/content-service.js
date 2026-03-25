const fs = require('fs/promises');
const path = require('path');
const {
  getPrivateResourceEntry,
  upsertPrivateResourceEntry,
} = require('./private-resource-map');

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

async function listAdminCoursesSummary() {
  const ids = await listCourseIds();
  const courses = await Promise.all(
    ids.map(async function (courseId) {
      const course = await loadCourseById(courseId);
      const lessonOrder = Array.isArray(course.lessonOrder) ? course.lessonOrder : [];
      const shortDescription = String(
        course.shortDescription || course.summary || ''
      ).trim();

      return {
        id: String(course.id || courseId),
        slug: String(course.slug || course.id || courseId),
        title: String(course.title || ''),
        shortDescription: shortDescription,
        lessonCount: lessonOrder.length,
        isPublished: course.isPublished !== false,
        heroImage: String(course.heroImage || ''),
      };
    })
  );

  return courses.sort(function (a, b) {
    return a.title.localeCompare(b.title, 'vi');
  });
}

async function loadAdminCourseDetail(courseId) {
  const course = await loadCourseById(courseId);
  const lessons = await listLessonsByCourseId(courseId);
  const lessonOrder = Array.isArray(course.lessonOrder) ? course.lessonOrder : [];

  return {
    id: String(course.id || courseId),
    slug: String(course.slug || course.id || courseId),
    title: String(course.title || ''),
    shortDescription: String(course.shortDescription || course.summary || '').trim(),
    summary: String(course.summary || ''),
    audience: String(course.audience || ''),
    priceLabel: String(course.priceLabel || ''),
    priceVnd: Number(course.priceVnd) || 0,
    level: String(course.level || ''),
    durationWeeks: Number(course.durationWeeks) || 0,
    lessonCount: lessonOrder.length,
    isPublished: course.isPublished !== false,
    heroImage: String(course.heroImage || ''),
    lessons: lessons.map(function (lesson) {
      const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
      const videoResource = resources.find(function (item) {
        return item && item.kind === 'video';
      });
      const sheetResource = resources.find(function (item) {
        return item && (item.kind === 'sheet' || item.kind === 'pdf');
      });
      const midiResource = resources.find(function (item) {
        return item && (item.kind === 'midi' || item.kind === 'audio');
      });
      const videoEntry = videoResource ? getPrivateResourceEntry(videoResource.refId) : null;
      const sheetEntry = sheetResource ? getPrivateResourceEntry(sheetResource.refId) : null;
      const midiEntry = midiResource ? getPrivateResourceEntry(midiResource.refId) : null;
      return {
        id: String(lesson.id || ''),
        title: String(lesson.title || ''),
        description: String(lesson.description || ''),
        order: Number(lesson.order) || 0,
        durationMin: Number(lesson.durationMin) || 0,
        status: String(lesson.status || 'draft'),
        isPreview: !!lesson.isPreview,
        resourceCount: resources.length,
        videoLink: videoEntry ? String(videoEntry.url || '') : '',
        musicxmlLink: sheetEntry ? String(sheetEntry.url || '') : '',
        midiLink: midiEntry ? String(midiEntry.url || '') : '',
      };
    }),
  };
}

async function loadAdminLessonEditor(courseId, lessonId) {
  const lesson = normalizeLessonShape(
    await loadLessonById(courseId, lessonId)
  );
  const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
  const videoResource = resources.find(function (item) {
    return item && item.kind === 'video';
  });
  const sheetResource = resources.find(function (item) {
    return item && (item.kind === 'sheet' || item.kind === 'pdf');
  });
  const midiResource = resources.find(function (item) {
    return item && (item.kind === 'midi' || item.kind === 'audio');
  });

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    durationMin: lesson.durationMin,
    status: lesson.status,
    isPreview: lesson.isPreview,
    videoLink: videoResource
      ? String((getPrivateResourceEntry(videoResource.refId) || {}).url || '')
      : '',
    musicxmlLink: sheetResource
      ? String((getPrivateResourceEntry(sheetResource.refId) || {}).url || '')
      : '',
    midiLink: midiResource
      ? String((getPrivateResourceEntry(midiResource.refId) || {}).url || '')
      : '',
    resources: resources,
  };
}

function getDefaultResourceRefId(lessonId, suffix) {
  return 'pvq-' + String(lessonId || '').trim() + '-' + String(suffix || '').trim();
}

function inferResourceProvider(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/cloudinary\.com/i.test(raw)) return 'cloudinary';
  if (/drive\.google\.com/i.test(raw)) return 'google_drive';
  return 'url';
}

function inferVideoType(url) {
  const provider = inferResourceProvider(url);
  if (provider === 'google_drive') return 'video_embed';
  return 'video_embed';
}

function inferSheetType() {
  return 'sheet_view';
}

function inferMidiType() {
  return 'midi';
}

function upsertLessonResource(resources, kind, fallbackTitle, fallbackRefId) {
  const nextResources = Array.isArray(resources) ? resources.slice() : [];
  const index = nextResources.findIndex(function (item) {
    if (!item) return false;
    if (kind === 'sheet') {
      return item.kind === 'sheet' || item.kind === 'pdf';
    }
    if (kind === 'midi') {
      return item.kind === 'midi' || item.kind === 'audio';
    }
    return item.kind === kind;
  });

  const nextItem = index !== -1
    ? Object.assign({}, nextResources[index])
    : {
        refId: fallbackRefId,
        kind: kind,
        title: fallbackTitle,
      };

  nextItem.refId = String(nextItem.refId || fallbackRefId).trim() || fallbackRefId;
  nextItem.kind = kind;
  nextItem.title = String(nextItem.title || fallbackTitle).trim() || fallbackTitle;

  if (index !== -1) {
    nextResources[index] = nextItem;
  } else {
    nextResources.push(nextItem);
  }

  return {
    resources: nextResources,
    item: nextItem,
  };
}

async function saveAdminLessonEditor(courseId, lessonId, payload) {
  const lessonFilePath = getLessonFilePath(courseId, lessonId);
  const currentLesson = await readJsonFile(lessonFilePath);
  let nextResources = Array.isArray(currentLesson.resources)
    ? currentLesson.resources.slice()
    : [];

  const nextLesson = Object.assign({}, currentLesson, {
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    durationMin: Number(payload.durationMin) || 0,
    status: String(payload.status || 'draft').trim().toLowerCase(),
  });

  const videoRefId = getDefaultResourceRefId(lessonId, 'vid');
  const sheetRefId = getDefaultResourceRefId(lessonId, 'sheet');
  const midiRefId = getDefaultResourceRefId(lessonId, 'midi');

  const videoUpsert = upsertLessonResource(
    nextResources,
    'video',
    'Video bài học',
    videoRefId
  );
  nextResources = videoUpsert.resources;

  const sheetUpsert = upsertLessonResource(
    nextResources,
    'sheet',
    'Sheet MusicXML',
    sheetRefId
  );
  nextResources = sheetUpsert.resources;

  const midiUpsert = upsertLessonResource(
    nextResources,
    'midi',
    'MIDI',
    midiRefId
  );
  nextResources = midiUpsert.resources;

  nextLesson.resources = nextResources;
  nextLesson.videoUrl = null;
  nextLesson.sheetUrl = null;
  nextLesson.audioUrl = null;

  await fs.writeFile(
    lessonFilePath,
    JSON.stringify(nextLesson, null, 2) + '\n',
    'utf8'
  );

  upsertPrivateResourceEntry(videoUpsert.item.refId, {
    type: inferVideoType(payload.videoLink),
    provider: inferResourceProvider(payload.videoLink),
    url: String(payload.videoLink || '').trim(),
  });

  upsertPrivateResourceEntry(sheetUpsert.item.refId, {
    type: inferSheetType(payload.musicxmlLink),
    provider: inferResourceProvider(payload.musicxmlLink),
    url: String(payload.musicxmlLink || '').trim(),
  });

  upsertPrivateResourceEntry(midiUpsert.item.refId, {
    type: inferMidiType(payload.midiLink),
    provider: inferResourceProvider(payload.midiLink),
    url: String(payload.midiLink || '').trim(),
  });

  return loadAdminLessonEditor(courseId, lessonId);
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
  listAdminCoursesSummary,
  loadAdminCourseDetail,
  loadAdminLessonEditor,
  saveAdminLessonEditor,
  listCoursesSummary,
  listLessonsByCourseId,
  normalizeLessonShape,
  loadCourseById,
  loadLessonById,
  loadCourseLessonPayload,
};
