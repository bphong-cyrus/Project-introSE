const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { COLORS, renderBarChart, renderLineChart, renderPieChart } = require('./chartRenderer');

const REPORT_DIR = path.join(__dirname, '..', '..', 'generated-reports');
const DEFAULT_EXPORT_TYPE = process.env.REPORT_EXPORT_TYPE || 'excel';
const DEFAULT_EXPORT_STATUS = process.env.REPORT_EXPORT_STATUS || 'success';

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function getReportFilePath(exportId) {
  ensureReportDir();
  return path.join(REPORT_DIR, `${exportId}.xlsx`);
}

function normalizeMonthYear(inputMonth, inputYear) {
  const now = new Date();
  const month = Number(inputMonth) || now.getMonth() + 1;
  const year = Number(inputYear) || now.getFullYear();
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    const err = new Error('Tháng báo cáo phải nằm trong khoảng 1-12.');
    err.status = 400;
    throw err;
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    const err = new Error('Năm báo cáo không hợp lệ.');
    err.status = 400;
    throw err;
  }
  return { month, year };
}

function getPeriod(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return {
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDateExclusive: end.toISOString().slice(0, 10),
    endDateInclusive: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'report';
}

function getCategoryName(categoriesById, categoryId) {
  return categoriesById.get(categoryId)?.name || 'Không phân loại';
}

function getCategoryColor(categoriesById, categoryId, fallbackIndex = 0) {
  return categoriesById.get(categoryId)?.color || COLORS[fallbackIndex % COLORS.length];
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromKey(key) {
  const [year, month] = key.split('-');
  return `T${Number(month)}/${year}`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function getExportTypeCandidates() {
  return [...new Set([
    DEFAULT_EXPORT_TYPE,
    'excel',
    'xlsx',
    'report',
    'monthly_report',
    'transactions',
  ].filter(Boolean))];
}

function getExportStatusCandidates() {
  return [...new Set([
    DEFAULT_EXPORT_STATUS,
    'success',
    'completed',
    'ready',
    'done',
    'generated',
    'finished',
    'pending',
  ].filter(Boolean))];
}

function isRetryableReportExportConstraintError(error) {
  return Boolean(
    error?.code === '23514' &&
    (
      String(error?.message || '').includes('report_exports_export_type_check') ||
      String(error?.message || '').includes('report_exports_status_check') ||
      String(error?.message || '').includes('status') ||
      String(error?.message || '').includes('export_type')
    )
  );
}

async function fetchReportData(supabase, userId, year, month) {
  const period = getPeriod(year, month);
  const [profileResult, transactionsResult, categoriesResult, budgetResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle(),
  ]);

  const errors = [profileResult.error, transactionsResult.error, categoriesResult.error, budgetResult.error].filter(Boolean);
  if (errors.length > 0) throw errors[0];

  let allocations = [];
  if (budgetResult.data?.budget_id) {
    const allocationResult = await supabase
      .from('budget_category_allocations')
      .select('*')
      .eq('budget_id', budgetResult.data.budget_id);
    if (allocationResult.error) throw allocationResult.error;
    allocations = allocationResult.data || [];
  }

  const transactions = transactionsResult.data || [];
  const monthlyTransactions = transactions.filter((transaction) =>
    transaction.transaction_date >= period.startDate &&
    transaction.transaction_date < period.endDateExclusive
  );

  return {
    profile: profileResult.data,
    transactions,
    monthlyTransactions,
    categories: categoriesResult.data || [],
    budget: budgetResult.data,
    allocations,
    period,
  };
}

function calculateReportData(data, year, month) {
  const categoriesById = new Map(data.categories.map((category) => [category.category_id, category]));
  const monthlyIncome = data.monthlyTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const monthlyExpense = data.monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

  const categoryExpenseMap = new Map();
  data.monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      categoryExpenseMap.set(
        transaction.category_id,
        (categoryExpenseMap.get(transaction.category_id) || 0) + toNumber(transaction.amount)
      );
    });

  const categoryExpenses = [...categoryExpenseMap.entries()]
    .map(([categoryId, amount], index) => ({
      categoryId,
      label: getCategoryName(categoriesById, categoryId),
      value: amount,
      color: getCategoryColor(categoriesById, categoryId, index),
    }))
    .sort((a, b) => b.value - a.value);

  const weeklyExpenses = Array.from({ length: 5 }, (_, index) => ({ label: `Tuần ${index + 1}`, value: 0, color: PRIMARY_BY_WEEK[index] }));
  data.monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const day = Number(transaction.transaction_date.slice(8, 10));
      const weekIndex = Math.min(4, Math.max(0, Math.ceil(day / 7) - 1));
      weeklyExpenses[weekIndex].value += toNumber(transaction.amount);
    });

  const selectedStart = new Date(Date.UTC(year, month - 1, 1));
  const monthlyComparisonKeys = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth() - i, 1));
    monthlyComparisonKeys.push(monthKey(date));
  }
  const monthlyComparisonMap = new Map(monthlyComparisonKeys.map((key) => [key, 0]));
  data.transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const date = new Date(`${transaction.transaction_date}T00:00:00Z`);
      const key = monthKey(date);
      if (monthlyComparisonMap.has(key)) {
        monthlyComparisonMap.set(key, (monthlyComparisonMap.get(key) || 0) + toNumber(transaction.amount));
      }
    });

  const monthlyComparison = [...monthlyComparisonMap.entries()].map(([key, value]) => ({
    label: monthLabelFromKey(key),
    value,
  }));

  const allocations = data.allocations.map((allocation, index) => {
    const spent = toNumber(allocation.spent_amount) || (categoryExpenseMap.get(allocation.category_id) || 0);
    const allocated = toNumber(allocation.allocated_amount);
    return {
      categoryId: allocation.category_id,
      categoryName: getCategoryName(categoriesById, allocation.category_id),
      allocated,
      spent,
      remaining: allocated - spent,
      percentage: allocated > 0 ? spent / allocated : 0,
      color: getCategoryColor(categoriesById, allocation.category_id, index),
    };
  });

  const totalBudget = data.budget
    ? toNumber(data.budget.total_budget_amount)
    : allocations.reduce((sum, allocation) => sum + allocation.allocated, 0);

  return {
    categoriesById,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance: monthlyIncome - monthlyExpense,
    categoryExpenses,
    weeklyExpenses,
    monthlyComparison,
    allocations,
    totalBudget,
    totalBudgetSpent: allocations.reduce((sum, allocation) => sum + allocation.spent, 0),
  };
}

