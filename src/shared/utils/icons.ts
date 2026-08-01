// SmartSpend AI - Icon utilities
// Keep category icons compatible with @expo/vector-icons Ionicons.

const EMOJI_TO_IONICON: Record<string, string> = {
  '🍜': 'restaurant',
  '🍔': 'fast-food',
  '🚗': 'car',
  '🛒': 'cart',
  '📚': 'book',
  '🎮': 'game-controller',
  '💊': 'medical',
  '🏠': 'home',
  '💡': 'bulb',
  '📌': 'ellipsis-horizontal',
  '💰': 'cash',
  '💵': 'wallet',
  '🎁': 'gift',
  '📈': 'trending-up',
};

const CATEGORY_NAME_TO_IONICON: Record<string, string> = {
  'Ăn uống': 'restaurant',
  'Food & Drinks': 'restaurant',
  'Di chuyển': 'car',
  Transportation: 'car',
  'Mua sắm': 'cart',
  Shopping: 'cart',
  'Học tập': 'book',
  Education: 'book',
  'Giải trí': 'game-controller',
  Entertainment: 'game-controller',
  'Sức khỏe': 'medical',
  Health: 'medical',
  'Nhà cửa': 'home',
  Home: 'home',
  'Lương': 'cash',
  Salary: 'cash',
  'Thưởng': 'gift',
  Bonus: 'gift',
  'Đầu tư': 'trending-up',
  Investment: 'trending-up',
  Freelance: 'briefcase',
  'Quà tặng': 'gift',
  Gift: 'gift',
  'Khác': 'ellipsis-horizontal',
  Other: 'ellipsis-horizontal',
};

export const toIoniconName = (
  icon?: string | null,
  categoryName?: string | null,
  fallback = 'ellipsis-horizontal'
): string => {
  if (icon) {
    return EMOJI_TO_IONICON[icon] || icon;
  }

  if (categoryName) {
    return CATEGORY_NAME_TO_IONICON[categoryName] || fallback;
  }

  return fallback;
};
