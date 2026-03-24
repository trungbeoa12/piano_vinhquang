const fs = require('fs');
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const {
  normalizeEmail,
  createPasswordHash,
  verifyPassword,
  signJwt,
  verifyJwt,
  sanitizeUser,
  DEFAULT_TOKEN_TTL_SECONDS,
} = require('./lib/auth-service');
const {
  loadCourseById,
  loadCourseLessonPayload,
} = require('./lib/content-service');
const {
  resolveLessonResources,
  verifySignedResourceToken,
  getPrivateResourceEntry,
  DEFAULT_RESOURCE_LINK_TTL_SECONDS,
} = require('./lib/resource-service');
const { priceVndFromCourse } = require('./lib/order-service');

loadEnvFile(path.join(__dirname, '.env'));

const app = express();

const portEnvRaw = process.env.PORT;
const portExplicit =
  portEnvRaw !== undefined && String(portEnvRaw).trim() !== '';
const preferredPort = Number(portExplicit ? portEnvRaw : 3000);
const MAX_FALLBACK_PORTS = 15;

let listeningPort = preferredPort;

const mongoUriRaw = String(process.env.MONGODB_URI || '').trim();
const dbName = process.env.MONGODB_DB || 'piano_vinhquang';
const collectionName = process.env.MONGODB_CUSTOMERS_COLLECTION || 'customers';
const usersCollectionName = process.env.MONGODB_USERS_COLLECTION || 'users';
const enrollmentsCollectionName =
  process.env.MONGODB_ENROLLMENTS_COLLECTION || 'enrollments';
const ordersCollectionName =
  process.env.MONGODB_ORDERS_COLLECTION || 'orders';
const lessonProgressCollectionName =
  process.env.MONGODB_LESSON_PROGRESS_COLLECTION || 'lesson_progress';
const authJwtSecret =
  process.env.AUTH_JWT_SECRET || 'pvq_dev_only_change_me_immediately';
const authTokenTtlSeconds =
  Number(process.env.AUTH_TOKEN_TTL_SECONDS) ||
  DEFAULT_TOKEN_TTL_SECONDS;
const resourceLinkSecret =
  process.env.RESOURCE_LINK_SECRET || authJwtSecret;
const resourceLinkTtlSeconds =
  Number(process.env.RESOURCE_LINK_TTL_SECONDS) ||
  DEFAULT_RESOURCE_LINK_TTL_SECONDS;
const demoUserEmail = process.env.DEMO_USER_EMAIL || 'hocvien@demo.vn';
const demoUserPassword = process.env.DEMO_USER_PASSWORD || 'matkhau123';
const demoUserDisplayName =
  process.env.DEMO_USER_DISPLAY_NAME || 'Hoc vien demo';
const demoEnrollmentCourseIds = String(
  process.env.DEMO_ENROLLMENT_COURSE_IDS || 'piano-co-ban,dem-hat-thuc-chien'
)
  .split(',')
  .map(function (value) {
    return value.trim();
  })
  .filter(Boolean);
const corsAllowOrigin = String(process.env.CORS_ALLOW_ORIGIN || '*').trim();

let customersCollection;
let usersCollection;
let enrollmentsCollection;
let ordersCollection;
let lessonProgressCollection;
let mongoClient;
let httpServer;
let isShuttingDown = false;

function isRailwayEnvironment() {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL
  );
}

function resolveMongoUri() {
  if (mongoUriRaw) return mongoUriRaw;

  const isProduction = String(process.env.NODE_ENV || '').trim() === 'production';
  if (isProduction || isRailwayEnvironment()) {
    throw new Error(
      '[config] Missing MONGODB_URI. Set MONGODB_URI to your MongoDB Atlas connection string in Railway Variables.'
    );
  }

  const fallbackUri = 'mongodb://localhost:27017';
  console.warn(
    '[config] MONGODB_URI is not set. Falling back to %s for local development.',
    fallbackUri
  );
  return fallbackUri;
}

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');

    content.split(/\r?\n/).forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('[env] failed to load %s: %s', filePath, error.message);
  }
}