const PRIMARY_BY_WEEK = ['#167B63', '#2A9D8F', '#F39C12', '#E74C3C', '#3498DB'];

function configureWorksheet(worksheet) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF167B63' } };
  worksheet.getRow(1).alignment = { vertical: 'middle' };
  worksheet.columns.forEach((column) => {
    column.alignment = { vertical: 'middle', wrapText: true };
  });
}

function setCurrencyColumn(worksheet, indexes) {
  indexes.forEach((index) => {
    worksheet.getColumn(index).numFmt = '#,##0 [$₫-vi-VN];[Red]-#,##0 [$₫-vi-VN]';
  });
}

function addOverviewSheet(workbook, data, calculations, year, month, userEmail) {
  const worksheet = workbook.addWorksheet('Tổng quan');
  worksheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 34 },
    { header: 'Giá trị', key: 'value', width: 28 },
  ];
  configureWorksheet(worksheet);

  const profile = data.profile || {};
  worksheet.addRows([
    { metric: 'Người dùng', value: profile.full_name || userEmail || data.profile?.user_id || '' },
    { metric: 'Email', value: userEmail || '' },
    { metric: 'Kỳ báo cáo', value: `Tháng ${month}/${year}` },
    { metric: 'Ngày bắt đầu', value: data.period.startDate },
    { metric: 'Ngày kết thúc', value: data.period.endDateInclusive },
    { metric: 'Tổng thu nhập tháng', value: calculations.monthlyIncome },
    { metric: 'Tổng chi tiêu tháng', value: calculations.monthlyExpense },
    { metric: 'Chênh lệch thu chi', value: calculations.monthlyBalance },
    { metric: 'Tổng hạn mức đã đặt', value: calculations.totalBudget },
    { metric: 'Đã chi theo hạn mức', value: calculations.totalBudgetSpent },
    { metric: 'Tiền tệ hồ sơ', value: profile.currency_code || 'VND' },
    { metric: 'Ngôn ngữ hồ sơ', value: profile.locale || 'vi' },
    { metric: 'Múi giờ hồ sơ', value: profile.time_zone || 'Asia/Ho_Chi_Minh' },
  ]);
  setCurrencyColumn(worksheet, [2]);
}

