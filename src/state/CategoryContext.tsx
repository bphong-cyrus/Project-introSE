// SmartSpend AI - Category Context
// Global state management for categories
// Shared between UC06 (Categories), UC07 (Add Transaction), UC10 (Budget)

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Category } from '../shared/types';
import { expenseCategories, incomeCategories } from '../data/datasources/mock/userMockData';

interface CategoryContextValue {
  expenseCategories: Category[];
  incomeCategories: Category[];
  allCategories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Category;
  deleteCategory: (id: string) => void;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenseCats, setExpenseCats] = useState<Category[]>(expenseCategories);
  const [incomeCats, setIncomeCats] = useState<Category[]>(incomeCategories);

  const addCategory = useCallback((categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `${categoryData.type === 'expense' ? 'exp' : 'inc'}-cat-${Date.now()}`,
    };
    if (categoryData.type === 'expense') {
      setExpenseCats(prev => [...prev, newCategory]);
    } else {
      setIncomeCats(prev => [...prev, newCategory]);
    }
    return newCategory;
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setExpenseCats(prev => prev.filter(c => c.id !== id));
    setIncomeCats(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCategoriesByType = useCallback((type: 'income' | 'expense') => {
    return type === 'expense' ? expenseCats : incomeCats;
  }, [expenseCats, incomeCats]);

  return (
    <CategoryContext.Provider
      value={{
        expenseCategories: expenseCats,
        incomeCategories: incomeCats,
        allCategories: [...expenseCats, ...incomeCats],
        addCategory,
        deleteCategory,
        getCategoriesByType,
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
