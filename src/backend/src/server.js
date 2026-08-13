// SmartSpend AI - Express.js Business Layer entry point.
// Implements the AI Scanner Controller (SAD §4.2.6).
// Mobile clients POST a receipt image here, this server calls Gemini,
// normalises the response, and returns it as ExtractedReceiptData.

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const aiScannerRoutes = require('./routes/aiScanner.routes');
const reportRoutes = require('./routes/report.routes');
const errorHandler = require('./middleware/errorHandler');

const PORT = Number(process.env.PORT) || 4000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl / RN fetch with no Origin header
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'smartspend-ai-backend',
    time: new Date().toISOString(),
  });
});

// AI Scanner routes (UC13 / SAD §4.2.6)
app.use('/api/ai-scanner', aiScannerRoutes);

// Report & Export routes (UC12 / SAD §4.2.7)
app.use('/api/reports', reportRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found', path: req.path });
});

// Centralised error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[smartspend-backend] listening on http://localhost:${PORT}`);
  console.log(`  health   : GET  /health`);
  console.log(`  scanner  : POST /api/ai-scanner/analyze  (multipart/form-data)`);
  console.log(`  reports  : POST /api/reports/export  (Bearer Supabase access token)`);
});

module.exports = app;
