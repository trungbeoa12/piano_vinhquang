/**
 * Ghép catalog bài học với bản đồ URL private (sau khi file private đã load).
 */
window.PVQ_mergeLessonResources = function (courseId, lessonId) {
  var found = window.PVQ_findLesson(courseId, lessonId);
  if (!found) return null;

  var map = window.PVQ_PRIVATE_RESOURCE_URLS;
  var items = [];

  found.lesson.resources.forEach(function (r) {
    var entry = map ? map[r.refId] : null;
    items.push({
      refId: r.refId,
      kind: r.kind,
      title: r.title,
      url: entry ? entry.url : null,
      assetType: entry ? entry.type : null,
    });
  });

  return {
    course: found.course,
    lesson: found.lesson,
    items: items,
  };
};
