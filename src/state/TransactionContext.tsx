// SmartSpend AI - Transaction Context
// Global state management for transactions across screens
// Used by UC07 (Add Transaction), Budget, Home Dashboard
// Now connected to Supabase database

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Transaction } from '../shared/types';
import { transactionRepository } from '../data/repositories';
import { useAuth } from './AuthContext';
import { useCategories } from './CategoryContext';

interface TransactionContextValue {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  getTransactionsByCategory: (categoryId: string, type?: 'income' | 'expense') => Transaction[];
  getTransactionsByMonth: (month: number, year: number) => Transaction[];
  refreshTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { allCategories } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user ID from auth context
  const currentUserId = user?.id || '';

  const attachCategory = useCallback((transaction: Transaction): Transaction => {
    const category = allCategories.find(cat => cat.id === transaction.categoryId);
    return {
      ...transaction,
      category: category || transaction.category,
    };
  }, [allCategories]);

  // Load transactions from Supabase on mount
  const refreshTransactions = useCallback(async () => {
    if (!currentUserId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await transactionRepository.getAll(currentUserId);
      setTransactions(data.map(attachCategory));
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, attachCategory]);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  // Categories can load after transactions. Re-attach category objects when they change
  // so history cards can display category name/icon/color instead of the fallback.
  useEffect(() => {
    setTransactions(prev => prev.map(attachCategory));
  }, [attachCategory]);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const newTransaction: Transaction = attachCategory({
      ...transactionData,
      userId: currentUserId,
      id: `txn-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      // Try to save to Supabase first
      const saved = await transactionRepository.create({
        userId: currentUserId,
        name: transactionData.name,
        amount: transactionData.amount,
        type: transactionData.type,
        categoryId: transactionData.categoryId,
        note: transactionData.note,
        date: transactionData.date,
      });

      if (saved) {
        const savedWithCategory = attachCategory(saved);
        setTransactions(prev => [savedWithCategory, ...prev]);
        return savedWithCategory;
      }
    } catch (error) {
      console.error('Failed to save transaction to DB:', error);
    }

    // Fallback: save locally
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, [currentUserId, attachCategory]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> => {
    let updatedTxn: Transaction | null = null;

    try {
      // Try to update in Supabase first
      const saved = await transactionRepository.update(id, updates);

      if (saved) {
        const savedWithCategory = attachCategory(saved);
        setTransactions(prev => prev.map(txn =>
          txn.id === id ? { ...txn, ...savedWithCategory, updatedAt: new Date() } : txn
        ));
        return savedWithCategory;
      }
    } catch (error) {
      console.error('Failed to update transaction in DB:', error);
    }

    // Fallback: update locally
    setTransactions(prev => prev.map(txn => {
      if (txn.id === id) {
        updatedTxn = {
          ...txn,
          ...updates,
          updatedAt: new Date(),
        };
        updatedTxn = attachCategory(updatedTxn);
        return updatedTxn;
      }
      return txn;
    }));
    return updatedTxn;
  }, [attachCategory]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    try {
      // Try to delete from Supabase first
      await transactionRepository.delete(id);
    } catch (error) {
      console.error('Failed to delete transaction from DB:', error);
    }

    // Remove from local state regardless
    setTransactions(prev => prev.filter(txn => txn.id !== id));
  }, []);

  const getTransaction = useCallback((id: string) => {
    return transactions.find(txn => txn.id === id);
  }, [transactions]);

  const getTransactionsByCategory = useCallback((categoryId: string, type?: 'income' | 'expense') => {
    return transactions.filter(txn => {
      const matchesCategory = txn.categoryId === categoryId;
      const matchesType = type ? txn.type === type : true;
      return matchesCategory && matchesType;
    });
  }, [transactions]);

  const getTransactionsByMonth = useCallback((month: number, year: number) => {
    return transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate.getMonth() === month && txnDate.getFullYear() === year;
    });
  }, [transactions]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        isLoading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransaction,
        getTransactionsByCategory,
        getTransactionsByMonth,
        refreshTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = (): TransactionContextValue => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within TransactionProvider');
  }
  return context;
};