async function connectToMongo() {
  const mongoUri = resolveMongoUri();
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const db = mongoClient.db(dbName);
  customersCollection = db.collection(collectionName);
  usersCollection = db.collection(usersCollectionName);
  enrollmentsCollection = db.collection(enrollmentsCollectionName);
  ordersCollection = db.collection(ordersCollectionName);
  lessonProgressCollection = db.collection(lessonProgressCollectionName);

  await customersCollection.createIndex({ createdAt: -1 });
  await usersCollection.createIndex({ emailNormalized: 1 }, { unique: true });
  await enrollmentsCollection.createIndex(
    { userId: 1, courseId: 1 },
    { unique: true }
  );
  await enrollmentsCollection.createIndex({ userId: 1, status: 1 });
  await ordersCollection.createIndex({ userId: 1, createdAt: -1 });
  await ordersCollection.createIndex({ userId: 1, courseId: 1, status: 1 });
  await lessonProgressCollection.createIndex(
    { userId: 1, courseId: 1, lessonId: 1 },
    { unique: true }
  );
  await lessonProgressCollection.createIndex({ userId: 1, lastViewedAt: -1 });
  await ensureDemoUserAndEnrollments();

  console.log(
    '[mongo] connected to %s, db=%s, collections=%s,%s,%s,%s,%s',
    mongoUri,
    dbName,
    collectionName,
    usersCollectionName,
    enrollmentsCollectionName,
    ordersCollectionName,
    lessonProgressCollectionName
  );
}

