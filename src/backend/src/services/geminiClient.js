// SmartSpend AI - Gemini service (server-side).
// Calls Google AI Studio's Gemini API (vision-capable). The API key is
// read from the key pool so that quota errors on one key automatically
// fall over to the next one.
//
// Endpoint:
//   https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
// Auth: API key passed as the `x-goog-api-key` header.

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_URL_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

const { getPool, GeminiKeyPool } = require('./geminiKeyPool');

class GeminiConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GeminiConfigError';
    this.status = 500;
  }
}

class GeminiApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.payload = payload;
  }
}

function resolveConfig() {
  const model =
    process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0
      ? process.env.GEMINI_MODEL
      : DEFAULT_MODEL;
  // Touch the pool so a missing-key env throws the friendly error at
  // first use rather than first request.
  const pool = getPool();
  return { model, pool };
}

function buildRequestBody({ mediaType, buffer, system, userPrompt, maxTokens, temperature }) {
  return {
    systemInstruction: {
      role: 'system',
      parts: [{ text: system }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: userPrompt },
          {
            inlineData: {
              mimeType: mediaType,
              data: buffer.toString('base64'),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  };
}

async function callGeminiOnce({ apiKey, model, body }) {
  const url = `${DEFAULT_URL_BASE}/${encodeURIComponent(model)}:generateContent`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new GeminiApiError(
      `Không thể kết nối tới Gemini API (${url}): ${e.message}`,
      502,
      null,
    );
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const apiMessage =
      (payload && payload.error && payload.error.message) ||
      (typeof payload === 'string' && payload) ||
      `Gemini API trả về HTTP ${response.status}`;
    throw new GeminiApiError(apiMessage, response.status, payload);
  }

  const candidate = payload && payload.candidates && payload.candidates[0];
  const part =
    candidate &&
    candidate.content &&
    Array.isArray(candidate.content.parts) &&
    candidate.content.parts.find((p) => typeof p.text === 'string');
  const rawText = part ? part.text : '';

  return {
    rawText: (rawText || '').trim(),
    model: (payload && payload.modelVersion) || model,
    usage: payload && payload.usageMetadata,
  };
}

/**
 * Send a vision request to Gemini, automatically retrying on quota
 * errors using the next key in the pool.
 *
 * @param {object} opts
 * @param {string} opts.mediaType  e.g. "image/jpeg"
 * @param {Buffer} opts.buffer     raw image bytes
 * @param {string} opts.system     system instruction text
 * @param {string} opts.userPrompt user prompt (text only)
 * @param {number} [opts.maxTokens=4096]
 * @param {number} [opts.temperature=0.1]
 * @returns {Promise<{rawText: string, model: string, usage: object, key: string}>}
 */
async function analyzeReceipt({
  mediaType,
  buffer,
  system,
  userPrompt,
  maxTokens = 4096,
  temperature = 0.1,
}) {
  const { model, pool } = resolveConfig();
  const body = buildRequestBody({
    mediaType,
    buffer,
    system,
    userPrompt,
    maxTokens,
    temperature,
  });

  const { value, key } = await pool.withFailover((apiKey) =>
    callGeminiOnce({ apiKey, model, body }),
  );

  return { ...value, key };
}

module.exports = {
  analyzeReceipt,
  GeminiConfigError,
  GeminiApiError,
  GeminiKeyPool,
};
