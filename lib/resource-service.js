const { signJwt, verifyJwt } = require('./auth-service');
const privateResourceMap = require('./private-resource-map');

const DEFAULT_RESOURCE_LINK_TTL_SECONDS = 60 * 15;

function getPrivateResourceEntry(refId) {
  return privateResourceMap[String(refId || '').trim()] || null;
}

function buildSignedResourceUrl(refId, courseId, lessonId, secret, options) {
  const ttlSeconds =
    Number(options && options.ttlSeconds) || DEFAULT_RESOURCE_LINK_TTL_SECONDS;
  const token = signJwt(
    {
      typ: 'resource',
      sub: String(refId || '').trim(),
      courseId: String(courseId || '').trim(),
      lessonId: String(lessonId || '').trim(),
    },
    secret,
    { expiresInSeconds: ttlSeconds }
  );

  return (
    '/api/resources/' +
    encodeURIComponent(refId) +
    '/open?token=' +
    encodeURIComponent(token)
  );
}

function resolveLessonResources(course, lesson, secret, options) {
  const resources = Array.isArray(lesson && lesson.resources)
    ? lesson.resources
    : [];

  return resources.map(function (resource) {
    const refId = String(resource.refId || '').trim();
    const entry = getPrivateResourceEntry(refId);

    return {
      refId: refId,
      kind: resource.kind,
      title: resource.title,
      assetType: entry ? entry.type : null,
      url: entry
        ? buildSignedResourceUrl(refId, course.id, lesson.id, secret, options)
        : null,
    };
  });
}

function verifySignedResourceToken(token, refId, secret) {
  const payload = verifyJwt(token, secret);

  if (payload.typ !== 'resource') {
    throw new Error('Invalid resource token type.');
  }

  if (String(payload.sub || '') !== String(refId || '')) {
    throw new Error('Resource token does not match refId.');
  }

  return payload;
}

module.exports = {
  DEFAULT_RESOURCE_LINK_TTL_SECONDS,
  getPrivateResourceEntry,
  resolveLessonResources,
  verifySignedResourceToken,
};
