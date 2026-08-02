// SmartSpend AI - AI Scanner Controller (SAD §4.2.6)
// HTTP entry point used by the React Native client. Implements:
//   - uploadReceipt        : receives the image via multer
//   - validateImageFile    : enforced by multer's mime/size limits
//   - processReceiptImage  : forwards to the Gemini service
//   - extractReceiptData   : done in the parser service
//   - suggestCategory      : done in the parser service
//   - getScanResult        : returns the structured payload
//   - listCategories       : returns the category list the mobile app
//                            uses to display the dropdown.

const path = require('path');
const fs = require('fs');

const { parseReceipt, CATEGORIES } = require('../services/receiptParser');
const { GeminiApiError, GeminiConfigError } = require('../services/geminiClient');
const { getPool, GeminiKeyPool } = require('../services/geminiKeyPool');

/**
 * POST /api/ai-scanner/analyze
 * multipart/form-data:
 *   - image: file (jpeg/png/webp/gif, ≤ MAX_UPLOAD_BYTES)
 */
async function analyzeReceipt(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu file ảnh. Hãy gửi field "image" trong multipart/form-data.',
      });
    }

    const result = await parseReceipt({
      mediaType: req.file.mimetype,
      buffer: req.file.buffer,
      availableCategories: req.body && req.body.categories
        ? safeParseCategories(req.body.categories)
        : CATEGORIES,
    });

    return res.json({
      success: true,
      data: result.data,
      meta: {
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/ai-scanner/categories
 * Returns the default category list (used by the mobile dropdown).
 * When the Supabase Category Repository is integrated, this will be a
 * thin wrapper around it.
 */
function listCategories(_req, res) {
  return res.json({
    success: true,
    data: CATEGORIES,
  });
}

/**
 * GET /api/ai-scanner/health
 * Verifies the server is reachable AND the API key is configured.
 */
function health(_req, res) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  let poolInfo = null;
  let apiKeyConfigured = false;
  try {
    const pool = getPool();
    poolInfo = pool.describe();
    apiKeyConfigured = true;
  } catch (_e) {
    apiKeyConfigured = false;
  }
  return res.json({
    success: true,
    data: {
      status: 'ok',
      apiKeyConfigured,
      model,
      keyPool: poolInfo,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function safeParseCategories(input) {
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  analyzeReceipt,
  listCategories,
  health,
};