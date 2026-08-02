// Routes for the AI Scanner Controller (SAD §4.2.6)

const express = require('express');
const upload = require('../middleware/upload');
const controller = require('../controllers/aiScanner.controller');

const router = express.Router();

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 4 * 1024 * 1024; // 4 MB
const MAX_MB = (MAX_BYTES / 1024 / 1024).toFixed(0);

// Health / readiness
router.get('/health', controller.health);

// Static categories (used by the AI result page dropdown)
router.get('/categories', controller.listCategories);

// Main endpoint: upload + analyse a receipt image
router.post(
  '/analyze',
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Convert multer errors to a clean JSON 4xx response
        const status = err.status || 400;
        const isTooLarge =
          err.code === 'LIMIT_FILE_SIZE' ||
          (typeof err.message === 'string' && err.message.toLowerCase().includes('file too large'));
        const message = isTooLarge
          ? `Ảnh quá lớn. Giới hạn ${MAX_MB} MB.`
          : err.message;
        return res.status(status).json({ success: false, error: message });
      }
      next();
    });
  },
  controller.analyzeReceipt,
);

module.exports = router;