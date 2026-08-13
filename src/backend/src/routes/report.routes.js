const express = require('express');
const controller = require('../controllers/report.controller');
const requireSupabaseAuth = require('../middleware/requireSupabaseAuth');

const router = express.Router();

router.get('/health', controller.health);
router.post('/export', requireSupabaseAuth, controller.createExport);
router.get('/exports/:exportId/download', requireSupabaseAuth, controller.downloadExport);

module.exports = router;
