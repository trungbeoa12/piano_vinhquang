const fs = require('fs');
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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
  listCoursesSummary,
  listLessonsByCourseId,
  normalizeLessonShape,
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
const corsConfig = resolveCorsConfig();
const authRateLimitWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;
const orderRateLimitWindowMs = Number(process.env.ORDER_RATE_LIMIT_WINDOW_MS) || (10 * 60 * 1000);
const orderRateLimitMax = Number(process.env.ORDER_RATE_LIMIT_MAX) || 30;
const contactRateLimitWindowMs = Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS) || (10 * 60 * 1000);
const contactRateLimitMax = Number(process.env.CONTACT_RATE_LIMIT_MAX) || 20;
const paymentBankCode = getRequiredTrimmedString(process.env.PAYMENT_BANK_CODE) || 'ICB';
const paymentBankName = getRequiredTrimmedString(process.env.PAYMENT_BANK_NAME) || 'VietinBank';
const paymentAccountNumber = getRequiredTrimmedString(
  process.env.PAYMENT_BANK_ACCOUNT_NUMBER || process.env.PAYMENT_ACCOUNT_NUMBER
) || '103866619999';
const paymentAccountName = getRequiredTrimmedString(
  process.env.PAYMENT_BANK_ACCOUNT_NAME || process.env.PAYMENT_ACCOUNT_NAME
) || 'Đỗ Thành Trung';
const orderTransferCodePrefix =
  getRequiredTrimmedString(process.env.ORDER_TRANSFER_CODE_PREFIX) || 'PVQ';
const adminConfirmApiKey = getRequiredTrimmedString(
  process.env.ADMIN_ACTION_SECRET || process.env.ADMIN_CONFIRM_API_KEY
) || (
  isProductionEnvironment() || isRailwayEnvironment()
    ? ''
    : 'pvq_admin_dev_key'
);

let customersCollection;
let usersCollection;
let enrollmentsCollection;
let ordersCollection;
let lessonProgressCollection;
let mongoClient;
let httpServer;
let isShuttingDown = false;

const ORDER_STATUS_PENDING_PAYMENT = 'pending_payment';
const ORDER_STATUS_PAYMENT_SUBMITTED = 'payment_submitted';
const ORDER_STATUS_CONFIRMED = 'confirmed';
const ORDER_STATUS_CANCELLED = 'cancelled';
const ORDER_OPEN_STATUSES = [
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PAYMENT_SUBMITTED,
  'pending',
];

function isRailwayEnvironment() {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL
  );
}

