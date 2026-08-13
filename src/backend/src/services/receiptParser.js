// SmartSpend AI - Receipt parser service (server-side).
//
// Gemini performs the vision/OCR step. This module validates and normalises
// the model response so the mobile app and Supabase receive one stable shape.
// In particular, the OCR amount is signed: negative = expense and positive =
// income. The persisted `amount` remains absolute because the transactions
// table stores a positive amount together with its `type` column.

const { analyzeReceipt, GeminiApiError, GeminiConfigError } = require('./geminiClient');

function buildSystemPrompt(categories) {
  const expenseCats = categories
    .filter((c) => c.type === 'expense')
    .map((c) => c.name)
    .join(', ');
  const incomeCats = categories
    .filter((c) => c.type === 'income')
    .map((c) => c.name)
    .join(', ');

  return `You are a financial OCR assistant for a Vietnamese personal finance app.

The image can be a receipt, a bank transfer received, a salary/bonus slip, or a bank transfer sent.

SIGN RULE (mandatory):
- Return the OCR amount as a signed integer in VND. A negative amount means EXPENSE. A positive amount means INCOME.
- For a purchase receipt or money sent out, return a negative amount (for example -130000).
- For money received, salary, bonus, or investment return, return a positive amount (for example 13000000).
- Never remove the sign and never return an absolute value for the signed amount.

Return exactly one JSON object (no markdown and no explanation) with this schema:
{
  "amount": <signed integer>,
  "signed_amount": <signed integer>,
  "date": "<YYYY-MM-DDTHH:mm:ss>",
  "merchant_name": "<string>",
  "suggested_category": "<string>",
  "transaction_type": "expense" | "income",
  "confidence": {
    "amount": <number>,
    "date": <number>,
    "merchant_name": <number>,
    "category": <number>,
    "type": <number>
  },
  "notes": "<string>"
}

EXPENSE CATEGORIES (use only for a negative amount): ${expenseCats}
INCOME CATEGORIES (use only for a positive amount): ${incomeCats}

CONFIDENCE SCORING RULES (CRITICAL):
- When you can clearly read/identify a field from the image, confidence MUST be 60-95.
- When you CANNOT read or are UNCERTAIN about a field, confidence should be 10-30.
- Common mistakes: Do NOT return low confidence (10-30) for fields you CAN clearly see.
- The confidence score reflects how certain YOU ARE, not the quality of the receipt.
- Example: If you clearly see "150,000 VND" on the receipt, return "amount": 150000 with confidence >= 70.
- Example: If the merchant name is blurry or missing, return empty string with confidence 10-30.

Requirements:
- Prefer the final total/grand total on receipts and the transaction amount on bank screenshots.
- The sign is the source of truth for type. Keep transaction_type consistent with it.
- suggested_category must exactly match a category name from the correct list (including accents).
- If a required field is not visible, return null/empty string and confidence 10-30 for that field. Do not invent values.
- Return concise JSON only.
`;
}

const USER_PROMPT =
  'Read the image with OCR and return the signed financial transaction JSON described in the system instructions.';

// Fallback list used when the mobile request cannot provide the categories
// loaded from Supabase. IDs and names mirror the mobile defaults.
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

async function parseReceipt({ mediaType, buffer, availableCategories }) {
  const suppliedCategories = normaliseCategories(availableCategories);
  const cats = suppliedCategories.length > 0 ? suppliedCategories : CATEGORIES;

  const { rawText, model, usage } = await analyzeReceipt({
    mediaType,
    buffer,
    system: buildSystemPrompt(cats),
    userPrompt: USER_PROMPT,
  });

  const json = safeParseJson(rawText);
  if (!json) {
    const err = new Error(
      'Gemini trả về kết quả không đúng định dạng JSON. Vui lòng thử lại với ảnh rõ hơn.',
    );
    err.status = 502;
    throw err;
  }

  return {
    model,
    usage,
    rawText,
    data: mapToExtractedReceiptData(json, cats),
  };
}

function safeParseJson(text) {
  if (!text) return null;
  const stripped = String(text)
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

function clampConfidence(value, fallback = 60) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const rounded = Math.max(0, Math.min(100, Math.round(number)));
  // Nếu AI trả về confidence quá thấp (<20) nhưng field hợp lệ,
  // có thể AI không hiểu yêu cầu - boost lên minimum 60
  if (rounded < 20 && fallback >= 60) return 60;
  return rounded;
}

function confidenceFor(value, isValid) {
  // Khi field hợp lệ: fallback = 60 (thay vì 30)
  // Khi field không hợp lệ: fallback = 15
  const confidence = clampConfidence(value, isValid ? 60 : 15);
  // A model must not mark a field as highly confident when it was absent.
  return isValid ? confidence : Math.min(confidence, 30);
}

function normaliseCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((category) => ({
      ...category,
      id: category && (category.id || category.category_id),
      name: category && typeof category.name === 'string' ? category.name.trim() : '',
      type: category && category.type,
    }))
    .filter((category) =>
      category.id &&
      category.name &&
      (category.type === 'income' || category.type === 'expense'),
    );
}

function parseSignedAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string' || !value.trim()) return 0;

  const text = value.trim();
  const negative = /^[\u2212-]/.test(text) || /[\u2212-]$/.test(text) || /^\(.*\)$/.test(text);
  // VND OCR commonly uses dots/commas as thousands separators. Removing all
  // non-digits turns "-130.000" into -130000 instead of -130.
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function pickCategoryByName(name, categories, type) {
  if (!name) return null;
  const lower = foldText(name);
  const scoped = categories.filter((category) => category.type === type);
  return (
    scoped.find((category) => foldText(category.name) === lower) ||
    scoped.find((category) => foldText(category.name).includes(lower)) ||
    scoped.find((category) => lower.includes(foldText(category.name))) ||
    null
  );
}

function foldText(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function mapToExtractedReceiptData(parsed, categories) {
  const normalisedCategories = normaliseCategories(categories);
  categories = normalisedCategories.length > 0 ? normalisedCategories : CATEGORIES;

  const hasExplicitSignedAmount = Boolean(parsed &&
    parsed.signed_amount !== undefined &&
    parsed.signed_amount !== null &&
    parsed.signed_amount !== '');
  const amountValue = hasExplicitSignedAmount
    ? parsed.signed_amount
    : parsed && parsed.amount;
  let signedAmount = parseSignedAmount(amountValue);
  // Backward compatibility for an older model response where `amount` was
  // documented as an absolute value: only that legacy shape may use the
  // declared type to restore the missing expense sign. New responses always
  // include signed_amount and are governed exclusively by its sign.
  if (!hasExplicitSignedAmount && signedAmount > 0 && parsed && parsed.transaction_type === 'expense') {
    signedAmount = -signedAmount;
  }
  const roundedSignedAmount = Math.round(signedAmount);

  // The OCR sign is authoritative. The semantic type is only a fallback for
  // an unreadable/zero amount, and is deliberately given low confidence.
  const type = roundedSignedAmount < 0
    ? 'expense'
    : roundedSignedAmount > 0
      ? 'income'
      : parsed && parsed.transaction_type === 'income' ? 'income' : 'expense';
  const declaredType = parsed && parsed.transaction_type;
  const typeMatchesSign =
    roundedSignedAmount === 0 ||
    (declaredType !== 'income' && declaredType !== 'expense') ||
    declaredType === type;
  const amount = Math.abs(roundedSignedAmount);

  const dateIso = parsed && typeof parsed.date === 'string' ? parsed.date : '';
  const parsedDate = dateIso ? new Date(dateIso) : new Date();
  const hasValidDate = Boolean(dateIso) && !Number.isNaN(parsedDate.getTime());
  const date = hasValidDate ? parsedDate : new Date();

  const rawMerchantName =
    parsed && typeof parsed.merchant_name === 'string' ? parsed.merchant_name.trim() : '';
  const merchantName = isPlaceholderText(rawMerchantName) ? '' : rawMerchantName;
  const suggestedCategoryName =
    parsed && typeof parsed.suggested_category === 'string'
      ? parsed.suggested_category.trim()
      : '';
  const matchedSuggestedCategory = pickCategoryByName(
    suggestedCategoryName,
    categories,
    type,
  );
  const matchedCategory =
    matchedSuggestedCategory || categories.find((category) => category.type === type) || null;

  const confidence = parsed && parsed.confidence && typeof parsed.confidence === 'object'
    ? parsed.confidence
    : {};
  const fieldConfidence = {
    amount: confidenceFor(confidence.amount, amount > 0),
    storeName: confidenceFor(confidence.merchant_name, merchantName.length > 0),
    date: confidenceFor(confidence.date, hasValidDate),
    category: confidenceFor(confidence.category, Boolean(matchedSuggestedCategory)),
    type: confidenceFor(confidence.type, roundedSignedAmount !== 0 && typeMatchesSign),
  };

  const missingFields = [];
  if (amount <= 0) missingFields.push('amount');
  if (!merchantName) missingFields.push('storeName');
  if (!hasValidDate) missingFields.push('date');
  if (!matchedSuggestedCategory) missingFields.push('category');
  if (roundedSignedAmount === 0 || !typeMatchesSign) missingFields.push('type');

  // The minimum field confidence prevents one missing required field from
  // being hidden by a high average from the other fields.
  const overallConfidence = Math.min(...Object.values(fieldConfidence));
  const needsManualReview = missingFields.length > 0 || overallConfidence < 80;
  const note = parsed && typeof parsed.notes === 'string' ? parsed.notes.slice(0, 200) : '';

  return {
    // `amount` is the positive value expected by Supabase transactions.amount.
    // `signedAmount` preserves the OCR sign used to derive `type`.
    amount,
    signedAmount: roundedSignedAmount,
    storeName: merchantName,
    date: date.toISOString(),
    categoryId: matchedCategory ? matchedCategory.id : '',
    categoryName: matchedCategory ? matchedCategory.name : suggestedCategoryName,
    note: note || (needsManualReview
      ? 'Một số trường chưa nhận diện được, vui lòng kiểm tra và điền bổ sung.'
      : ''),
    type,
    confidence: { ...fieldConfidence, overall: overallConfidence },
    overallConfidence,
    missingFields,
    needsManualReview,
    autoApproved: !needsManualReview,
  };
}

function isPlaceholderText(value) {
  if (!value) return true;
  return /^(c(?:u|ử)a\s*h(?:a|à)ng|store|merchant|unknown|n\/?a|none|null|kh(?:o|ô)ng\s*r(?:o|õ))$/i.test(value.trim());
}

module.exports = {
  parseReceipt,
  CATEGORIES,
  mapToExtractedReceiptData,
  parseSignedAmount,
  GeminiApiError,
  GeminiConfigError,
};
