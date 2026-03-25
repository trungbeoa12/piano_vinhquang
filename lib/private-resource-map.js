const fs = require('fs');
const path = require('path');

const PRIVATE_RESOURCES_FILE = path.join(
  __dirname,
  '..',
  'config',
  'resources.private.json'
);

const FALLBACK_RESOURCE_MAP = {
  'pvq-pcb-l01-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/1s5yV-eiay9oOReIBZZ3p7qmG5K0wYZmI/preview',
  },
  'pvq-pcb-l01-sheet': {
    type: 'sheet_view',
    provider: 'cloudinary',
    url: 'https://res.cloudinary.com/durdwjwu2/raw/upload/v1774422172/canon-in-d-johann-pachelbel_pvflxh.musicxml',
  },
  'pvq-pcb-l01-midi': {
    type: 'midi',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/1HfOCoFJ9fjvan9PveBEYxTlWqavF16q3/view',
  },
  'pvq-pcb-l02-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/17PYiMjqnafgz_ZmpwHc0-pT6BkK5_7iM/preview',
  },
  'pvq-pcb-l02-sheet': {
    type: 'sheet_view',
    provider: 'cloudinary',
    url: 'https://res.cloudinary.com/durdwjwu2/raw/upload/v1774422172/fur-elise-beethoven_ugucjp.musicxml',
  },
  'pvq-pcb-l02-midi': {
    type: 'midi',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/11T6gz-REa_nanZIDmTxt64p5iPhS_5Tm/view',
  },
  'pvq-pcb-l03-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/1s5yV-eiay9oOReIBZZ3p7qmG5K0wYZmI/preview',
  },
  'pvq-pcb-l03-sheet': {
    type: 'sheet_view',
    provider: 'cloudinary',
    url: 'https://res.cloudinary.com/durdwjwu2/raw/upload/v1774422172/canon-in-d-johann-pachelbel_pvflxh.musicxml',
  },
  'pvq-pcb-l03-midi': {
    type: 'midi',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/1HfOCoFJ9fjvan9PveBEYxTlWqavF16q3/view',
  },
  'pvq-pcb-l04-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/17PYiMjqnafgz_ZmpwHc0-pT6BkK5_7iM/preview',
  },
  'pvq-pcb-l04-sheet': {
    type: 'sheet_view',
    provider: 'cloudinary',
    url: 'https://res.cloudinary.com/durdwjwu2/raw/upload/v1774422172/fur-elise-beethoven_ugucjp.musicxml',
  },
  'pvq-pcb-l04-midi': {
    type: 'midi',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/11T6gz-REa_nanZIDmTxt64p5iPhS_5Tm/view',
  },
  'pvq-pcb-l05-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/1s5yV-eiay9oOReIBZZ3p7qmG5K0wYZmI/preview',
  },
  'pvq-pcb-l05-sheet': {
    type: 'sheet_view',
    provider: 'cloudinary',
    url: 'https://res.cloudinary.com/durdwjwu2/raw/upload/v1774422172/canon-in-d-johann-pachelbel_pvflxh.musicxml',
  },
  'pvq-pcb-l05-midi': {
    type: 'midi',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/1HfOCoFJ9fjvan9PveBEYxTlWqavF16q3/view',
  },
  'pvq-dh-l01-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/preview',
  },
  'pvq-dh-l01-sheet': {
    type: 'sheet_view',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/view',
  },
};

let privateResourceMapCache = null;

function loadPrivateResourceMap() {
  try {
    if (!fs.existsSync(PRIVATE_RESOURCES_FILE)) {
      return Object.assign({}, FALLBACK_RESOURCE_MAP);
    }

    const raw = fs.readFileSync(PRIVATE_RESOURCES_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('resources.private.json must be an object map.');
    }

    return parsed;
  } catch (error) {
    console.warn(
      '[resources] failed to load private resource config, fallback map will be used: %s',
      error.message
    );
    return Object.assign({}, FALLBACK_RESOURCE_MAP);
  }
}

function getPrivateResourceMap() {
  if (!privateResourceMapCache) {
    privateResourceMapCache = loadPrivateResourceMap();
  }
  return privateResourceMapCache;
}

function getPrivateResourceEntry(refId) {
  return getPrivateResourceMap()[String(refId || '').trim()] || null;
}

function persistPrivateResourceMap(nextMap) {
  const safeMap = nextMap && typeof nextMap === 'object' ? nextMap : {};
  const dirPath = path.dirname(PRIVATE_RESOURCES_FILE);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(
    PRIVATE_RESOURCES_FILE,
    JSON.stringify(safeMap, null, 2) + '\n',
    'utf8'
  );
  privateResourceMapCache = safeMap;
  return safeMap;
}

function upsertPrivateResourceEntry(refId, entry) {
  const key = String(refId || '').trim();
  if (!key) {
    throw new Error('refId is required.');
  }

  const currentMap = Object.assign({}, getPrivateResourceMap());
  currentMap[key] = Object.assign({}, currentMap[key] || {}, entry || {});
  return persistPrivateResourceMap(currentMap);
}

module.exports = {
  PRIVATE_RESOURCES_FILE,
  FALLBACK_RESOURCE_MAP,
  getPrivateResourceMap,
  getPrivateResourceEntry,
  persistPrivateResourceMap,
  upsertPrivateResourceEntry,
};
