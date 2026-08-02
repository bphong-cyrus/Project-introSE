// SmartSpend AI - Gemini API key pool with round-robin + automatic failover.
//
// Reads a list of API keys from environment variables:
//   GEMINI_API_KEYS=key1,key2,key3,key4
//   # or fallback to numbered variants:
//   GOOGLE_API_KEY_1, GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, GOOGLE_API_KEY_4
//   # or the legacy single-key form:
//   GOOGLE_API_KEY / GEMINI_API_KEY (treated as a one-element pool)
//
// Behaviour:
//   - For each request we pick a key in round-robin order so load spreads
//     evenly across the pool (15 RPM * 4 keys = 60 RPM aggregate).
//   - On a quota/rate-limit error from Gemini (HTTP 429, 503, or any
//     payload that mentions RESOURCE_EXHAUSTED / quota / rate limit /
//     "Too Many Requests"), the request is retried with the next key.
//   - Non-quota errors (400 invalid prompt, 401 bad key, etc.) propagate
//     immediately because retrying would not help.
//   - After trying every key once, the last error is surfaced to the
//     caller.
//
// This is purely server-side state. The mobile client never sees the
// keys; it only sees a single Anthropic-style envelope back.

class GeminiKeyPool {
  constructor(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error('GeminiKeyPool: at least one API key is required');
    }
    // Dedupe and trim.
    this.keys = Array.from(
      new Set(keys.map((k) => String(k).trim()).filter(Boolean)),
    );
    // Track the next index to attempt. Round-robin across the whole
    // pool so a single key is never hammered when others are idle.
    this.nextIndex = 0;
    // Per-key cooldown until retry. Set when we hit a quota error; the
    // pool will skip cooled-down keys until the cooldown expires.
    this.cooldownUntil = new Map(); // key -> timestamp ms
    this.cooldownMs = Number(process.env.GEMINI_KEY_COOLDOWN_MS) || 60_000;
  }

  /** Total number of distinct keys in the pool. */
  size() {
    return this.keys.length;
  }

  /**
   * Run `fn(key)` against the pool with automatic failover.
   *
   * @param {(key: string) => Promise<any>} fn  callback that performs
   *   the actual fetch using the supplied key. Should throw an
   *   Error with a `.status` and `.payload` so the pool can decide
   *   whether to retry.
   * @param {{ isQuotaError?: (err: any) => boolean }} [opts]
   * @returns {Promise<{ value: any, key: string }>}
   */
  async withFailover(fn, opts = {}) {
    const isQuotaError =
      opts.isQuotaError ||
      ((err) => GeminiKeyPool.looksLikeQuotaError(err));

    const attempts = this.keys.length;
    let lastErr = null;

    for (let i = 0; i < attempts; i += 1) {
      const key = this.pickKey();
      if (!key) {
        // All keys are in cooldown; wait for the earliest to expire
        // and try again.
        await this.sleepUntilNextCooldown();
        // Retry the outer loop without consuming another attempt.
        i -= 1;
        continue;
      }

      try {
        const value = await fn(key);
        // Success: advance the round-robin so the next request starts
        // on the following key.
        this.advance(key);
        return { value, key };
      } catch (err) {
        lastErr = err;
        if (!isQuotaError(err)) {
          // Non-quota error: don't burn other keys.
          throw err;
        }
        // Quota error: cool this key down and try the next one.
        this.cooldownUntil.set(key, Date.now() + this.cooldownMs);
        // eslint-disable-next-line no-console
        console.warn(
          `[geminiKeyPool] key ...${key.slice(-6)} hit quota error, cooling down for ${this.cooldownMs}ms`,
        );
      }
    }

    // Exhausted the pool.
    throw lastErr || new Error('GeminiKeyPool: all keys failed');
  }

  /** Pick the next usable key, respecting cooldowns. */
  pickKey() {
    if (this.keys.length === 0) return null;
    for (let i = 0; i < this.keys.length; i += 1) {
      const idx = (this.nextIndex + i) % this.keys.length;
      const candidate = this.keys[idx];
      if (this.isCoolingDown(candidate)) continue;
      this.nextIndex = (idx + 1) % this.keys.length;
      return candidate;
    }
    return null;
  }

  /** Move the round-robin pointer past the key we just used. */
  advance(usedKey) {
    const idx = this.keys.indexOf(usedKey);
    if (idx >= 0) {
      this.nextIndex = (idx + 1) % this.keys.length;
    }
  }

  isCoolingDown(key) {
    const until = this.cooldownUntil.get(key);
    if (!until) return false;
    if (Date.now() >= until) {
      this.cooldownUntil.delete(key);
      return false;
    }
    return true;
  }

  /** How long until the earliest cooldown expires. */
  msUntilAnyFree() {
    let earliest = Infinity;
    for (const until of this.cooldownUntil.values()) {
      const remaining = until - Date.now();
      if (remaining > 0 && remaining < earliest) earliest = remaining;
    }
    return earliest === Infinity ? 0 : earliest;
  }

  async sleepUntilNextCooldown() {
    const ms = Math.max(this.msUntilAnyFree(), 50);
    await new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Detect Gemini "quota exceeded / rate limited" responses across the
   * shapes the API actually returns:
   *   - HTTP 429
   *   - HTTP 503 with "UNAVAILABLE" (transient overload)
   *   - Payload { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: '...' } }
   *   - Payload mentioning "quota", "rate limit", "Too Many Requests"
   */
  static looksLikeQuotaError(err) {
    if (!err) return false;
    const status = Number(err.status);
    if (status === 429 || status === 503) return true;

    const payload = err.payload;
    if (payload && typeof payload === 'object') {
      const errorObj = payload.error;
      if (errorObj) {
        const code = Number(errorObj.code);
        if (code === 429) return true;
        const statusText = String(errorObj.status || '').toUpperCase();
        if (statusText === 'RESOURCE_EXHAUSTED') return true;
        const message = String(errorObj.message || '').toLowerCase();
        if (
          message.includes('quota') ||
          message.includes('rate limit') ||
          message.includes('rate_limit') ||
          message.includes('too many requests') ||
          message.includes('resource_exhausted')
        ) {
          return true;
        }
      }
    }

    const msg = String(err.message || '').toLowerCase();
    if (
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    ) {
      return true;
    }

    return false;
  }

  /** Snapshot of pool state for /health. */
  describe() {
    return {
      size: this.keys.length,
      keyFingerprints: this.keys.map((k) => `...${k.slice(-6)}`),
      coolingDown: Array.from(this.cooldownUntil.entries())
        .filter(([, until]) => until > Date.now())
        .map(([key, until]) => ({
          key: `...${key.slice(-6)}`,
          retryInMs: Math.max(0, until - Date.now()),
        })),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                  */
/* -------------------------------------------------------------------------- */

function loadKeysFromEnv() {
  // Preferred: comma-separated single variable.
  const list = process.env.GEMINI_API_KEYS;
  if (list && list.trim().length > 0) {
    return list
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Fallback: numbered variants.
  const numbered = [];
  for (let i = 1; i <= 16; i += 1) {
    const v = process.env[`GOOGLE_API_KEY_${i}`];
    if (v && v.trim()) numbered.push(v.trim());
  }
  if (numbered.length > 0) return numbered;

  // Legacy: single key.
  const single =
    process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (single && single.trim()) return [single.trim()];

  return [];
}

let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const keys = loadKeysFromEnv();
  if (keys.length === 0) {
    throw new Error(
      'GOOGLE_API_KEY chưa được cấu hình. Lấy key miễn phí tại https://aistudio.google.com/apikey rồi paste vào backend/.env',
    );
  }
  _pool = new GeminiKeyPool(keys);
  // eslint-disable-next-line no-console
  console.log(
    `[geminiKeyPool] initialised with ${keys.length} key(s): ${keys
      .map((k) => `...${k.slice(-6)}`)
      .join(', ')}`,
  );
  return _pool;
}

module.exports = {
  GeminiKeyPool,
  getPool,
};
