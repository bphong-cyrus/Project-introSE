// SmartSpend AI - User Mock Data
// TODO: Replace with real API data when backend is ready
// This file will be removed/deleted once real data is integrated

import { User, Category, Transaction, CategoryBreakdown } from '../../../shared/types';

// ============ DEFAULT EXPENSE CATEGORIES ============
export const expenseCategories: Category[] = [
  { id: 'exp-cat-1', name: 'Ăn uống', icon: 'restaurant', color: '#FF6B6B', type: 'expense', isDefault: true },
  { id: 'exp-cat-2', name: 'Di chuyển', icon: 'car', color: '#4ECDC4', type: 'expense', isDefault: true },
  { id: 'exp-cat-3', name: 'Mua sắm', icon: 'cart', color: '#FFE66D', type: 'expense', isDefault: true },
  { id: 'exp-cat-4', name: 'Học tập', icon: 'book', color: '#95E1D3', type: 'expense', isDefault: true },
  { id: 'exp-cat-5', name: 'Khác', icon: 'ellipsis-horizontal', color: '#A8E6CF', type: 'expense', isDefault: true },
];

// ============ DEFAULT INCOME CATEGORIES ============
export const incomeCategories: Category[] = [
  { id: 'inc-cat-1', name: 'Lương', icon: 'cash', color: '#4CAF50', type: 'income', isDefault: true },
  { id: 'inc-cat-2', name: 'Thưởng', icon: 'gift', color: '#8BC34A', type: 'income', isDefault: true },
  { id: 'inc-cat-3', name: 'Đầu tư', icon: 'trending-up', color: '#009688', type: 'income', isDefault: true },
];

// ============ ALL CATEGORIES ============
export const userCategories: Category[] = [...expenseCategories, ...incomeCategories];

// ============ USER INFO ============
export const currentUser: User = {
  id: 'user-1',
  email: 'nguyenvana@example.com',
  fullName: 'Nguyễn Văn A',
  age: 22,
  job: 'Sinh viên',
  income: 5000000,
  createdAt: new Date('2026-01-15'),
};

// ============ TRANSACTIONS ============
export const userTransactions: Transaction[] = [];

// ============ CATEGORY BREAKDOWN (for Home Screen) ============
export const userCategoryBreakdown: CategoryBreakdown[] = expenseCategories.map((cat) => {
  const catTransactions = userTransactions.filter(
    (txn) => txn.categoryId === cat.id && txn.type === 'expense'
  );
  const amount = catTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  return {
    categoryId: cat.id,
    category: cat,
    amount,
    percentage: 0, // Calculate in component
    transactionCount: catTransactions.length,
  };
});
