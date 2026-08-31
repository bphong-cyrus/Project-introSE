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
// Performance: Tracks timing for each request based on file size

const { parseReceipt, CATEGORIES } = require('../services/receiptParser');
const { getPool } = require('../services/geminiKeyPool');

// Performance thresholds (in KB) for logging/monitoring
const PERFORMANCE_THRESHOLDS = {
  FAST: 100,
  NORMAL: 500,
  SLOW: 1000,
  XLARGE: 2000,
};
const AI_PIPELINE_TARGET_MS = 8_000;

/**
 * Classify image size category for performance tracking
 */
function classifyImageSize(sizeKB) {
  if (sizeKB < PERFORMANCE_THRESHOLDS.FAST) return 'tiny';
  if (sizeKB < PERFORMANCE_THRESHOLDS.NORMAL) return 'small';
  if (sizeKB < PERFORMANCE_THRESHOLDS.SLOW) return 'medium';
  if (sizeKB < PERFORMANCE_THRESHOLDS.XLARGE) return 'large';
  return 'xlarge';
}

/**
 * POST /api/ai-scanner/analyze
 * multipart/form-data:
 *   - image: file (jpeg/png/webp/gif, ≤ MAX_UPLOAD_BYTES)
 *
 * Performance tracking:
 *   - Logs image size category and processing time
 *   - Returns performance metadata in response
 */
async function analyzeReceipt(req, res, next) {
  const requestStart = process.hrtime.bigint();
  const imageSizeKB = req.file ? Math.round(req.file.size / 1024) : 0;
  const sizeCategory = classifyImageSize(imageSizeKB);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu file ảnh. Hãy gửi field "image" trong multipart/form-data.',
      });
    }

    console.log(`[ai-scanner] Processing ${sizeCategory} image (${imageSizeKB}KB)`);

    const result = await parseReceipt({
      mediaType: req.file.mimetype,
      buffer: req.file.buffer,
      availableCategories: req.body && req.body.categories
        ? safeParseCategories(req.body.categories)
        : CATEGORIES,
    });

    // Calculate total request time
    const totalMs = Number(process.hrtime.bigint() - requestStart) / 1_000_000;
    const perf = result._perf || {};

    if (totalMs > AI_PIPELINE_TARGET_MS) {
      console.warn(`[ai-scanner] SLOW REQUEST: ${totalMs.toFixed(0)}ms for ${sizeCategory} (${imageSizeKB}KB) image`);
    } else {
      console.log(`[ai-scanner] Completed ${sizeCategory} image in ${totalMs.toFixed(0)}ms`);
    }

    return res.json({
      success: true,
      data: result.data,
      meta: {
        model: result.model,
        usage: result.usage,
        raw_result: result.rawText,
        retry: result.retry,
        // Performance metadata
        performance: {
          total_ms: totalMs,
          image_size_kb: imageSizeKB,
          size_category: sizeCategory,
          gemini_ms: perf.gemini_ms,
          primary_ms: perf.primary_ms,
          fallback_ms: perf.fallback_ms,
          retry_attempted: perf.retry_attempted,
          retry_succeeded: perf.retry_succeeded,
          target_ms: AI_PIPELINE_TARGET_MS,
          within_target: totalMs <= AI_PIPELINE_TARGET_MS,
          // Kept for backward compatibility with the current mobile client.
          within_threshold: totalMs <= AI_PIPELINE_TARGET_MS,
        },
      },
    });
  } catch (err) {
    const totalMs = Number(process.hrtime.bigint() - requestStart) / 1_000_000;
    console.error(`[ai-scanner] Error after ${totalMs.toFixed(0)}ms: ${err.message}`);
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
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  let poolInfo = null;
  let apiKeyConfigured = false;
  try {
    const pool = getPool();
    const description = pool.describe();
    poolInfo = {
      size: description.size,
      coolingDown: description.coolingDown.length,
    };
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
      performanceThresholds: PERFORMANCE_THRESHOLDS,
      aiPipelineTargetMs: AI_PIPELINE_TARGET_MS,
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
