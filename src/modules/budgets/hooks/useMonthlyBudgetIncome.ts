// SmartSpend AI - Monthly income and balance calculations
// Uses user_profiles.initial_income as the default fixed monthly income and
// budgets.expected_income_amount as the per-month manual override.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, Database } from '../../../data/datasources/supabase/supabase';
import { useAuth } from '../../../state/AuthContext';
import { useCategories } from '../../../state/CategoryContext';
import { useTransactions } from '../../../state/TransactionContext';
import { Category, CategoryBreakdown } from '../../../shared/types';

type BudgetRow = Database['public']['Tables']['budgets']['Row'];

const FIXED_INCOME_CATEGORY: Category = {
  id: 'fixed-monthly-income',
  name: 'Thu nhập cố định',
  icon: 'wallet',
  color: '#2ECC71',
  type: 'income',
  isDefault: true,
};

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const getMonthBounds = (monthIndex: number, year: number) => ({
  monthNumber: monthIndex + 1,
  start: new Date(year, monthIndex, 1),
  end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
});

export const isSameMonth = (date: Date, monthIndex: number, year: number) => (
  date.getMonth() === monthIndex && date.getFullYear() === year
);

export function useMonthlyBudgetIncome(selectedMonth: number, selectedYear: number) {
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { incomeCategories } = useCategories();
  const [budget, setBudget] = useState<BudgetRow | null>(null);
  const [isLoadingIncome, setIsLoadingIncome] = useState(false);
  const channelInstanceId = useRef(Math.random().toString(36).slice(2));

  const userId = user?.id;
  const profileDefaultIncome = Math.max(0, toNumber(user?.income));
  const { monthNumber } = getMonthBounds(selectedMonth, selectedYear);

  const refreshMonthlyIncome = useCallback(async () => {
    if (!userId) {
      setBudget(null);
      setIsLoadingIncome(false);
      return;
    }

    setIsLoadingIncome(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('year', selectedYear)
        .eq('month', monthNumber)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setBudget(data ?? null);
    } catch (error) {
      console.warn('Không thể tải thu nhập cố định tháng:', error);
    } finally {
      setIsLoadingIncome(false);
    }
  }, [monthNumber, selectedYear, userId]);

  useEffect(() => {
    refreshMonthlyIncome();
  }, [refreshMonthlyIncome]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`monthly-income-${userId}-${selectedYear}-${monthNumber}-${channelInstanceId.current}`);

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = (payload.new || payload.old) as Partial<BudgetRow>;
        if (row?.year === selectedYear && row?.month === monthNumber) {
          refreshMonthlyIncome();
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userId}` },
      () => {
        refreshMonthlyIncome();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [monthNumber, refreshMonthlyIncome, selectedYear, userId]);

  const saveFixedMonthlyIncome = useCallback(async (amount: number) => {
    if (!userId) {
      throw new Error('Bạn cần đăng nhập để cập nhật thu nhập cố định.');
    }

    const normalizedAmount = Math.max(0, Math.round(amount));
    const { data: ensuredBudgetId, error: ensureError } = await supabase.rpc('ensure_user_monthly_budget', {
      target_year: selectedYear,
      target_month: monthNumber,
    });

    if (ensureError) throw ensureError;
    if (!ensuredBudgetId) {
      throw new Error('Không tìm thấy ngân sách tháng để cập nhật thu nhập.');
    }

    const { data, error } = await supabase
      .from('budgets')
      .update({
        expected_income_amount: normalizedAmount,
        expected_income_currency_code: 'VND',
        income_frequency: 'monthly',
        updated_at: new Date().toISOString(),
      })
      .eq('budget_id', ensuredBudgetId)
      .select()
      .single();

    if (error) throw error;
    setBudget(data);
    return data;
  }, [monthNumber, selectedYear, userId]);

  const monthTransactions = useMemo(() => (
    transactions.filter((transaction) => isSameMonth(new Date(transaction.date), selectedMonth, selectedYear))
  ), [selectedMonth, selectedYear, transactions]);

  const variableIncomeTotal = useMemo(() => (
    monthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  ), [monthTransactions]);

  const totalExpense = useMemo(() => (
    monthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  ), [monthTransactions]);

  const isFixedIncomeOverridden = budget?.expected_income_amount != null;
  const fixedMonthlyIncome = isFixedIncomeOverridden
    ? Math.max(0, toNumber(budget?.expected_income_amount))
    : profileDefaultIncome;
  const totalIncome = fixedMonthlyIncome + variableIncomeTotal;
  const savings = totalIncome - totalExpense;

  const incomeCategoryAmounts = useMemo(() => (
    incomeCategories.map((category) => {
      const amount = monthTransactions
        .filter((transaction) => transaction.type === 'income' && transaction.categoryId === category.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return { category, amount };
    })
  ), [incomeCategories, monthTransactions]);

  const incomeBreakdown = useMemo((): CategoryBreakdown[] => {
    const rows = [
      fixedMonthlyIncome > 0
        ? {
            categoryId: FIXED_INCOME_CATEGORY.id,
            category: FIXED_INCOME_CATEGORY,
            amount: fixedMonthlyIncome,
            transactionCount: 1,
          }
        : null,
      ...incomeCategoryAmounts
        .filter(({ amount }) => amount > 0)
        .map(({ category, amount }) => ({
          categoryId: category.id,
          category,
          amount,
          transactionCount: monthTransactions.filter((transaction) => (
            transaction.type === 'income' && transaction.categoryId === category.id
          )).length,
        })),
    ].filter(Boolean) as Array<Omit<CategoryBreakdown, 'percentage'>>;

    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    return rows
      .map((row) => ({
        ...row,
        percentage: total > 0 ? Math.round((row.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [fixedMonthlyIncome, incomeCategoryAmounts, monthTransactions]);

  return {
    budget,
    fixedMonthlyIncome,
    isFixedIncomeOverridden,
    isLoadingIncome,
    variableIncomeTotal,
    totalIncome,
    totalExpense,
    savings,
    incomeCategoryAmounts,
    incomeBreakdown,
    refreshMonthlyIncome,
    saveFixedMonthlyIncome,
  };
}
