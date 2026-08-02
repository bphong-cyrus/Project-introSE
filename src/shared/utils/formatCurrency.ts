// SmartSpend AI - Utility Functions
// Currency formatting and date helpers

import { Category } from '../types';
import { userCategories } from '../../data/datasources/mock/userMockData';

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
};

// Helper function to format date
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// Helper function to get category by ID
export const getCategoryById = (id: string): Category | undefined => {
  return userCategories.find(cat => cat.id === id);
};

// Helper function to format percentage
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Helper function to format relative date
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return formatDate(date);
};
