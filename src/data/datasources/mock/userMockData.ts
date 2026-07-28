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

// ============ TRANSACTIONS (MOCK - REPLACE LATER) ============
// TODO: Remove this mock data when API is ready
export const userTransactions: Transaction[] = [
  // Expense transactions
  {
    id: 'txn-001',
    userId: 'user-1',
    name: 'Cơm gà xối mỡ',
    amount: 45000,
    type: 'expense',
    categoryId: 'exp-cat-1',
    category: expenseCategories[0],
    date: new Date(2026, 6, 17), // 17/07/2026
    note: 'Ăn trưa với đồng nghiệp',
    createdAt: new Date(2026, 6, 17, 12, 30),
    updatedAt: new Date(2026, 6, 17, 12, 30),
  },
  {
    id: 'txn-002',
    userId: 'user-1',
    name: 'Grab về nhà',
    amount: 65000,
    type: 'expense',
    categoryId: 'exp-cat-2',
    category: expenseCategories[1],
    date: new Date(2026, 6, 17),
    note: 'Đi làm về',
    createdAt: new Date(2026, 6, 17, 19, 15),
    updatedAt: new Date(2026, 6, 17, 19, 15),
  },
  {
    id: 'txn-003',
    userId: 'user-1',
    name: 'Mua sách lập trình',
    amount: 180000,
    type: 'expense',
    categoryId: 'exp-cat-4',
    category: expenseCategories[3],
    date: new Date(2026, 6, 16),
    note: 'Sách React Native',
    createdAt: new Date(2026, 6, 16, 14, 20),
    updatedAt: new Date(2026, 6, 16, 14, 20),
  },
  // Income transactions
  {
    id: 'txn-004',
    userId: 'user-1',
    name: 'Lương tháng 7',
    amount: 5000000,
    type: 'income',
    categoryId: 'inc-cat-1',
    category: incomeCategories[0],
    date: new Date(2026, 6, 15),
    note: 'Lương part-time',
    createdAt: new Date(2026, 6, 15, 9, 0),
    updatedAt: new Date(2026, 6, 15, 9, 0),
  },
  {
    id: 'txn-005',
    userId: 'user-1',
    name: 'Thưởng dự án',
    amount: 1000000,
    type: 'income',
    categoryId: 'inc-cat-2',
    category: incomeCategories[1],
    date: new Date(2026, 6, 10),
    note: 'Thưởng hoàn thành dự án',
    createdAt: new Date(2026, 6, 10, 15, 30),
    updatedAt: new Date(2026, 6, 10, 15, 30),
  },
  {
    id: 'txn-006',
    userId: 'user-1',
    name: 'Cổ tức cổ phiếu',
    amount: 500000,
    type: 'income',
    categoryId: 'inc-cat-3',
    category: incomeCategories[2],
    date: new Date(2026, 6, 5),
    note: 'Cổ tức tháng 7',
    createdAt: new Date(2026, 6, 5, 10, 0),
    updatedAt: new Date(2026, 6, 5, 10, 0),
  },
];

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