async function ensureDemoUserAndEnrollments() {
  if (!usersCollection || !enrollmentsCollection) return;

  const emailNormalized = normalizeEmail(demoUserEmail);
  if (!emailNormalized || !demoUserPassword) return;

  let demoUser = await usersCollection.findOne({
    emailNormalized: emailNormalized,
  });

  if (!demoUser) {
    const now = new Date();
    const passwordHash = await createPasswordHash(demoUserPassword);
    const doc = {
      email: demoUserEmail,
      emailNormalized: emailNormalized,
      displayName: demoUserDisplayName,
      passwordHash: passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(doc);
    demoUser = Object.assign({}, doc, { _id: result.insertedId });
    console.log('[auth] seeded demo user: %s', demoUserEmail);
  }

  await Promise.all(
    demoEnrollmentCourseIds.map(function (courseId) {
      return enrollmentsCollection.updateOne(
        {
          userId: String(demoUser._id),
          courseId: courseId,
        },
        {
          $set: {
            status: 'active',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    })
  );
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[server] received %s, shutting down...', signal);

  try {
    if (httpServer) {
      await new Promise(function (resolve, reject) {
        httpServer.close(function (error) {
          if (error) return reject(error);
          resolve();
        });
      });
      const addr = httpServer.address();
      const released =
        typeof addr === 'object' && addr && addr.port != null
          ? addr.port
          : listeningPort;
      console.log('[server] port %d released', released);
    }

    if (mongoClient) {
      await mongoClient.close();
      console.log('[mongo] disconnected');
    }

    process.exit(0);
  } catch (error) {
    console.error('[server] graceful shutdown failed:', error);
    process.exit(1);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(function (req, res, next) {
  var requestOrigin = req.headers.origin;
  var allowAny = corsAllowOrigin === '*';
  var allowedOrigins = corsAllowOrigin
    .split(',')
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);
  var canUseOrigin = allowAny || (
    requestOrigin && allowedOrigins.indexOf(requestOrigin) !== -1
  );

  if (canUseOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowAny ? '*' : requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
});
app.use(express.static(path.join(__dirname)));

async function listEnrollmentCourseIds(userId) {
  if (!enrollmentsCollection || !userId) return [];

  const rows = await enrollmentsCollection
    .find({
      userId: String(userId),
      status: 'active',
    })
    .project({ courseId: 1 })
    .toArray();

  return rows
    .map(function (row) {
      return row.courseId;
    })
    .filter(Boolean);
}

async function hasActiveEnrollment(userId, courseId) {
  if (!enrollmentsCollection || !userId || !courseId) return false;

  const row = await enrollmentsCollection.findOne({
    userId: String(userId),
    courseId: String(courseId),
    status: 'active',
  });

  return !!row;
}

async function listLessonProgress(userId) {
  if (!lessonProgressCollection || !userId) return [];

  return lessonProgressCollection
    .find({ userId: String(userId) })
    .sort({ lastViewedAt: -1, updatedAt: -1 })
    .toArray();
}

async function upsertLessonProgress(userId, courseId, lessonId, payload) {
  if (!lessonProgressCollection || !userId || !courseId || !lessonId) {
    return null;
  }

  const now = new Date();
  const completed = !!payload.completed;
  const resumeAtSecRaw = Number(payload.resumeAtSec);
  const resumeAtSec = Number.isFinite(resumeAtSecRaw) && resumeAtSecRaw >= 0
    ? resumeAtSecRaw
    : 0;

  await lessonProgressCollection.updateOne(
    {
      userId: String(userId),
      courseId: String(courseId),
      lessonId: String(lessonId),
    },
    {
      $set: {
        completed: completed,
        resumeAtSec: resumeAtSec,
        lastViewedAt: now,
        updatedAt: now,
        completedAt: completed ? now : null,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return lessonProgressCollection.findOne({
    userId: String(userId),
    courseId: String(courseId),
    lessonId: String(lessonId),
  });
}

async function issueAuthResponse(user) {
  const safeUser = sanitizeUser(user);
  const enrolledCourseIds = await listEnrollmentCourseIds(safeUser.id);
  const token = signJwt(
    {
      sub: safeUser.id,
      email: safeUser.emailNormalized,
    },
    authJwtSecret,
    {
      expiresInSeconds: authTokenTtlSeconds,
    }
  );

  return {
    ok: true,
    token: token,
    expiresInSeconds: authTokenTtlSeconds,
    user: safeUser,
    enrolledCourseIds: enrolledCourseIds,
  };
}

async function requireAuth(req, res, next) {
  try {
    if (!usersCollection) {
      return res.status(503).json({
        ok: false,
        message: 'MongoDB connection is not ready yet.',
      });
    }

    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        message: 'Missing Bearer token.',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const payload = verifyJwt(token, authJwtSecret);

    if (!payload.sub || !ObjectId.isValid(payload.sub)) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid token payload.',
      });
    }

    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.sub),
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'User not found for token.',
      });
    }

    req.auth = {
      token: token,
      payload: payload,
      user: user,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid or expired token.',
    });
  }
}

app.get('/api/health', function (req, res) {
  res.json({
    ok: true,
    database: dbName,
    collections: {
      customers: collectionName,
      users: usersCollectionName,
      enrollments: enrollmentsCollectionName,
      orders: ordersCollectionName,
      lessonProgress: lessonProgressCollectionName,
    },
  });
});

app.post('/api/auth/register', async function (req, res) {
  try {
    if (!usersCollection) {
      return res.status(503).json({
        ok: false,
        message: 'MongoDB connection is not ready yet.',
      });
    }

    const emailRaw = String(req.body.email || '').trim();
    const emailNormalized = normalizeEmail(emailRaw);
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim();

    if (!emailNormalized || !emailNormalized.includes('@')) {
      return res.status(400).json({
        ok: false,
        message: 'A valid email is required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const existingUser = await usersCollection.findOne({
      emailNormalized: emailNormalized,
    });
    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: 'Email already registered.',
      });
    }

    const passwordHash = await createPasswordHash(password);
    const now = new Date();

    const doc = {
      email: emailRaw || emailNormalized,
      emailNormalized: emailNormalized,
      displayName: displayName || emailRaw.split('@')[0] || 'Hoc vien',
      passwordHash: passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(doc);
    const createdUser = Object.assign({}, doc, { _id: result.insertedId });

    return res.status(201).json(await issueAuthResponse(createdUser));
  } catch (error) {
    console.error('[api/auth/register] failed:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to register user.',
    });
  }
});

