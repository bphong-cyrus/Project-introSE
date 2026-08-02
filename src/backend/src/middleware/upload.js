// Multer middleware: receives the receipt image as multipart/form-data
// under the "image" field. Stores it temporarily on disk so we can stream
// it back into the Gemini request without loading the whole file in
// memory if needed. The actual Gemini call uses the in-memory buffer.

const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 4 * 1024 * 1024; // 4 MB

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error(
        `Unsupported image type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIME].join(', ')}`,
      );
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = upload;