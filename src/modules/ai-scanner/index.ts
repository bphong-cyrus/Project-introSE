// UC13 - Add Transaction via AI Scanner
// Features: Camera/gallery capture -> Express backend -> Gemini vision OCR
// -> editable result page with category suggestion.

export { default as AIScannerScreen } from './screens/AIScannerScreen';
export { default as AIResultScreen } from './screens/AIResultScreen';
export type { ExtractedReceiptData } from './screens/AIScannerScreen';

// Re-export public service surface, but rename AnalyzeReceiptResult so it
// doesn't clash between modules.
export { analyzeReceipt, GeminiApiError, ClaudeApiError } from './services/receiptAnalyzer';
export type { AnalyzeReceiptInput, AnalyzeReceiptResult } from './services/receiptAnalyzer';
export { analyzeReceiptOnBackend, pingBackend, BackendApiError } from './services/backendClient';
export type { AnalyzeReceiptResult as BackendAnalyzeReceiptResult } from './services/backendClient';
export { pickFromCamera, pickFromGallery, ensureCameraPermission, ensureMediaLibraryPermission } from './services/imageHelper';
export type { PickedImage } from './services/imageHelper';
export { API_BASE_URL, API_BASE_URL_FALLBACKS, AI_SCANNER_ENDPOINTS, REQUEST_TIMEOUT_MS } from './services/aiConfig';