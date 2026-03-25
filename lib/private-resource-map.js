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
    url: 'https://res.cloudinary.com/durdwjvu2/raw/upload/piano_vinhquang_musicxml/canon-in-d-johann-pachelbel.musicxml',
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
    url: 'https://res.cloudinary.com/durdwjvu2/raw/upload/piano_vinhquang_musicxml/fur-elise-beethoven.musicxml',
  },
  'pvq-pcb-l02-midi': {
    type: 'midi',
    provider: 'google_drive',
    url: 'https://drive.google.com/file/d/11T6gz-REa_nanZIDmTxt64p5iPhS_5Tm/view',
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