app.post('/api/auth/login', async function (req, res) {
  try {
    if (!usersCollection) {
      return res.status(503).json({
        ok: false,
        message: 'MongoDB connection is not ready yet.',
      });
    }

    const emailNormalized = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!emailNormalized || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email and password are required.',
      });
    }

    const user = await usersCollection.findOne({
      emailNormalized: emailNormalized,
    });
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid email or password.',
      });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid email or password.',
      });
    }

    return res.json(await issueAuthResponse(user));
  } catch (error) {
    console.error('[api/auth/login] failed:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to login.',
    });
  }
});

app.get('/api/me', requireAuth, async function (req, res) {
  return res.json({
    ok: true,
    user: sanitizeUser(req.auth.user),
    enrolledCourseIds: await listEnrollmentCourseIds(req.auth.user._id),
  });
});

app.get('/api/my/enrollments', requireAuth, async function (req, res) {
  return res.json({
    ok: true,
    enrolledCourseIds: await listEnrollmentCourseIds(req.auth.user._id),
  });
});

app.get('/api/my/progress', requireAuth, async function (req, res) {
  return res.json({
    ok: true,
    items: await listLessonProgress(req.auth.user._id),
  });
});

app.get('/api/courses/:courseId/access', requireAuth, async function (req, res) {
  const courseId = String(req.params.courseId || '').trim();
  if (!courseId) {
    return res.status(400).json({
      ok: false,
      message: 'courseId is required.',
    });
  }

  return res.json({
    ok: true,
    courseId: courseId,
    hasAccess: await hasActiveEnrollment(req.auth.user._id, courseId),
  });
});

app.post('/api/orders/create', requireAuth, async function (req, res) {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        ok: false,
        message: 'MongoDB connection is not ready yet.',
      });
    }

    const courseId = String(req.body.courseId || '').trim();
    if (!courseId) {
      return res.status(400).json({
        ok: false,
        message: 'courseId is required.',
      });
    }

    const course = await loadCourseById(courseId);
    const userIdStr = String(req.auth.user._id);
    const price = priceVndFromCourse(course);
    const now = new Date();

    const insertResult = await ordersCollection.insertOne({
      userId: userIdStr,
      courseId: courseId,
      price: price,
      status: 'pending',
      createdAt: now,
    });

    return res.status(201).json({
      ok: true,
      order: {
        id: insertResult.insertedId.toString(),
        userId: userIdStr,
        courseId: courseId,
        price: price,
        status: 'pending',
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('[api/orders/create] failed:', error);
    if (error && error.code === 'ENOENT') {
      return res.status(404).json({
        ok: false,
        message: 'Course not found.',
      });
    }
    return res.status(500).json({
      ok: false,
      message: 'Failed to create order.',
    });
  }
});

