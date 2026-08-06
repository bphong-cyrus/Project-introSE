// SmartSpend AI - Category Context
// Global state management for categories
// Shared between UC06 (Categories), UC07 (Add Transaction), UC10 (Budget)

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Category } from '../shared/types';
import { categoryRepository, transactionRepository } from '../data/repositories';
import { useAuth } from './AuthContext';

// Default categories as fallback when DB is unavailable
const defaultExpenseCategories: Category[] = [
  { id: 'exp-cat-1', userId: '', name: 'Ăn uống', type: 'expense', icon: 'restaurant', color: '#FF6B6B', isDefault: true },
  { id: 'exp-cat-2', userId: '', name: 'Di chuyển', type: 'expense', icon: 'car', color: '#4ECDC4', isDefault: true },
  { id: 'exp-cat-3', userId: '', name: 'Mua sắm', type: 'expense', icon: 'cart', color: '#45B7D1', isDefault: true },
  { id: 'exp-cat-4', userId: '', name: 'Học tập', type: 'expense', icon: 'book', color: '#96CEB4', isDefault: true },
  { id: 'exp-cat-5', userId: '', name: 'Khác', type: 'expense', icon: 'ellipsis-horizontal', color: '#607D8B', isDefault: true },
];

const defaultIncomeCategories: Category[] = [
  { id: 'inc-cat-1', userId: '', name: 'Lương', type: 'income', icon: 'cash', color: '#81C784', isDefault: true },
  { id: 'inc-cat-2', userId: '', name: 'Thưởng', type: 'income', icon: 'gift', color: '#FFD54F', isDefault: true },
  { id: 'inc-cat-3', userId: '', name: 'Đầu tư', type: 'income', icon: 'trending-up', color: '#4DB6AC', isDefault: true },
];

interface CategoryContextValue {
  expenseCategories: Category[];
  incomeCategories: Category[];
  allCategories: Category[];
  isLoading: boolean;
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | null>;
  deleteCategory: (id: string, targetCategoryId?: string) => Promise<boolean>;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [expenseCats, setExpenseCats] = useState<Category[]>(defaultExpenseCategories);
  const [incomeCats, setIncomeCats] = useState<Category[]>(defaultIncomeCategories);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user ID from auth context
  const currentUserId = user?.id || '';

  // Load categories from Supabase on mount
  const refreshCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const [expense, income] = await Promise.all([
        categoryRepository.getExpenseCategories(currentUserId),
        categoryRepository.getIncomeCategories(currentUserId),
      ]);

      setExpenseCats(expense.length > 0 ? expense : defaultExpenseCategories);
      setIncomeCats(income.length > 0 ? income : defaultIncomeCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      refreshCategories();
    } else {
      setExpenseCats(defaultExpenseCategories);
      setIncomeCats(defaultIncomeCategories);
      setIsLoading(false);
    }
  }, [currentUserId, refreshCategories]);

  const addCategory = useCallback(async (categoryData: Omit<Category, 'id'>): Promise<Category | null> => {
    try {
      if (!currentUserId) {
        console.error('Failed to add category: user is not authenticated');
        return null;
      }

      const newCategory = await categoryRepository.create(
        currentUserId,
        categoryData.name,
        categoryData.type,
        categoryData.icon,
        categoryData.color
      );

      if (newCategory) {
        if (categoryData.type === 'expense') {
          setExpenseCats(prev => [...prev, newCategory]);
        } else {
          setIncomeCats(prev => [...prev, newCategory]);
        }
        return newCategory;
      }

      return null;
    } catch (error) {
      console.error('Failed to add category:', error);
      return null;
    }
  }, [currentUserId]);

  const deleteCategory = useCallback(async (id: string, targetCategoryId?: string): Promise<boolean> => {
    try {
      if (!currentUserId) {
        console.error('Failed to delete category: user is not authenticated');
        return false;
      }

      if (targetCategoryId && targetCategoryId !== id) {
        const transferSuccess = await transactionRepository.transferCategory(
          currentUserId,
          id,
          targetCategoryId
        );

        if (!transferSuccess) {
          console.error('Failed to delete category: transaction transfer failed');
          return false;
        }
      }

      const success = await categoryRepository.delete(id, currentUserId);
      if (success) {
        setExpenseCats(prev => prev.filter(c => c.id !== id));
        setIncomeCats(prev => prev.filter(c => c.id !== id));
      }
      return success;
    } catch (error) {
      console.error('Failed to delete category:', error);
      return false;
    }
  }, [currentUserId]);

  const getCategoriesByType = useCallback((type: 'income' | 'expense') => {
    return type === 'expense' ? expenseCats : incomeCats;
  }, [expenseCats, incomeCats]);

  return (
    <CategoryContext.Provider
      value={{
        expenseCategories: expenseCats,
        incomeCategories: incomeCats,
        allCategories: [...expenseCats, ...incomeCats],
        isLoading,
        addCategory,
        deleteCategory,
        getCategoriesByType,
        refreshCategories,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = (): CategoryContextValue => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
};
