// SmartSpend AI - Type Definitions

// User Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  age?: number;
  dateOfBirth?: string;
  job?: string;
  income?: number;
  createdAt: Date;
}

// Category Types
export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;    // 'income' or 'expense'
  isDefault: boolean;   // System default vs user-created
  userId?: string;      // For custom categories
}

// Transaction Types
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  name: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: Category;
  date: Date;
  note?: string;
  imageUrl?: string;    // For AI-scanned receipts
  source?: 'manual' | 'ocr' | string;
  createdAt: Date;
  updatedAt: Date;
}

// Budget Types
export interface Budget {
  id: string;
  userId: string;
  month: number;       // 1-12
  year: number;
  totalBudget: number;
  totalSpent: number;
  savingsGoal: number;
  categories: CategoryBudget[];
}

export interface CategoryBudget {
  id?: string;
  categoryId?: string;
  category?: Category;
  budgetLimit: number;
  spent: number;
}

// Wallet Types
export interface Wallet {
  id: string;
  userId: string;
  name: string;
  balance: number;
  currency: string;
  isDefault: boolean;
}

// Report Types
export interface MonthlyReport {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: CategoryBreakdown[];
  transactions: Transaction[];
}

export interface CategoryBreakdown {
  categoryId: string;
  category: Category;
  amount: number;
  percentage: number;
  transactionCount: number;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OTP: { email: string; purpose: 'register' | 'resetPassword' | 'changePassword' };
  SetNewPassword: { email: string };
  Main: undefined;
  Profile: undefined;
  AddTransaction: { type: TransactionType };
  EditTransaction: { transactionId: string };
  TransactionDetail: { transactionId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Add: undefined;
  Budget: undefined;
  Profile: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter Types
export interface TransactionFilter {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  type?: TransactionType;
  minAmount?: number;
  maxAmount?: number;
  searchKeyword?: string;
}