function addTransactionSheet(workbook, title, transactions, categoriesById) {
  const worksheet = workbook.addWorksheet(title);
  worksheet.columns = [
    { header: 'Ngày', key: 'date', width: 14 },
    { header: 'Loại', key: 'type', width: 12 },
    { header: 'Tên giao dịch', key: 'name', width: 28 },
    { header: 'Mô tả', key: 'description', width: 30 },
    { header: 'Danh mục', key: 'category', width: 24 },
    { header: 'Số tiền', key: 'amount', width: 18 },
    { header: 'Tiền tệ', key: 'currency', width: 10 },
    { header: 'Ghi chú', key: 'note', width: 30 },
    { header: 'Nguồn', key: 'source', width: 12 },
    { header: 'Transaction ID', key: 'id', width: 38 },
  ];
  configureWorksheet(worksheet);
  transactions.forEach((transaction) => {
    const amount = toNumber(transaction.amount);
    worksheet.addRow({
      date: formatDate(transaction.transaction_date),
      type: transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      name: transaction.name || transaction.description || 'Giao dịch',
      description: transaction.description || '',
      category: getCategoryName(categoriesById, transaction.category_id),
      amount: transaction.type === 'expense' ? -amount : amount,
      currency: transaction.currency_code || 'VND',
      note: transaction.note || '',
      source: transaction.source || 'manual',
      id: transaction.transaction_id,
    });
  });
  setCurrencyColumn(worksheet, [6]);
}

function addBudgetSheet(workbook, calculations) {
  const worksheet = workbook.addWorksheet('Hạn mức ngân sách');
  worksheet.columns = [
    { header: 'Danh mục', key: 'category', width: 28 },
    { header: 'Hạn mức', key: 'allocated', width: 18 },
    { header: 'Đã chi', key: 'spent', width: 18 },
    { header: 'Còn lại', key: 'remaining', width: 18 },
    { header: 'Tỷ lệ sử dụng', key: 'percentage', width: 16 },
  ];
  configureWorksheet(worksheet);
  calculations.allocations.forEach((allocation) => {
    worksheet.addRow({
      category: allocation.categoryName,
      allocated: allocation.allocated,
      spent: allocation.spent,
      remaining: allocation.remaining,
      percentage: allocation.percentage,
    });
  });
  worksheet.addRow({
    category: 'Tổng danh mục',
    allocated: calculations.totalBudget,
    spent: calculations.totalBudgetSpent,
    remaining: calculations.totalBudget - calculations.totalBudgetSpent,
    percentage: calculations.totalBudget > 0 ? calculations.totalBudgetSpent / calculations.totalBudget : 0,
  });
  const totalRow = worksheet.lastRow;
  if (totalRow) totalRow.font = { bold: true };
  setCurrencyColumn(worksheet, [2, 3, 4]);
  worksheet.getColumn(5).numFmt = '0.00%';
}

function addChartsSheet(workbook, calculations) {
  const worksheet = workbook.addWorksheet('Biểu đồ');
  worksheet.columns = [
    { header: 'Tên', key: 'label', width: 28 },
    { header: 'Giá trị', key: 'value', width: 18 },
    { header: 'Tỷ lệ', key: 'percent', width: 14 },
  ];
  configureWorksheet(worksheet);

  worksheet.getCell('A3').value = 'Chi tiêu theo tuần';
  worksheet.getCell('A3').font = { bold: true, size: 14 };
  calculations.weeklyExpenses.forEach((item, index) => {
    worksheet.getCell(4 + index, 1).value = item.label;
    worksheet.getCell(4 + index, 2).value = item.value;
  });

  worksheet.getCell('E3').value = 'Chi tiêu theo danh mục';
  worksheet.getCell('E3').font = { bold: true, size: 14 };
  const categoryTotal = calculations.categoryExpenses.reduce((sum, item) => sum + item.value, 0);
  calculations.categoryExpenses.forEach((item, index) => {
    worksheet.getCell(4 + index, 5).value = item.label;
    worksheet.getCell(4 + index, 6).value = item.value;
    worksheet.getCell(4 + index, 7).value = categoryTotal > 0 ? item.value / categoryTotal : 0;
    worksheet.getCell(4 + index, 7).numFmt = '0.00%';
    worksheet.getCell(4 + index, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color.replace('#', 'FF') } };
  });

  worksheet.getCell('A25').value = 'So sánh chi tiêu 6 tháng gần nhất';
  worksheet.getCell('A25').font = { bold: true, size: 14 };
  calculations.monthlyComparison.forEach((item, index) => {
    worksheet.getCell(26 + index, 1).value = item.label;
    worksheet.getCell(26 + index, 2).value = item.value;
  });

  const weeklyImageId = workbook.addImage({
    buffer: renderBarChart(calculations.weeklyExpenses),
    extension: 'png',
  });
  worksheet.addImage(weeklyImageId, {
    tl: { col: 0, row: 10 },
    ext: { width: 560, height: 260 },
  });

  const pieImageId = workbook.addImage({
    buffer: renderPieChart(calculations.categoryExpenses),
    extension: 'png',
  });
  worksheet.addImage(pieImageId, {
    tl: { col: 6, row: 10 },
    ext: { width: 360, height: 250 },
  });

  const lineImageId = workbook.addImage({
    buffer: renderLineChart(calculations.monthlyComparison),
    extension: 'png',
  });
  worksheet.addImage(lineImageId, {
    tl: { col: 0, row: 34 },
    ext: { width: 620, height: 270 },
  });

  setCurrencyColumn(worksheet, [2, 6]);
}