app.post('/api/orders/confirm', requireAuth, async function (req, res) {
  try {
    if (!ordersCollection || !enrollmentsCollection) {
      return res.status(503).json({
        ok: false,
        message: 'MongoDB connection is not ready yet.',
      });
    }

    const orderIdRaw = String(req.body.orderId || '').trim();
    if (!orderIdRaw || !ObjectId.isValid(orderIdRaw)) {
      return res.status(400).json({
        ok: false,
        message: 'Valid orderId is required.',
      });
    }

    const orderId = new ObjectId(orderIdRaw);
    const userIdStr = String(req.auth.user._id);

    const order = await ordersCollection.findOne({ _id: orderId });
    if (!order || order.userId !== userIdStr) {
      return res.status(404).json({
        ok: false,
        message: 'Order not found.',
      });
    }

    if (order.status === 'paid') {
      return res.json({
        ok: true,
        order: {
          id: order._id.toString(),
          userId: order.userId,
          courseId: order.courseId,
          price: order.price,
          status: 'paid',
          createdAt:
            order.createdAt instanceof Date
              ? order.createdAt.toISOString()
              : order.createdAt,
        },
        enrolledCourseIds: await listEnrollmentCourseIds(req.auth.user._id),
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        ok: false,
        message: 'Order cannot be confirmed.',
      });
    }

    const confirmResult = await ordersCollection.updateOne(
      { _id: orderId, userId: userIdStr, status: 'pending' },
      { $set: { status: 'paid' } }
    );

    if (confirmResult.matchedCount === 0) {
      const again = await ordersCollection.findOne({ _id: orderId });
      if (again && again.status === 'paid' && again.userId === userIdStr) {
        return res.json({
          ok: true,
          order: {
            id: again._id.toString(),
            userId: again.userId,
            courseId: again.courseId,
            price: again.price,
            status: 'paid',
            createdAt:
              again.createdAt instanceof Date
                ? again.createdAt.toISOString()
                : again.createdAt,
          },
          enrolledCourseIds: await listEnrollmentCourseIds(req.auth.user._id),
        });
      }
      return res.status(409).json({
        ok: false,
        message: 'Order state changed; refresh and try again.',
      });
    }

    const now = new Date();
    await enrollmentsCollection.updateOne(
      { userId: userIdStr, courseId: order.courseId },
      {
        $set: {
          status: 'active',
          source: 'order_confirm',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const paidOrder = await ordersCollection.findOne({ _id: orderId });
    return res.json({
      ok: true,
      order: {
        id: paidOrder._id.toString(),
        userId: paidOrder.userId,
        courseId: paidOrder.courseId,
        price: paidOrder.price,
        status: 'paid',
        createdAt:
          paidOrder.createdAt instanceof Date
            ? paidOrder.createdAt.toISOString()
            : paidOrder.createdAt,
      },
      enrolledCourseIds: await listEnrollmentCourseIds(req.auth.user._id),
    });
  } catch (error) {
    console.error('[api/orders/confirm] failed:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to confirm order.',
    });
  }
});

app.get(
  '/api/courses/:courseId/lessons/:lessonId',
  requireAuth,
  async function (req, res) {
    try {
      const courseId = String(req.params.courseId || '').trim();
      const lessonId = String(req.params.lessonId || '').trim();

      if (!courseId || !lessonId) {
        return res.status(400).json({
          ok: false,
          message: 'courseId and lessonId are required.',
        });
      }

      const hasAccess = await hasActiveEnrollment(req.auth.user._id, courseId);
      if (!hasAccess) {
        return res.status(403).json({
          ok: false,
          message: 'You do not have access to this course.',
        });
      }

      const payload = await loadCourseLessonPayload(courseId, lessonId);
      return res.json({
        ok: true,
        course: payload.course,
        lesson: payload.lesson,
        items: resolveLessonResources(
          payload.course,
          payload.lesson,
          resourceLinkSecret,
          { ttlSeconds: resourceLinkTtlSeconds }
        ),
      });
    } catch (error) {
      console.error('[api/course-lesson] failed:', error);
      return res.status(404).json({
        ok: false,
        message: 'Course or lesson not found.',
      });
    }
  }
);

app.post(
  '/api/courses/:courseId/lessons/:lessonId/progress',
  requireAuth,
  async function (req, res) {
    try {
      const courseId = String(req.params.courseId || '').trim();
      const lessonId = String(req.params.lessonId || '').trim();

      if (!courseId || !lessonId) {
        return res.status(400).json({
          ok: false,
          message: 'courseId and lessonId are required.',
        });
      }

      const hasAccess = await hasActiveEnrollment(req.auth.user._id, courseId);
      if (!hasAccess) {
        return res.status(403).json({
          ok: false,
          message: 'You do not have access to this course.',
        });
      }

      await loadCourseLessonPayload(courseId, lessonId);

      const item = await upsertLessonProgress(
        req.auth.user._id,
        courseId,
        lessonId,
        {
          completed: req.body.completed,
          resumeAtSec: req.body.resumeAtSec,
        }
      );

      return res.json({
        ok: true,
        item: item,
      });
    } catch (error) {
      return res.status(404).json({
        ok: false,
        message: 'Course or lesson not found.',
      });
    }
  }
);

app.get('/api/resources/:refId/open', function (req, res) {
  try {
    const refId = String(req.params.refId || '').trim();
    const token = String(req.query.token || '').trim();

    if (!refId || !token) {
      return res.status(400).json({
        ok: false,
        message: 'refId and token are required.',
      });
    }

    verifySignedResourceToken(token, refId, resourceLinkSecret);

    const entry = getPrivateResourceEntry(refId);
    if (!entry || !entry.url) {
      return res.status(404).json({
        ok: false,
        message: 'Resource not found.',
      });
    }

    return res.redirect(entry.url);
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid or expired resource link.',
    });
  }
});

