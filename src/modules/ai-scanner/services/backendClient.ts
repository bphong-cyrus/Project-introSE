// SmartSpend AI - Backend HTTP client (mobile presentation tier).
// Calls the Express Business Layer endpoints defined in
// `backend/src/routes/aiScanner.routes.js` instead of hitting Gemini
// directly. The Gemini API key stays on the server.

import { AI_SCANNER_ENDPOINTS, REQUEST_TIMEOUT_MS } from './aiConfig';
import type { ExtractedReceiptData } from '../screens/AIScannerScreen';
import type { Category } from '../../../shared/types';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AnalyzeReceiptResult {
  data: ExtractedReceiptData;
  meta?: {
    model?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
}

export class BackendApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.payload = payload;
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseError(response: Response): Promise<{ message: string; payload: unknown }> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = await response.text().catch(() => null);
  }
  let message = `Backend trả về HTTP ${response.status}`;
  if (payload && typeof payload === 'object') {
    const errorValue = (payload as Record<string, unknown>).error;
    if (typeof errorValue === 'string') {
      message = errorValue;
    }
  }
  return { message, payload };
}

/** Strip the data-URL prefix if base64 was returned as a data URL. */
function normaliseBase64(input: string): string {
  if (!input) return input;
  if (input.startsWith('data:')) {
    const idx = input.indexOf(',');
    if (idx >= 0) return input.slice(idx + 1);
  }
  return input;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Upload the picked image to the backend and return the parsed receipt data.
 * The backend handles Gemini, JSON parsing and category mapping.
 */
export async function analyzeReceiptOnBackend(args: {
  base64: string;
  mediaType: string;
  uri: string;
  categories?: Category[];
}): Promise<AnalyzeReceiptResult> {
  const { base64, mediaType, categories } = args;

  // Build a real Blob from base64 so multer recognises the field as a file.
  // Fall back to the RN-style {uri,name,type} object only when Blob/atob
  // are unavailable (pure native without polyfills).
  const form = new FormData();
  const fileName = `receipt.${guessExt(mediaType)}`;
  const fileBlob = base64ToBlob(normaliseBase64(base64), mediaType);
  if (fileBlob) {
    form.append('image', fileBlob, fileName);
  } else {
    form.append('image', {
      // @ts-ignore - RN-specific FormData file shape
      uri: args.uri,
      name: fileName,
      type: mediaType,
    } as any);
  }

  if (categories && categories.length > 0) {
    form.append('categories', JSON.stringify(categories));
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(AI_SCANNER_ENDPOINTS.analyze, {
      method: 'POST',
      body: form as any,
    });
  } catch (e: any) {
    throw new BackendApiError(
      `Không kết nối được tới backend (${e?.message ?? 'network error'}). Hãy chắc chắn server đang chạy ở ${AI_SCANNER_ENDPOINTS.analyze.replace('/api/ai-scanner/analyze', '')}.`,
      0,
      null,
    );
  }

  if (!response.ok) {
    const { message, payload } = await parseError(response);
    throw new BackendApiError(message, response.status, payload);
  }

  const body = await response.json();
  if (!body || body.success !== true || !body.data) {
    throw new BackendApiError(
      (body && body.error) || 'Backend trả về payload không hợp lệ.',
      response.status,
      body,
    );
  }

  // The backend returns ISO string for date; convert back to Date for the UI.
  const rawData = body.data as Partial<ExtractedReceiptData>;
  const confidence = rawData.confidence || {
    amount: 0,
    storeName: 0,
    date: 0,
    category: 0,
    type: 0,
  };
  const data: ExtractedReceiptData = {
    ...(rawData as ExtractedReceiptData),
    amount: Number.isFinite(Number(rawData.amount)) ? Math.abs(Number(rawData.amount)) : 0,
    signedAmount: Number.isFinite(Number(rawData.signedAmount))
      ? Number(rawData.signedAmount)
      : undefined,
    storeName: typeof rawData.storeName === 'string' ? rawData.storeName : '',
    date: new Date((rawData as any).date),
    confidence,
    overallConfidence: Number.isFinite(Number(rawData.overallConfidence))
      ? Number(rawData.overallConfidence)
      : Number(confidence.overall || 0),
    missingFields: Array.isArray(rawData.missingFields) ? rawData.missingFields : [],
    needsManualReview: rawData.needsManualReview !== false,
    autoApproved: rawData.autoApproved === true,
    imageUri: args.uri,
  };

  return { data, meta: body.meta };
}

/** Lightweight health check, used to surface a friendly warning if the backend is down. */
export async function pingBackend(): Promise<{ ok: boolean; apiKeyConfigured?: boolean; model?: string }> {
  try {
    const response = await fetchWithTimeout(
      AI_SCANNER_ENDPOINTS.health,
      { method: 'GET' },
      5000,
    );
    if (!response.ok) return { ok: false };
    const body = await response.json();
    return {
      ok: true,
      apiKeyConfigured: Boolean(body?.data?.apiKeyConfigured),
      model: body?.data?.model,
    };
  } catch {
    return { ok: false };
  }
}

/* -------------------------------------------------------------------------- */
/* Browser/RN internals                                                       */
/* -------------------------------------------------------------------------- */

function guessExt(mediaType: string): string {
  switch (mediaType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    default:
      return 'jpg';
  }
}

function base64ToBlob(base64: string, mediaType: string): Blob | null {
  if (typeof globalThis.atob !== 'function' || typeof globalThis.Blob !== 'function') {
    return null;
  }
  try {
    const binary = globalThis.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new globalThis.Blob([bytes], { type: mediaType });
  } catch {
    return null;
  }
}