async function buildWorkbookBuffer(data, calculations, params) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartSpend AI';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  addOverviewSheet(workbook, data, calculations, params.year, params.month, params.userEmail);
  addTransactionSheet(workbook, 'Giao dịch trong tháng', data.monthlyTransactions, calculations.categoriesById);
  addTransactionSheet(
    workbook,
    'Thu nhập trong tháng',
    data.monthlyTransactions.filter((transaction) => transaction.type === 'income'),
    calculations.categoriesById
  );
  addBudgetSheet(workbook, calculations);
  addTransactionSheet(workbook, 'Toàn bộ transactions', data.transactions, calculations.categoriesById);
  addChartsSheet(workbook, calculations);

  return workbook.xlsx.writeBuffer();
}

async function createMonthlyReportExport({ supabase, userId, userEmail, year, month, baseDownloadPath }) {
  const normalized = normalizeMonthYear(month, year);
  const data = await fetchReportData(supabase, userId, normalized.year, normalized.month);
  const calculations = calculateReportData(data, normalized.year, normalized.month);
  const exportId = crypto.randomUUID();
  const fileName = `SmartSpendAI-${safeName(userEmail || userId)}-${normalized.year}-${String(normalized.month).padStart(2, '0')}.xlsx`;
  const downloadPath = `${baseDownloadPath}/${exportId}/download`;
  const buffer = await buildWorkbookBuffer(data, calculations, {
    userEmail,
    year: normalized.year,
    month: normalized.month,
  });
  const filePath = getReportFilePath(exportId);
  fs.writeFileSync(filePath, Buffer.from(buffer));

  let insertedExport = null;
  let lastInsertError = null;
  for (const exportType of getExportTypeCandidates()) {
    for (const status of getExportStatusCandidates()) {
      const { error } = await supabase.from('report_exports').insert({
        report_export_id: exportId,
        user_id: userId,
        export_type: exportType,
        period_start: data.period.startDate,
        period_end: data.period.endDateInclusive,
        file_url: downloadPath,
        status,
      });

      if (!error) {
        insertedExport = { exportType, status };
        break;
      }

      lastInsertError = error;
      if (!isRetryableReportExportConstraintError(error)) {
        break;
      }
    }

    if (insertedExport || !isRetryableReportExportConstraintError(lastInsertError)) {
      break;
    }
  }

  if (!insertedExport) {
    fs.unlinkSync(filePath);
    throw lastInsertError;
  }

  return {
    exportId,
    exportType: insertedExport.exportType,
    status: insertedExport.status,
    fileName,
    downloadPath,
    downloadUrl: downloadPath,
    summary: {
      month: normalized.month,
      year: normalized.year,
      transactionCount: data.monthlyTransactions.length,
      incomeTransactionCount: data.monthlyTransactions.filter((transaction) => transaction.type === 'income').length,
      totalIncome: calculations.monthlyIncome,
      totalExpense: calculations.monthlyExpense,
      totalBudget: calculations.totalBudget,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function getExportRecord(supabase, userId, exportId) {
  const { data, error } = await supabase
    .from('report_exports')
    .select('*')
    .eq('report_export_id', exportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = {
  createMonthlyReportExport,
  getExportFilePath: getReportFilePath,
  getExportRecord,
};
