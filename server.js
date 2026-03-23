const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();

const portEnvRaw = process.env.PORT;
const portExplicit =
  portEnvRaw !== undefined && String(portEnvRaw).trim() !== '';
const preferredPort = Number(portExplicit ? portEnvRaw : 3000);
const MAX_FALLBACK_PORTS = 15;

let listeningPort = preferredPort;

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'piano_vinhquang';
const collectionName = process.env.MONGODB_CUSTOMERS_COLLECTION || 'customers';

let customersCollection;
let mongoClient;
let httpServer;
let isShuttingDown = false;

async function connectToMongo() {
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const db = mongoClient.db(dbName);
  customersCollection = db.collection(collectionName);

  await customersCollection.createIndex({ createdAt: -1 });

  console.log(
    '[mongo] connected to %s, db=%s, collection=%s',
    mongoUri,
    dbName,
    collectionName
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
app.use(express.static(path.join(__dirname)));

app.get('/api/health', function (req, res) {
  res.json({
    ok: true,
    database: dbName,
    collection: collectionName,
  });
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
