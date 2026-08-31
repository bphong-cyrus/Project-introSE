// Multer middleware: receives one receipt image in memory. The 4 MB limit is
// shared with the test cases and keeps request memory predictable.
const multer = require('multer');

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 4 * 1024 * 1024;

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
