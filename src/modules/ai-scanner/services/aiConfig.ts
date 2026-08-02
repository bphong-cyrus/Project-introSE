// SmartSpend AI - Backend API configuration
// The mobile presentation tier calls our own Express.js Business Layer
// (per SAD §4.2.6 - AI Scanner Controller). The Gemini API key lives on
// the server, never inside the mobile bundle.
//
// Set EXPO_PUBLIC_API_BASE_URL to point the app at your local backend.
// Defaults below cover the common cases:
//   - Expo Go on Android emulator  -> http://10.0.2.2:4000
//   - Expo Go on iOS simulator     -> http://localhost:4000
//   - Physical device on LAN       -> http://<your-LAN-ip>:4000
//
// To override at runtime, edit `API_BASE_URL_FALLBACKS` below or set
// EXPO_PUBLIC_API_BASE_URL in src/.env and restart `expo start -c`.

const fromEnv =
  // @ts-ignore - injected by Expo at build time from EXPO_PUBLIC_* env vars
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) || '';

export const API_BASE_URL =
  fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, '') : 'http://10.0.2.2:4000';

export const API_BASE_URL_FALLBACKS: string[] = [
  'http://10.0.2.2:4000', // Android emulator → host
  'http://localhost:4000', // iOS simulator / web
];

export const AI_SCANNER_ENDPOINTS = {
  analyze: `${API_BASE_URL}/api/ai-scanner/analyze`,
  categories: `${API_BASE_URL}/api/ai-scanner/categories`,
  health: `${API_BASE_URL}/api/ai-scanner/health`,
} as const;

export const REQUEST_TIMEOUT_MS = 60_000; // 60s - Gemini vision can be slow