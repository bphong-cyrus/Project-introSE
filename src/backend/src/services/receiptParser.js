// SmartSpend AI - Receipt parser service (server-side).
// Mirrors the role of the parser in SAD §4.2.6 ("extractReceiptData",
// "suggestCategory"). Takes the raw text Gemini returns and the list of
// available categories from the data layer, and produces an
// ExtractedReceiptData envelope the mobile client understands.

const { analyzeReceipt, GeminiApiError, GeminiConfigError } = require('./geminiClient');

const SYSTEM_PROMPT = `Bạn là một trợ lý AI chuyên trích xuất dữ liệu từ hóa đơn (receipt / bill) cho ứng dụng quản lý chi tiêu cá nhân tại Việt Nam.

Nhiệm vụ: nhìn ảnh hóa đơn và trả về ĐÚNG MỘT đối tượng JSON (không markdown, không giải thích, không code block) theo schema:

{
  "amount": <number>,                  // Tổng tiền cuối cùng phải trả bằng VND (số nguyên). Ưu tiên "Tổng cộng/TOTAL/Grand Total/Thanh toán".
  "date": "<YYYY-MM-DDTHH:mm:ss>",     // Ngày giờ trên hóa đơn, ISO 8601, timezone Asia/Ho_Chi_Minh. Không thấy giờ thì 12:00:00.
  "merchant_name": "<string>",         // Tên cửa hàng / nhà hàng / brand.
  "suggested_category": "<string>",    // Một trong: Ăn uống, Di chuyển, Mua sắm, Học tập, Khác, Lương, Thưởng, Đầu tư.
  "transaction_type": "expense" | "income", // mặc định "expense".
  "confidence": {                      // mức độ tin cậy 0-100
    "amount": <number>,
    "date": <number>,
    "merchant_name": <number>,
    "category": <number>,
    "type": <number>
  },
  "notes": "<string>"                  // ghi chú ngắn ≤120 ký tự, rỗng nếu không có.
}

Yêu cầu:
- amount là số nguyên dương.
- Nếu không phải hóa đơn hoặc không đọc được, vẫn trả JSON đúng schema, đặt confidence thấp (10-30) và notes="Không nhận diện được hóa đơn".
- Trả về JSON GỌN, không thêm line_items, không markdown, không text thừa.
`;

const USER_PROMPT =
  'Trích xuất thông tin từ ảnh hóa đơn này và trả về JSON theo schema.';

/* -------------------------------------------------------------------------- */
/* Static category list (mirror of mobile app)                               */
/* -------------------------------------------------------------------------- */
// In production this comes from Supabase via the Category Repository
// (SAD §4.3.x). For now we hardcode the same defaults the mobile app uses so
// the API can return category_id directly.
const CATEGORIES = [
  { id: 'exp-cat-1', name: 'Ăn uống', type: 'expense' },
  { id: 'exp-cat-2', name: 'Di chuyển', type: 'expense' },
  { id: 'exp-cat-3', name: 'Mua sắm', type: 'expense' },
  { id: 'exp-cat-4', name: 'Học tập', type: 'expense' },
  { id: 'exp-cat-5', name: 'Khác', type: 'expense' },
  { id: 'inc-cat-1', name: 'Lương', type: 'income' },
  { id: 'inc-cat-2', name: 'Thưởng', type: 'income' },
  { id: 'inc-cat-3', name: 'Đầu tư', type: 'income' },
];

/* -------------------------------------------------------------------------- */
/* Public                                                                     */
/* -------------------------------------------------------------------------- */

async function parseReceipt({ mediaType, buffer, availableCategories }) {
  const { rawText, model, usage } = await analyzeReceipt({
    mediaType,
    buffer,
    system: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT,
  });

  const json = safeParseJson(rawText);
  if (!json) {
    // eslint-disable-next-line no-console
    console.error('[receiptParser] Gemini rawText was not parseable as JSON:');
    // eslint-disable-next-line no-console
    console.error(rawText);
    const err = new Error(
      'Gemini trả về kết quả không đúng định dạng JSON. Vui lòng thử lại với ảnh rõ hơn.',
    );
    err.status = 502;
    throw err;
  }

  const cats = Array.isArray(availableCategories) && availableCategories.length > 0
    ? availableCategories
    : CATEGORIES;

  return {
    model,
    usage,
    rawText,
    data: mapToExtractedReceiptData(json, cats),
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function safeParseJson(text) {
  if (!text) return null;
  const stripped = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const first = stripped.indexOf('{');
    const last = stripped.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(stripped.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampConfidence(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

function pickCategoryByName(name, categories) {
  if (!name) return null;
  const lower = String(name).trim().toLowerCase();
  return (
    categories.find((c) => String(c.name).trim().toLowerCase() === lower) ||
    categories.find((c) => lower.includes(String(c.name).trim().toLowerCase())) ||
    null
  );
}

function mapToExtractedReceiptData(parsed, categories) {
  const rawAmount = Number(parsed.amount);
  const amount =
    Number.isFinite(rawAmount) && rawAmount > 0 ? Math.round(rawAmount) : 0;

  const type = parsed.transaction_type === 'income' ? 'income' : 'expense';

  const dateIso = typeof parsed.date === 'string' ? parsed.date : '';
  const parsedDate = dateIso ? new Date(dateIso) : new Date();
  const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const merchantName =
    typeof parsed.merchant_name === 'string' && parsed.merchant_name.trim().length > 0
      ? parsed.merchant_name.trim()
      : 'Cửa hàng';

  const suggestedCategoryName =
    typeof parsed.suggested_category === 'string'
      ? parsed.suggested_category.trim()
      : '';
  const matchedCategory =
    pickCategoryByName(suggestedCategoryName, categories) ||
    (type === 'income'
      ? categories.find((c) => c.type === 'income')
      : categories.find((c) => c.type === 'expense')) ||
    categories[0] ||
    null;

  const note =
    typeof parsed.notes === 'string' ? parsed.notes.slice(0, 200) : '';

  const conf = parsed.confidence || {};
  return {
    amount,
    storeName: merchantName,
    date: date.toISOString(),
    categoryId: matchedCategory ? matchedCategory.id : '',
    categoryName: matchedCategory ? matchedCategory.name : suggestedCategoryName,
    note,
    type,
    confidence: {
      amount: clampConfidence(conf.amount),
      storeName: clampConfidence(conf.merchant_name),
      date: clampConfidence(conf.date),
      category: clampConfidence(conf.category),
      type: clampConfidence(conf.type),
    },
  };
}

module.exports = {
  parseReceipt,
  CATEGORIES,
  GeminiApiError,
  GeminiConfigError,
};