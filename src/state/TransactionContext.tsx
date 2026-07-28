// SmartSpend AI - Transaction Context
// Global state management for transactions across screens
// Used by UC07 (Add Transaction), Budget, Home Dashboard

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Transaction } from '../shared/types';
import { userTransactions } from '../data/datasources/mock/userMockData';

interface TransactionContextValue {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Transaction;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Transaction | null;
  deleteTransaction: (id: string) => void;
  getTransaction: (id: string) => Transaction | undefined;
  getTransactionsByCategory: (categoryId: string, type?: 'income' | 'expense') => Transaction[];
  getTransactionsByMonth: (month: number, year: number) => Transaction[];
  refreshTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(userTransactions);
  const [isLoading, setIsLoading] = useState(false);

  const addTransaction = useCallback((transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: `txn-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    let updatedTxn: Transaction | null = null;
    setTransactions(prev => prev.map(txn => {
      if (txn.id === id) {
        updatedTxn = {
          ...txn,
          ...updates,
          updatedAt: new Date(),
        };
        return updatedTxn;
      }
      return txn;
    }));
    return updatedTxn;
  }, []);

  const deleteTransaction = useCallback((id: string) => {
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

  const refreshTransactions = useCallback(async () => {
    setIsLoading(true);
    // In a real app, this would fetch from an API
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

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
