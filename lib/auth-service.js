const crypto = require('crypto');

const TOKEN_ALG = 'HS256';
const TOKEN_TYP = 'JWT';
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4;
  const withPadding =
    padding === 0 ? normalized : normalized + '='.repeat(4 - padding);

  return Buffer.from(withPadding, 'base64').toString('utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createPasswordHash(password) {
  return new Promise(function (resolve, reject) {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, function (error, derivedKey) {
      if (error) return reject(error);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise(function (resolve, reject) {
    const parts = String(storedHash || '').split(':');
    if (parts.length !== 2) {
      resolve(false);
      return;
    }

    const salt = parts[0];
    const expectedHash = parts[1];

    crypto.scrypt(password, salt, 64, function (error, derivedKey) {
      if (error) return reject(error);

      const derivedBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
      const expectedBuffer = Buffer.from(expectedHash, 'hex');

      if (derivedBuffer.length !== expectedBuffer.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(derivedBuffer, expectedBuffer));
    });
  });
}

function signJwt(payload, secret, options) {
  const settings = options || {};
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresInSeconds =
    Number(settings.expiresInSeconds) || DEFAULT_TOKEN_TTL_SECONDS;

  const header = {
    alg: TOKEN_ALG,
    typ: TOKEN_TYP,
  };

  const tokenPayload = Object.assign({}, payload, {
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  });

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const unsignedToken = encodedHeader + '.' + encodedPayload;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return unsignedToken + '.' + signature;
}

function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format.');
  }

  const unsignedToken = parts[0] + '.' + parts[1];
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const actualSignature = parts[2];
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(actualSignature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new Error('Invalid token signature.');
  }

  const payload = JSON.parse(base64UrlDecode(parts[1]));
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < nowSeconds) {
    throw new Error('Token expired.');
  }

  return payload;
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: String(user._id),
    email: user.email,
    emailNormalized: user.emailNormalized,
    displayName: user.displayName || '',
    createdAt: user.createdAt || null,
  };
}

module.exports = {
  DEFAULT_TOKEN_TTL_SECONDS,
  normalizeEmail,
  createPasswordHash,
  verifyPassword,
  signJwt,
  verifyJwt,
  sanitizeUser,
};
