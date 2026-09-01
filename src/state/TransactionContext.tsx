// SmartSpend AI - Transaction Context
// Global state management for transactions across screens
// Used by UC07 (Add Transaction), Budget, Home Dashboard
// Now connected to Supabase database

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Transaction } from '../shared/types';
import { transactionRepository } from '../data/repositories';
import { useAuth } from './AuthContext';
import { useCategories } from './CategoryContext';
import { supabase } from '../data/datasources/supabase/supabase';

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

const dedupeTransactionsById = (items: Transaction[]): Transaction[] => {
  const seen = new Set<string>();
  const deduped: Transaction[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
};

const upsertTransactionById = (items: Transaction[], next: Transaction): Transaction[] => {
  let found = false;
  const updated = items.map((item) => {
    if (item.id !== next.id) return item;
    found = true;
    return next;
  });

  return dedupeTransactionsById(found ? updated : [next, ...updated]);
};

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
      setTransactions(dedupeTransactionsById(data.map(attachCategory)));
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, attachCategory]);

  const refreshBudgetForTransaction = useCallback(async (transaction?: Pick<Transaction, 'type' | 'date'> | null) => {
    if (!currentUserId || !transaction || transaction.type !== 'expense') return;

    const transactionDate = new Date(transaction.date);
    if (Number.isNaN(transactionDate.getTime())) return;

    const { error } = await supabase.rpc('refresh_user_budget_spending', {
      target_year: transactionDate.getFullYear(),
      target_month: transactionDate.getMonth() + 1,
    });

    if (error) {
      console.warn('Không thể cập nhật số tiền đã chi trong ngân sách danh mục:', error.message);
    }
  }, [currentUserId]);

  const evaluateBudgetWarnings = useCallback(async (
    ...affectedTransactions: Array<Pick<Transaction, 'type' | 'date'> | null | undefined>
  ) => {
    if (!currentUserId) return;

    for (const transaction of affectedTransactions) {
      await refreshBudgetForTransaction(transaction);
    }

    const { error } = await supabase.rpc('evaluate_user_budget_notifications');
    if (error) {
      console.warn('Không thể kiểm tra cảnh báo ngân sách sau khi cập nhật giao dịch:', error.message);
    }
  }, [currentUserId, refreshBudgetForTransaction]);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(`transactions-realtime-${currentUserId}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${currentUserId}` },
      () => {
        refreshTransactions();
      }
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshTransactions]);

  // Categories can load after transactions. Re-attach category objects when they change
  // so history cards can display category name/icon/color instead of the fallback.
  useEffect(() => {
    setTransactions(prev => dedupeTransactionsById(prev.map(attachCategory)));
  }, [attachCategory]);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    try {
      // Try to save to Supabase first
      const saved = await transactionRepository.create({
        userId: currentUserId || transactionData.userId,
        name: transactionData.name,
        amount: transactionData.amount,
        type: transactionData.type,
        categoryId: transactionData.categoryId,
        note: transactionData.note,
        date: transactionData.date,
        imageUrl: transactionData.imageUrl,
        source: transactionData.source || (transactionData.imageUrl ? 'ocr' : 'manual'),
      });

      if (saved) {
        await evaluateBudgetWarnings(saved);
        const savedWithCategory = attachCategory(saved);
        setTransactions(prev => upsertTransactionById(prev, savedWithCategory));
        return savedWithCategory;
      }
    } catch (error) {
      console.error('Failed to save transaction to DB:', error);
    }

    // Fallback for offline / test mode / DB failure
    const localTransaction: Transaction = {
      id: `local-${Date.now()}`,
      userId: currentUserId || transactionData.userId || 'user-1',
      name: transactionData.name,
      amount: transactionData.amount,
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      category: transactionData.category,
      date: transactionData.date,
      note: transactionData.note,
      imageUrl: transactionData.imageUrl,
      source: transactionData.source || 'manual',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedWithCategory = attachCategory(localTransaction);
    setTransactions(prev => upsertTransactionById(prev, savedWithCategory));
    return savedWithCategory;
  }, [currentUserId, attachCategory, evaluateBudgetWarnings]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> => {
    const existingTransaction = transactions.find(txn => txn.id === id);

    try {
      // Try to update in Supabase first
      const saved = await transactionRepository.update(id, updates);

      if (saved) {
        await evaluateBudgetWarnings(existingTransaction, saved);
        const savedWithCategory = attachCategory(saved);
        setTransactions(prev => upsertTransactionById(prev, {
          ...savedWithCategory,
          updatedAt: new Date(),
        }));
        return savedWithCategory;
      }
    } catch (error) {
      console.error('Failed to update transaction in DB:', error);
    }

    return null;
  }, [attachCategory, evaluateBudgetWarnings, transactions]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    const existingTransaction = transactions.find(txn => txn.id === id);
    const deleted = await transactionRepository.delete(id);
    if (!deleted) {
      throw new Error('Không thể xóa giao dịch khỏi cơ sở dữ liệu.');
    }

    await evaluateBudgetWarnings(existingTransaction);
    setTransactions(prev => dedupeTransactionsById(prev.filter(txn => txn.id !== id)));
  }, [evaluateBudgetWarnings, transactions]);

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