function isProductionEnvironment() {
  return String(process.env.NODE_ENV || '').trim() === 'production';
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

function validateProductionSecrets() {
  const isHosted = isProductionEnvironment() || isRailwayEnvironment();
  if (!isHosted) return;

  if (!adminConfirmApiKey) {
    throw new Error(
      '[config] Missing ADMIN_ACTION_SECRET (or ADMIN_CONFIRM_API_KEY). Set a strong key for admin order confirmation API.'
    );
  }
}

function resolveCorsConfig() {
  const isProduction = isProductionEnvironment();
  const isHosted = isProduction || isRailwayEnvironment();
  const configuredOrigins = String(process.env.CORS_ALLOW_ORIGIN || '')
    .split(',')
    .map(function (value) {
      return value.trim();
    })
    .filter(Boolean);
  const vercelFrontendOrigin = String(process.env.VERCEL_FRONTEND_ORIGIN || '').trim();
  if (vercelFrontendOrigin) {
    configuredOrigins.push(vercelFrontendOrigin);
  }

  const dedupedConfiguredOrigins = Array.from(new Set(configuredOrigins));
  if (isHosted && dedupedConfiguredOrigins.indexOf('*') !== -1) {
    throw new Error(
      '[config] CORS_ALLOW_ORIGIN cannot contain "*" in production. Set explicit frontend origins.'
    );
  }

  if (isHosted && dedupedConfiguredOrigins.length === 0) {
    throw new Error(
      '[config] Missing CORS_ALLOW_ORIGIN. Set your Vercel frontend domain in Railway Variables.'
    );
  }

  const localDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
  const origins = dedupedConfiguredOrigins.length
    ? dedupedConfiguredOrigins
    : localDevOrigins;
  const credentials = String(process.env.CORS_ALLOW_CREDENTIALS || 'true')
    .trim()
    .toLowerCase() !== 'false';

  return {
    origins: origins,
    credentials: credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

function sendError(res, statusCode, code, message, details) {
  const payload = {
    ok: false,
    message: message,
    error: {
      code: code,
      message: message,
    },
  };
  if (details !== undefined) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
}

function logServerError(scope, error, meta) {
  const extra = meta ? ` meta=${JSON.stringify(meta)}` : '';
  console.error(`[${scope}] failed:${extra}`, error);
}

function requireMongoCollection(collectionRef, res) {
  if (!collectionRef) {
    sendError(
      res,
      503,
      'SERVICE_UNAVAILABLE',
      'MongoDB connection is not ready yet.'
    );
    return false;
  }
  return true;
}

function getRequiredTrimmedString(value) {
  return String(value || '').trim();
}

function createApiRateLimiter(windowMs, max, scopeName) {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: function (req, res) {
      return sendError(
        res,
        429,
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        { scope: scopeName }
      );
    },
  });
}

function generateTransferCode() {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${orderTransferCodePrefix}${Date.now().toString(36).toUpperCase()}${randomPart}`;
}

function buildQrImageUrl(amount, transferCode) {
  const query = new URLSearchParams({
    amount: String(Math.round(Number(amount) || 0)),
    addInfo: transferCode,
    accountName: paymentAccountName,
  });
  return `https://img.vietqr.io/image/${paymentBankCode}-${paymentAccountNumber}-compact2.png?${query.toString()}`;
}

function buildCheckoutPayload(order) {
  const amount = Number(order.amount !== undefined ? order.amount : order.price) || 0;
  const transferCode = String(order.transferCode || '');
  const bankName = String(order.bankName || paymentBankName);
  const bankAccountNumber = String(order.bankAccountNumber || paymentAccountNumber);
  const bankAccountName = String(order.bankAccountName || paymentAccountName);
  return {
    amount: amount,
    bank: {
      bankCode: paymentBankCode,
      bankName: bankName,
      accountNumber: bankAccountNumber,
      accountName: bankAccountName,
    },
    transferCode: transferCode,
    qr: {
      imageUrl: buildQrImageUrl(amount, transferCode),
      data: `${paymentBankCode}|${bankAccountNumber}|${amount}|${transferCode}`,
    },
  };
}

async function confirmOrderAsPaid(orderId, confirmedBy, adminNote) {
  const order = await ordersCollection.findOne({ _id: orderId });
  if (!order) {
    return { ok: false, statusCode: 404, code: 'ORDER_NOT_FOUND', message: 'Order not found.' };
  }

  if (order.status === ORDER_STATUS_CONFIRMED || order.status === 'paid') {
    return { ok: true, order: order };
  }

  if (order.status !== ORDER_STATUS_PAYMENT_SUBMITTED) {
    return {
      ok: false,
      statusCode: 400,
      code: 'ORDER_INVALID_STATE',
      message: 'Only submitted payments can be confirmed.',
    };
  }

  const updated = await ordersCollection.findOneAndUpdate(
    { _id: orderId, status: ORDER_STATUS_PAYMENT_SUBMITTED },
    {
      $set: {
        status: ORDER_STATUS_CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy: confirmedBy || 'admin',
        note: adminNote ? String(adminNote).trim().slice(0, 500) : order.note || null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  const paidOrder = updated && updated.value ? updated.value : await ordersCollection.findOne({ _id: orderId });
  if (!paidOrder) {
    return { ok: false, statusCode: 404, code: 'ORDER_NOT_FOUND', message: 'Order not found.' };
  }

  const now = new Date();
  await enrollmentsCollection.updateOne(
    { userId: paidOrder.userId, courseId: paidOrder.courseId },
    {
      $set: {
        status: 'active',
        source: 'order_confirm_admin',
        sourceOrderId: paidOrder._id.toString(),
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return { ok: true, order: paidOrder };
}

function requireAdminKey(req, res, next) {
  const key = getRequiredTrimmedString(req.headers['x-admin-key']);
  if (!adminConfirmApiKey || !key || key !== adminConfirmApiKey) {
    return sendError(res, 401, 'ADMIN_UNAUTHORIZED', 'Invalid admin key.');
  }
  return next();
}

function serializeOrder(orderDoc) {
  if (!orderDoc) return null;
  const amount = Number(orderDoc.amount !== undefined ? orderDoc.amount : orderDoc.price) || 0;
  return {
    id: orderDoc._id.toString(),
    userId: orderDoc.userId,
    courseId: orderDoc.courseId,
    amount: amount,
    price: amount,
    transferCode: orderDoc.transferCode || null,
    bankName: orderDoc.bankName || paymentBankName,
    bankAccountNumber: orderDoc.bankAccountNumber || paymentAccountNumber,
    bankAccountName: orderDoc.bankAccountName || paymentAccountName,
    status: orderDoc.status,
    paymentMethod: orderDoc.paymentMethod || 'bank_transfer_manual',
    createdAt:
      orderDoc.createdAt instanceof Date
        ? orderDoc.createdAt.toISOString()
        : orderDoc.createdAt,
    updatedAt:
      orderDoc.updatedAt instanceof Date
        ? orderDoc.updatedAt.toISOString()
        : orderDoc.updatedAt || null,
    paymentSubmittedAt:
      orderDoc.paymentSubmittedAt instanceof Date
        ? orderDoc.paymentSubmittedAt.toISOString()
        : orderDoc.paymentSubmittedAt || null,
    confirmedAt:
      orderDoc.confirmedAt instanceof Date
        ? orderDoc.confirmedAt.toISOString()
        : orderDoc.confirmedAt || null,
    confirmedBy: orderDoc.confirmedBy || null,
    note: orderDoc.note || null,
  };
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
app.disable('x-powered-by');
const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (corsConfig.origins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  allowedHeaders: corsConfig.allowedHeaders,
  optionsSuccessStatus: 204,
});
app.use(corsMiddleware);
app.options('*', corsMiddleware);

const authRateLimiter = createApiRateLimiter(
  authRateLimitWindowMs,
  authRateLimitMax,
  'auth'
);
const orderRateLimiter = createApiRateLimiter(
  orderRateLimitWindowMs,
  orderRateLimitMax,
  'orders'
);
const contactRateLimiter = createApiRateLimiter(
  contactRateLimitWindowMs,
  contactRateLimitMax,
  'contact'
);

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

async function listOrdersByUserId(userId, filters) {
  if (!ordersCollection || !userId) return [];

  const query = {
    userId: String(userId),
  };
  const settings = filters || {};

  if (settings.courseId) {
    query.courseId = String(settings.courseId);
  }
  if (settings.status) {
    query.status = String(settings.status);
  }
  if (Array.isArray(settings.statusIn) && settings.statusIn.length) {
    query.status = { $in: settings.statusIn.map(String) };
  }

  return ordersCollection.find(query).sort({ createdAt: -1 }).toArray();
}

function buildOrderApiPayload(orderDoc, extra) {
  const payload = {
    order: serializeOrder(orderDoc),
    checkout: buildCheckoutPayload(orderDoc),
  };
  if (extra && typeof extra === 'object') {
    Object.assign(payload, extra);
  }
  return payload;
}

async function enrichOrderForAdmin(orderDoc) {
  if (!orderDoc) return null;

  let user = null;
  let course = null;

  if (usersCollection && ObjectId.isValid(orderDoc.userId)) {
    user = await usersCollection.findOne(
      { _id: new ObjectId(orderDoc.userId) },
      { projection: { email: 1, displayName: 1 } }
    );
  }

  try {
    course = await loadCourseById(orderDoc.courseId);
  } catch (error) {
    course = null;
  }

  return Object.assign({}, serializeOrder(orderDoc), {
    user: user
      ? {
          id: String(user._id),
          email: user.email || '',
          displayName: user.displayName || '',
        }
      : {
          id: String(orderDoc.userId || ''),
          email: '',
          displayName: '',
        },
    course: course
      ? {
          id: course.id,
          title: course.title || orderDoc.courseId,
        }
      : {
          id: String(orderDoc.courseId || ''),
          title: String(orderDoc.courseId || ''),
        },
  });
}

async function handleCreateOrder(req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    if (!requireMongoCollection(enrollmentsCollection, res)) return;

    const courseId = getRequiredTrimmedString(req.body.courseId);
    if (!courseId) {
      return sendError(res, 400, 'VALIDATION_COURSE_ID', 'courseId is required.');
    }

    const course = await loadCourseById(courseId);
    const userIdStr = String(req.auth.user._id);
    const amount = priceVndFromCourse(course);
    const now = new Date();

    if (await hasActiveEnrollment(req.auth.user._id, courseId)) {
      return sendError(
        res,
        409,
        'COURSE_ALREADY_ENROLLED',
        'You already have access to this course.'
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return sendError(
        res,
        422,
        'COURSE_PRICE_NOT_READY',
        'Course price is not ready for checkout yet.'
      );
    }

    const latestPending = await ordersCollection.findOne(
      {
        userId: userIdStr,
        courseId: courseId,
        status: { $in: ORDER_OPEN_STATUSES },
      },
      { sort: { createdAt: -1 } }
    );

    if (latestPending) {
      return res.status(200).json(Object.assign({
        ok: true,
        reusedExistingOrder: true,
      }, buildOrderApiPayload(latestPending)));
    }

    const transferCode = generateTransferCode();
    const insertResult = await ordersCollection.insertOne({
      userId: userIdStr,
      courseId: courseId,
      amount: amount,
      price: amount,
      transferCode: transferCode,
      bankName: paymentBankName,
      bankAccountNumber: paymentAccountNumber,
      bankAccountName: paymentAccountName,
      paymentMethod: 'bank_transfer_manual',
      status: ORDER_STATUS_PENDING_PAYMENT,
      createdAt: now,
      updatedAt: now,
      paymentSubmittedAt: null,
      confirmedAt: null,
      confirmedBy: null,
      note: null,
    });
    const createdOrder = await ordersCollection.findOne({ _id: insertResult.insertedId });

    return res.status(201).json(Object.assign({
      ok: true,
      reusedExistingOrder: false,
    }, buildOrderApiPayload(createdOrder)));
  } catch (error) {
    logServerError('api/orders/create', error);
    if (error && error.code === 'ENOENT') {
      return sendError(res, 404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    return sendError(res, 500, 'ORDER_CREATE_FAILED', 'Failed to create order.');
  }
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
    if (!requireMongoCollection(usersCollection, res)) return;

    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'AUTH_MISSING_TOKEN', 'Missing Bearer token.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const payload = verifyJwt(token, authJwtSecret);

    if (!payload.sub || !ObjectId.isValid(payload.sub)) {
      return sendError(res, 401, 'AUTH_INVALID_TOKEN', 'Invalid token payload.');
    }

    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.sub),
    });

    if (!user) {
      return sendError(res, 401, 'AUTH_USER_NOT_FOUND', 'User not found for token.');
    }

    req.auth = {
      token: token,
      payload: payload,
      user: user,
    };
    next();
  } catch (error) {
    return sendError(res, 401, 'AUTH_INVALID_OR_EXPIRED', 'Invalid or expired token.');
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

app.post('/api/auth/register', authRateLimiter, async function (req, res) {
  try {
    if (!requireMongoCollection(usersCollection, res)) return;

    const emailRaw = getRequiredTrimmedString(req.body.email);
    const emailNormalized = normalizeEmail(emailRaw);
    const password = String(req.body.password || '');
    const displayName = getRequiredTrimmedString(req.body.displayName);

    if (!emailNormalized || !emailNormalized.includes('@')) {
      return sendError(res, 400, 'VALIDATION_EMAIL', 'A valid email is required.');
    }

    if (password.length < 8) {
      return sendError(
        res,
        400,
        'VALIDATION_PASSWORD',
        'Password must be at least 8 characters.'
      );
    }

    const existingUser = await usersCollection.findOne({
      emailNormalized: emailNormalized,
    });
    if (existingUser) {
      return sendError(res, 409, 'AUTH_EMAIL_EXISTS', 'Email already registered.');
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
    logServerError('api/auth/register', error);
    return sendError(res, 500, 'AUTH_REGISTER_FAILED', 'Failed to register user.');
  }
});

app.post('/api/auth/login', authRateLimiter, async function (req, res) {
  try {
    if (!requireMongoCollection(usersCollection, res)) return;

    const emailNormalized = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!emailNormalized || !password) {
      return sendError(
        res,
        400,
        'VALIDATION_LOGIN_REQUIRED',
        'Email and password are required.'
      );
    }

    const user = await usersCollection.findOne({
      emailNormalized: emailNormalized,
    });
    if (!user) {
      return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    return res.json(await issueAuthResponse(user));
  } catch (error) {
    logServerError('api/auth/login', error);
    return sendError(res, 500, 'AUTH_LOGIN_FAILED', 'Failed to login.');
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

app.get('/api/me/enrollments', requireAuth, async function (req, res) {
  return res.json({
    ok: true,
    enrolledCourseIds: await listEnrollmentCourseIds(req.auth.user._id),
  });
});

app.get('/api/me/orders', requireAuth, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    const courseId = getRequiredTrimmedString(req.query.courseId);
    const status = getRequiredTrimmedString(req.query.status);
    const items = await listOrdersByUserId(req.auth.user._id, {
      courseId: courseId || undefined,
      status: status || undefined,
    });
    return res.json({
      ok: true,
      items: items.map(serializeOrder),
    });
  } catch (error) {
    logServerError('api/me/orders', error);
    return sendError(res, 500, 'MY_ORDERS_FAILED', 'Failed to load your orders.');
  }
});

app.get('/api/orders/my', requireAuth, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    const courseId = getRequiredTrimmedString(req.query.courseId);
    const status = getRequiredTrimmedString(req.query.status);
    const items = await listOrdersByUserId(req.auth.user._id, {
      courseId: courseId || undefined,
      status: status || undefined,
    });
    return res.json({
      ok: true,
      items: items.map(serializeOrder),
    });
  } catch (error) {
    logServerError('api/orders/my', error);
    return sendError(res, 500, 'MY_ORDERS_FAILED', 'Failed to load your orders.');
  }
});

app.get('/api/my/progress', requireAuth, async function (req, res) {
  return res.json({
    ok: true,
    items: await listLessonProgress(req.auth.user._id),
  });
});

app.get('/api/courses', async function (req, res) {
  try {
    return res.json({
      ok: true,
      items: await listCoursesSummary(),
    });
  } catch (error) {
    logServerError('api/courses', error);
    return sendError(res, 500, 'COURSES_LIST_FAILED', 'Failed to load courses.');
  }
});

app.get('/api/courses/:courseId', async function (req, res) {
  try {
    const courseId = getRequiredTrimmedString(req.params.courseId);
    if (!courseId) {
      return sendError(res, 400, 'VALIDATION_COURSE_ID', 'courseId is required.');
    }

    const courses = await listCoursesSummary();
    const course = courses.find(function (item) {
      return item.id === courseId;
    });
    if (!course) {
      return sendError(res, 404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    return res.json({
      ok: true,
      course: course,
    });
  } catch (error) {
    logServerError('api/course-detail', error);
    return sendError(res, 500, 'COURSE_DETAIL_FAILED', 'Failed to load course detail.');
  }
});

app.get('/api/courses/:courseId/lessons', async function (req, res) {
  try {
    const courseId = getRequiredTrimmedString(req.params.courseId);
    if (!courseId) {
      return sendError(res, 400, 'VALIDATION_COURSE_ID', 'courseId is required.');
    }

    await loadCourseById(courseId);
    const lessons = await listLessonsByCourseId(courseId);
    return res.json({
      ok: true,
      courseId: courseId,
      items: lessons,
    });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return sendError(res, 404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    logServerError('api/course-lessons', error);
    return sendError(res, 500, 'COURSE_LESSONS_FAILED', 'Failed to load lessons.');
  }
});

app.get('/api/courses/:courseId/access', requireAuth, async function (req, res) {
  const courseId = getRequiredTrimmedString(req.params.courseId);
  if (!courseId) {
    return sendError(res, 400, 'VALIDATION_COURSE_ID', 'courseId is required.');
  }

  return res.json({
    ok: true,
    courseId: courseId,
    hasAccess: await hasActiveEnrollment(req.auth.user._id, courseId),
  });
});

app.post('/api/orders/create', orderRateLimiter, requireAuth, handleCreateOrder);

app.post('/api/orders', orderRateLimiter, requireAuth, handleCreateOrder);

app.get('/api/orders/:orderId', requireAuth, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    const orderIdRaw = getRequiredTrimmedString(req.params.orderId);
    if (!orderIdRaw || !ObjectId.isValid(orderIdRaw)) {
      return sendError(res, 400, 'VALIDATION_ORDER_ID', 'Valid orderId is required.');
    }

    const order = await ordersCollection.findOne({ _id: new ObjectId(orderIdRaw) });
    if (!order) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    const isOwner = String(order.userId) === String(req.auth.user._id);
    const adminKey = getRequiredTrimmedString(req.headers['x-admin-key']);
    const isAdmin = !!adminConfirmApiKey && adminKey === adminConfirmApiKey;
    if (!isOwner && !isAdmin) {
      return sendError(res, 403, 'ORDER_FORBIDDEN', 'You cannot access this order.');
    }

    return res.json({
      ok: true,
      order: serializeOrder(order),
      checkout: buildCheckoutPayload(order),
    });
  } catch (error) {
    logServerError('api/orders/get', error);
    return sendError(res, 500, 'ORDER_GET_FAILED', 'Failed to load order.');
  }
});

app.post('/api/orders/:orderId/mark-paid', orderRateLimiter, requireAuth, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    const orderIdRaw = getRequiredTrimmedString(req.params.orderId);
    if (!orderIdRaw || !ObjectId.isValid(orderIdRaw)) {
      return sendError(res, 400, 'VALIDATION_ORDER_ID', 'Valid orderId is required.');
    }

    const orderId = new ObjectId(orderIdRaw);
    const order = await ordersCollection.findOne({ _id: orderId });
    if (!order) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    if (String(order.userId) !== String(req.auth.user._id)) {
      return sendError(res, 403, 'ORDER_FORBIDDEN', 'You cannot update this order.');
    }
    if (order.status === ORDER_STATUS_CONFIRMED) {
      return sendError(res, 409, 'ORDER_ALREADY_CONFIRMED', 'This order is already confirmed.');
    }
    if (
      order.status !== ORDER_STATUS_PENDING_PAYMENT &&
      order.status !== ORDER_STATUS_PAYMENT_SUBMITTED &&
      order.status !== 'pending'
    ) {
      return sendError(res, 400, 'ORDER_INVALID_STATE', 'Order cannot be marked as paid.');
    }

    if (order.status === ORDER_STATUS_PAYMENT_SUBMITTED) {
      return res.json(Object.assign({ ok: true }, buildOrderApiPayload(order)));
    }

    const now = new Date();
    const updated = await ordersCollection.findOneAndUpdate(
      {
        _id: orderId,
        userId: String(req.auth.user._id),
        status: { $in: [ORDER_STATUS_PENDING_PAYMENT, 'pending'] },
      },
      {
        $set: {
          status: ORDER_STATUS_PAYMENT_SUBMITTED,
          paymentSubmittedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    const nextOrder =
      updated && updated.value
        ? updated.value
        : await ordersCollection.findOne({ _id: orderId });

    return res.json(Object.assign({ ok: true }, buildOrderApiPayload(nextOrder)));
  } catch (error) {
    logServerError('api/orders/mark-paid', error);
    return sendError(res, 500, 'ORDER_MARK_PAID_FAILED', 'Failed to mark order as paid.');
  }
});

app.get('/api/admin/orders', requireAdminKey, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    const status = getRequiredTrimmedString(req.query.status);
    const query = {};
    if (status) {
      if (
        [
          ORDER_STATUS_PENDING_PAYMENT,
          ORDER_STATUS_PAYMENT_SUBMITTED,
          ORDER_STATUS_CONFIRMED,
          ORDER_STATUS_CANCELLED,
        ].indexOf(status) === -1
      ) {
        return sendError(res, 400, 'VALIDATION_ORDER_STATUS', 'Invalid order status filter.');
      }
      query.status = status;
    } else {
      query.status = ORDER_STATUS_PAYMENT_SUBMITTED;
    }

    const items = await ordersCollection.find(query).sort({ createdAt: -1 }).limit(200).toArray();
    const enrichedItems = await Promise.all(items.map(enrichOrderForAdmin));
    return res.json({
      ok: true,
      items: enrichedItems,
    });
  } catch (error) {
    logServerError('api/admin/orders/list', error);
    return sendError(res, 500, 'ADMIN_ORDERS_LIST_FAILED', 'Failed to load orders.');
  }
});

app.post('/api/orders/confirm', orderRateLimiter, requireAdminKey, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    if (!requireMongoCollection(enrollmentsCollection, res)) return;

    const orderIdRaw = getRequiredTrimmedString(req.body.orderId);
    if (!orderIdRaw || !ObjectId.isValid(orderIdRaw)) {
      return sendError(res, 400, 'VALIDATION_ORDER_ID', 'Valid orderId is required.');
    }

    const orderId = new ObjectId(orderIdRaw);
    const adminNote = getRequiredTrimmedString(req.body.adminNote);
    const result = await confirmOrderAsPaid(orderId, 'admin', adminNote);
    if (!result.ok) {
      return sendError(res, result.statusCode, result.code, result.message);
    }
    const paidOrder = result.order;
    return res.json({
      ok: true,
      order: serializeOrder(paidOrder),
      checkout: buildCheckoutPayload(paidOrder),
    });
  } catch (error) {
    logServerError('api/orders/confirm', error);
    return sendError(res, 500, 'ORDER_CONFIRM_FAILED', 'Failed to confirm order.');
  }
});

app.post('/api/admin/orders/confirm', orderRateLimiter, requireAdminKey, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    if (!requireMongoCollection(enrollmentsCollection, res)) return;

    const orderIdRaw = getRequiredTrimmedString(req.body.orderId);
    if (!orderIdRaw || !ObjectId.isValid(orderIdRaw)) {
      return sendError(res, 400, 'VALIDATION_ORDER_ID', 'Valid orderId is required.');
    }

    const adminNote = getRequiredTrimmedString(req.body.adminNote);
    const adminId = getRequiredTrimmedString(req.body.confirmedBy) || 'admin';
    const result = await confirmOrderAsPaid(new ObjectId(orderIdRaw), adminId, adminNote);
    if (!result.ok) {
      return sendError(res, result.statusCode, result.code, result.message);
    }
    const paidOrder = result.order;

    return res.json({
      ok: true,
      order: serializeOrder(paidOrder),
      checkout: buildCheckoutPayload(paidOrder),
    });
  } catch (error) {
    logServerError('api/admin/orders/confirm', error);
    return sendError(res, 500, 'ADMIN_ORDER_CONFIRM_FAILED', 'Failed to confirm order.');
  }
});

app.post('/api/admin/orders/:orderId/confirm', orderRateLimiter, requireAdminKey, async function (req, res) {
  try {
    if (!requireMongoCollection(ordersCollection, res)) return;
    if (!requireMongoCollection(enrollmentsCollection, res)) return;

    const orderIdRaw = getRequiredTrimmedString(req.params.orderId);
    if (!orderIdRaw || !ObjectId.isValid(orderIdRaw)) {
      return sendError(res, 400, 'VALIDATION_ORDER_ID', 'Valid orderId is required.');
    }

    const adminNote = getRequiredTrimmedString(req.body.adminNote);
    const adminId = getRequiredTrimmedString(req.body.confirmedBy) || 'admin';
    const result = await confirmOrderAsPaid(new ObjectId(orderIdRaw), adminId, adminNote);
    if (!result.ok) {
      return sendError(res, result.statusCode, result.code, result.message);
    }

    return res.json(Object.assign({ ok: true }, buildOrderApiPayload(result.order)));
  } catch (error) {
    logServerError('api/admin/orders/:orderId/confirm', error);
    return sendError(res, 500, 'ADMIN_ORDER_CONFIRM_FAILED', 'Failed to confirm order.');
  }
});

app.get(
  '/api/courses/:courseId/lessons/:lessonId',
  requireAuth,
  async function (req, res) {
    try {
      const courseId = getRequiredTrimmedString(req.params.courseId);
      const lessonId = getRequiredTrimmedString(req.params.lessonId);

      if (!courseId || !lessonId) {
        return sendError(
          res,
          400,
          'VALIDATION_COURSE_LESSON_ID',
          'courseId and lessonId are required.'
        );
      }

      const hasAccess = await hasActiveEnrollment(req.auth.user._id, courseId);
      if (!hasAccess) {
        return sendError(
          res,
          403,
          'COURSE_ACCESS_DENIED',
          'You do not have access to this course.'
        );
      }

      const payload = await loadCourseLessonPayload(courseId, lessonId);
      const lessonOrder = Array.isArray(payload.course.lessonOrder)
        ? payload.course.lessonOrder
        : [];
      const lessonPosition = lessonOrder.indexOf(payload.lesson.id);
      const normalizedLesson = normalizeLessonShape(
        payload.lesson,
        lessonPosition === -1 ? 0 : lessonPosition + 1
      );
      return res.json({
        ok: true,
        course: payload.course,
        lesson: normalizedLesson,
        items: resolveLessonResources(
          payload.course,
          payload.lesson,
          resourceLinkSecret,
          { ttlSeconds: resourceLinkTtlSeconds }
        ),
      });
    } catch (error) {
      logServerError('api/course-lesson', error);
      return sendError(res, 404, 'COURSE_OR_LESSON_NOT_FOUND', 'Course or lesson not found.');
    }
  }
);

app.post(
  '/api/courses/:courseId/lessons/:lessonId/progress',
  requireAuth,
  async function (req, res) {
    try {
      const courseId = getRequiredTrimmedString(req.params.courseId);
      const lessonId = getRequiredTrimmedString(req.params.lessonId);

      if (!courseId || !lessonId) {
        return sendError(
          res,
          400,
          'VALIDATION_COURSE_LESSON_ID',
          'courseId and lessonId are required.'
        );
      }

      const hasAccess = await hasActiveEnrollment(req.auth.user._id, courseId);
      if (!hasAccess) {
        return sendError(
          res,
          403,
          'COURSE_ACCESS_DENIED',
          'You do not have access to this course.'
        );
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
      logServerError('api/course-lesson-progress', error);
      return sendError(res, 404, 'COURSE_OR_LESSON_NOT_FOUND', 'Course or lesson not found.');
    }
  }
);

app.get('/api/resources/:refId/open', function (req, res) {
  try {
    const refId = getRequiredTrimmedString(req.params.refId);
    const token = getRequiredTrimmedString(req.query.token);

    if (!refId || !token) {
      return sendError(res, 400, 'VALIDATION_RESOURCE_TOKEN', 'refId and token are required.');
    }

    verifySignedResourceToken(token, refId, resourceLinkSecret);

    const entry = getPrivateResourceEntry(refId);
    if (!entry || !entry.url) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    return res.redirect(entry.url);
  } catch (error) {
    return sendError(res, 401, 'RESOURCE_LINK_INVALID', 'Invalid or expired resource link.');
  }
});

app.post('/api/customers', contactRateLimiter, async function (req, res) {
  try {
    if (!requireMongoCollection(customersCollection, res)) return;

    const name = getRequiredTrimmedString(req.body.name);
    const email = getRequiredTrimmedString(req.body.email);
    const phone = getRequiredTrimmedString(req.body.phone);
    const message = getRequiredTrimmedString(req.body.message);
    const interest = getRequiredTrimmedString(req.body.interest);
    const interestLabel = getRequiredTrimmedString(req.body.interestLabel);

    if (!name || !email || !interest) {
      return sendError(
        res,
        400,
        'VALIDATION_CONTACT_REQUIRED',
        'Missing required fields: name, email, interest.'
      );
    }

    if (!normalizeEmail(email)) {
      return sendError(res, 400, 'VALIDATION_EMAIL', 'A valid email is required.');
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
    logServerError('api/customers', error);
    return sendError(res, 500, 'CUSTOMER_SAVE_FAILED', 'Failed to save customer lead.');
  }
});

app.use(function (err, req, res, next) {
  logServerError('express/unhandled', err, {
    method: req.method,
    path: req.path,
  });
  if (res.headersSent) {
    return next(err);
  }
  return sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'Unexpected server error.'
  );
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

validateProductionSecrets();

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
