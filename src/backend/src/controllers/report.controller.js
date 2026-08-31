const fs = require('fs');
const path = require('path');
const {
  buildFinancialReportFileName,
  createMonthlyReportExport,
  getExportFilePath,
  getExportRecord,
} = require('../services/reportExportService');

async function createExport(req, res, next) {
  try {
    const { year, month } = req.body || {};
    const result = await createMonthlyReportExport({
      supabase: req.supabase,
      userId: req.authUser.id,
      userEmail: req.authUser.email,
      year,
      month,
      baseDownloadPath: '/api/reports/exports',
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

async function downloadExport(req, res, next) {
  try {
    const exportId = req.params.exportId;
    const record = await getExportRecord(req.supabase, req.authUser.id, exportId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy báo cáo hoặc bạn không có quyền tải file này.',
      });
    }

    const filePath = getExportFilePath(exportId);
    if (!fs.existsSync(filePath)) {
      return res.status(410).json({
        success: false,
        error: 'File báo cáo không còn tồn tại trên backend. Vui lòng tạo lại báo cáo.',
      });
    }

    const periodStart = new Date(`${record.period_start}T00:00:00Z`);
    const createdAt = record.created_at ? new Date(record.created_at) : new Date();
    const fileName = buildFinancialReportFileName(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth() + 1,
      createdAt,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    return next(err);
  }
}

function health(_req, res) {
  return res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'smartspend-report-export',
    },
  });
}

module.exports = {
  createExport,
  downloadExport,
  health,
};
