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
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/preview',
  },
  'pvq-pcb-l01-sheet': {
    type: 'sheet_view',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/view',
  },
  'pvq-pcb-l02-vid': {
    type: 'video_embed',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/preview',
  },
  'pvq-pcb-l02-pdf': {
    type: 'pdf',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/view',
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

function loadPrivateResourceMap() {
  try {
    if (!fs.existsSync(PRIVATE_RESOURCES_FILE)) {
      return FALLBACK_RESOURCE_MAP;
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
    return FALLBACK_RESOURCE_MAP;
  }
}

module.exports = loadPrivateResourceMap();