app.post('/api/customers', async function (req, res) {
  try {
    if (!customersCollection) {
      return res.status(503).json({
        ok: false,
        message: 'MongoDB connection is not ready yet.',
      });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const message = String(req.body.message || '').trim();
    const interest = String(req.body.interest || '').trim();
    const interestLabel = String(req.body.interestLabel || '').trim();

    if (!name || !email || !interest) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields: name, email, interest.',
      });
    }

    const doc = {
      name: name,
      email: email,
      phone: phone || null,
      message: message || null,
      interest: interest,
      interestLabel: interestLabel || interest,
      source: 'website_contact_form',
      createdAt: new Date(),
    };

    const result = await customersCollection.insertOne(doc);

    return res.status(201).json({
      ok: true,
      insertedId: result.insertedId,
      message: 'Customer lead saved successfully.',
    });
  } catch (error) {
    console.error('[api/customers] insert failed:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to save customer lead.',
    });
  }
});

app.get('*', function (req, res) {
  const requestPath = req.path === '/' ? 'index.html' : req.path.slice(1);
  res.sendFile(path.join(__dirname, requestPath), function (error) {
    if (error) {
      res.status(404).sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

function startHttpServer() {
  const server = app.listen(listeningPort);

  server.once('listening', function () {
    httpServer = server;
    const addr = server.address();
    listeningPort =
      typeof addr === 'object' && addr && addr.port != null
        ? addr.port
        : listeningPort;
    console.log('[server] running at http://localhost:%d', listeningPort);
  });

  server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      if (portExplicit) {
        console.error(
          '[server] Lỗi: port %d đang bị chiếm (biến môi trường PORT=%s).',
          listeningPort,
          portEnvRaw
        );
        console.error(
          '[server] Gợi ý: dừng process khác, hoặc chạy lại với port khác, ví dụ: PORT=3001 npm start'
        );
        console.error(
          '[server] Kiểm tra process đang dùng port (Ubuntu): ss -ltnp | grep :%d   hoặc   lsof -i :%d',
          listeningPort,
          listeningPort
        );
        process.exit(1);
        return;
      }

      const nextPort = listeningPort + 1;
      const upper = preferredPort + MAX_FALLBACK_PORTS - 1;
      if (nextPort > upper) {
        console.error(
          '[server] Không tìm thấy port trống từ %d đến %d.',
          preferredPort,
          upper
        );
        console.error(
          '[server] Hãy tự chọn port: PORT=3010 npm start   hoặc giải phóng một port trong khoảng trên.'
        );
        process.exit(1);
        return;
      }

      console.warn(
        '[server] Port %d đang bận. Thử port %d...',
        listeningPort,
        nextPort
      );

      server.close(function () {
        listeningPort = nextPort;
        startHttpServer();
      });
      return;
    }

    console.error('[server] Không thể lắng nghe (listen):', err);
    process.exit(1);
  });
}

connectToMongo()
  .then(function () {
    startHttpServer();
  })
  .catch(function (error) {
    console.error('[mongo] connection failed:', error);
    process.exit(1);
  });

process.on('SIGINT', function () {
  shutdown('SIGINT');
});

process.on('SIGTERM', function () {
  shutdown('SIGTERM');
});
