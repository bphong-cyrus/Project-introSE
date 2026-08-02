// SmartSpend AI - Receipt Analyzer (mobile presentation tier).
// Thin façade that delegates to the backend HTTP client. Kept under the
// same name so the rest of the module (and any future test mocks) can
// keep importing { analyzeReceipt }.

import {
  analyzeReceiptOnBackend,
  BackendApiError,
} from './backendClient';
import type { ExtractedReceiptData } from '../screens/AIScannerScreen';
import type { Category } from '../../../shared/types';

export interface AnalyzeReceiptInput {
  base64: string;
  mediaType: string;
  uri: string;
  categories?: Category[];
}

export interface AnalyzeReceiptResult {
  data: ExtractedReceiptData;
  raw: string;
}

/** Send the image to the local Express backend (which talks to Gemini). */
export async function analyzeReceipt(
  input: AnalyzeReceiptInput,
): Promise<AnalyzeReceiptResult> {
  const { data, meta } = await analyzeReceiptOnBackend({
    base64: input.base64,
    mediaType: input.mediaType,
    uri: input.uri,
    categories: input.categories,
  });
  return {
    data,
    raw: meta?.model ? `model=${meta.model}` : '',
  };
}

// Re-exported under the old name so existing screens keep compiling.
// The underlying error class is now generic BackendApiError.
export { BackendApiError as GeminiApiError };
export { BackendApiError as ClaudeApiError };