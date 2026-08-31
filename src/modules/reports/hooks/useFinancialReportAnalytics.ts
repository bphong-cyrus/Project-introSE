import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, Database } from '../../../data/datasources/supabase/supabase';
import { useAuth } from '../../../state/AuthContext';
import { useCategories } from '../../../state/CategoryContext';
import { useTransactions } from '../../../state/TransactionContext';
import { Category, CategoryBreakdown, Transaction } from '../../../shared/types';
import { isSameMonth } from '../../budgets/hooks/useMonthlyBudgetIncome';

type BudgetRow = Database['public']['Tables']['budgets']['Row'];
type AllocationRow = Database['public']['Tables']['budget_category_allocations']['Row'];

export type ReportRangeMonths = 3 | 6;

export type ChartPoint = {
  label: string;
  value: number;
  color?: string;
  count?: number;
};

export type MonthlyComparisonPoint = {
  key: string;
  label: string;
  month: number;
  year: number;
  fixedIncome: number;
  variableIncome: number;
  income: number;
  expense: number;
  budget: number;
  savings: number;
  transactionCount: number;
};

export type BudgetComplianceRow = {
  category: Category;
  allocated: number;
  spent: number;
  remaining: number;
  usageRate: number;
  status: 'safe' | 'warning' | 'over' | 'unset';
};

export type TopSpendingDay = {
  dateKey: string;
  label: string;
  amount: number;
  transactionCount: number;
};

const WEEK_COLORS = ['#167B63', '#2A9D8F', '#F39C12', '#E74C3C', '#3498DB'];

const FALLBACK_CATEGORY: Category = {
  id: 'uncategorized',
  name: 'Không phân loại',
  icon: 'ellipsis-horizontal',
  color: '#607D8B',
  type: 'expense',
  isDefault: true,
};

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toMonthKey = (monthIndex: number, year: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const toDbMonthKey = (month: number, year: number) => `${year}-${String(month).padStart(2, '0')}`;

const getTransactionDate = (transaction: Transaction) => {
  const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getWeekIndex = (date: Date) => {
  const day = date.getDate();
  return Math.min(4, Math.max(0, Math.ceil(day / 7) - 1));
};

const buildRangeMonths = (selectedMonth: number, selectedYear: number, rangeMonths: ReportRangeMonths) => (
  Array.from({ length: rangeMonths }, (_, index) => {
    const date = new Date(selectedYear, selectedMonth - (rangeMonths - 1 - index), 1);
    return {
      month: date.getMonth(),
      year: date.getFullYear(),
      key: toMonthKey(date.getMonth(), date.getFullYear()),
      dbKey: toDbMonthKey(date.getMonth() + 1, date.getFullYear()),
      label: `T${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`,
    };
  })
);

const getCategoryById = (categories: Category[], categoryId: string | undefined, fallbackType: 'income' | 'expense') => {
  const found = categories.find((category) => category.id === categoryId);
  if (found) return found;
  return {
    ...FALLBACK_CATEGORY,
    id: categoryId || FALLBACK_CATEGORY.id,
    type: fallbackType,
  };
};

const formatDayLabel = (date: Date) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
}).format(date);

export function useFinancialReportAnalytics(
  selectedMonth: number,
  selectedYear: number,
  rangeMonths: ReportRangeMonths,
) {
  const { user } = useAuth();
  const { transactions, refreshTransactions } = useTransactions();
  const { expenseCategories, incomeCategories, allCategories, refreshCategories } = useCategories();
  const [rangeBudgets, setRangeBudgets] = useState<BudgetRow[]>([]);
  const [budgetAllocations, setBudgetAllocations] = useState<AllocationRow[]>([]);
  const [currentBudgetId, setCurrentBudgetId] = useState<string | null>(null);
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);
  const channelInstanceId = useRef(Math.random().toString(36).slice(2));

  const userId = user?.id;
  const profileDefaultIncome = Math.max(0, toNumber(user?.income));
  const monthNumber = selectedMonth + 1;
  const selectedMonthKey = toMonthKey(selectedMonth, selectedYear);

  const rangeMonthItems = useMemo(
    () => buildRangeMonths(selectedMonth, selectedYear, rangeMonths),
    [rangeMonths, selectedMonth, selectedYear],
  );

  const rangeDbKeys = useMemo(() => new Set(rangeMonthItems.map((item) => item.dbKey)), [rangeMonthItems]);

  const refreshBudgetData = useCallback(async () => {
    if (!userId) {
      setRangeBudgets([]);
      setBudgetAllocations([]);
      setCurrentBudgetId(null);
      setIsBudgetLoading(false);
      return;
    }

    setIsBudgetLoading(true);
    try {
      const years = rangeMonthItems.map((item) => item.year);
      const minYear = Math.min(...years, selectedYear);
      const maxYear = Math.max(...years, selectedYear);

      const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .gte('year', minYear)
        .lte('year', maxYear);

      if (error) throw error;

      const filteredBudgets = (budgets || []).filter((budget) => (
        rangeDbKeys.has(toDbMonthKey(budget.month, budget.year)) ||
        (budget.year === selectedYear && budget.month === monthNumber)
      ));
      setRangeBudgets(filteredBudgets);

      const currentBudget = filteredBudgets.find((budget) => (
        budget.year === selectedYear && budget.month === monthNumber
      ));
      setCurrentBudgetId(currentBudget?.budget_id ?? null);

      if (!currentBudget?.budget_id) {
        setBudgetAllocations([]);
        return;
      }

      const { data: allocations, error: allocationError } = await supabase
        .from('budget_category_allocations')
        .select('*')
        .eq('budget_id', currentBudget.budget_id);

      if (allocationError) throw allocationError;
      setBudgetAllocations(allocations || []);
    } catch (error) {
      console.warn('Không thể tải dữ liệu ngân sách báo cáo:', error);
      setBudgetAllocations([]);
    } finally {
      setIsBudgetLoading(false);
    }
  }, [monthNumber, rangeDbKeys, rangeMonthItems, selectedYear, userId]);

  useEffect(() => {
    refreshBudgetData();
  }, [refreshBudgetData]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`financial-report-budgets-${userId}-${channelInstanceId.current}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
      () => {
        refreshBudgetData();
      },
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBudgetData, userId]);

  useEffect(() => {
    if (!currentBudgetId) return;

    const channel = supabase.channel(`financial-report-allocations-${currentBudgetId}-${channelInstanceId.current}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budget_category_allocations', filter: `budget_id=eq.${currentBudgetId}` },
      () => {
        refreshBudgetData();
      },
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBudgetId, refreshBudgetData]);

  const currentMonthTransactions = useMemo(() => (
    transactions.filter((transaction) => isSameMonth(getTransactionDate(transaction), selectedMonth, selectedYear))
  ), [selectedMonth, selectedYear, transactions]);

  const expenseTransactions = useMemo(() => (
    currentMonthTransactions.filter((transaction) => transaction.type === 'expense')
  ), [currentMonthTransactions]);

  const currentBudget = useMemo(() => (
    rangeBudgets.find((budget) => budget.year === selectedYear && budget.month === monthNumber) || null
  ), [monthNumber, rangeBudgets, selectedYear]);

  const monthlyIncome = useMemo(() => {
    const fixedMonthlyIncome = currentBudget?.expected_income_amount != null
      ? Math.max(0, toNumber(currentBudget.expected_income_amount))
      : profileDefaultIncome;
    const variableIncomeTotal = currentMonthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalIncome = fixedMonthlyIncome + variableIncomeTotal;

    return {
      budget: currentBudget,
      fixedMonthlyIncome,
      isFixedIncomeOverridden: currentBudget?.expected_income_amount != null,
      variableIncomeTotal,
      totalIncome,
      totalExpense,
      savings: totalIncome - totalExpense,
    };
  }, [currentBudget, currentMonthTransactions, expenseTransactions, profileDefaultIncome]);

  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    const categoryTotals = new Map<string, { amount: number; count: number }>();
    expenseTransactions.forEach((transaction) => {
      const existing = categoryTotals.get(transaction.categoryId) || { amount: 0, count: 0 };
      categoryTotals.set(transaction.categoryId, {
        amount: existing.amount + transaction.amount,
        count: existing.count + 1,
      });
    });

    const total = [...categoryTotals.values()].reduce((sum, item) => sum + item.amount, 0);
    return [...categoryTotals.entries()]
      .map(([categoryId, item]) => {
        const category = getCategoryById(expenseCategories, categoryId, 'expense');
        return {
          categoryId,
          category,
          amount: item.amount,
          percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
          transactionCount: item.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [expenseCategories, expenseTransactions]);

  const weeklyExpenseData = useMemo((): ChartPoint[] => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      label: `Tuần ${index + 1}`,
      value: 0,
      count: 0,
      color: WEEK_COLORS[index],
    }));

    expenseTransactions.forEach((transaction) => {
      const index = getWeekIndex(getTransactionDate(transaction));
      rows[index].value += transaction.amount;
      rows[index].count = (rows[index].count || 0) + 1;
    });

    return rows;
  }, [expenseTransactions]);

  const weeklyTransactionCountData = useMemo((): ChartPoint[] => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      label: `Tuần ${index + 1}`,
      value: 0,
      color: WEEK_COLORS[index],
    }));

    currentMonthTransactions.forEach((transaction) => {
      const index = getWeekIndex(getTransactionDate(transaction));
      rows[index].value += 1;
    });

    return rows;
  }, [currentMonthTransactions]);

  const getWeeklyCategoryExpenseData = useCallback((categoryId: string): ChartPoint[] => {
    const category = expenseCategories.find((item) => item.id === categoryId);
    const rows = Array.from({ length: 5 }, (_, index) => ({
      label: `Tuần ${index + 1}`,
      value: 0,
      count: 0,
      color: category?.color || WEEK_COLORS[index],
    }));

    expenseTransactions
      .filter((transaction) => transaction.categoryId === categoryId)
      .forEach((transaction) => {
        const index = getWeekIndex(getTransactionDate(transaction));
        rows[index].value += transaction.amount;
        rows[index].count = (rows[index].count || 0) + 1;
      });

    return rows;
  }, [expenseCategories, expenseTransactions]);

  const monthlyComparison = useMemo((): MonthlyComparisonPoint[] => {
    const budgetByKey = new Map(rangeBudgets.map((budget) => [toDbMonthKey(budget.month, budget.year), budget]));

    return rangeMonthItems.map((item) => {
      const monthTransactions = transactions.filter((transaction) => (
        isSameMonth(getTransactionDate(transaction), item.month, item.year)
      ));
      const budget = budgetByKey.get(item.dbKey);
      const fixedIncome = budget?.expected_income_amount != null
        ? Math.max(0, toNumber(budget.expected_income_amount))
        : profileDefaultIncome;
      const variableIncome = monthTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const expense = monthTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const income = fixedIncome + variableIncome;

      return {
        key: item.key,
        label: item.label,
        month: item.month,
        year: item.year,
        fixedIncome,
        variableIncome,
        income,
        expense,
        budget: Math.max(0, toNumber(budget?.total_budget_amount)),
        savings: income - expense,
        transactionCount: monthTransactions.length,
      };
    });
  }, [profileDefaultIncome, rangeBudgets, rangeMonthItems, transactions]);

  const budgetCompliance = useMemo((): BudgetComplianceRow[] => {
    const monthlySpendByCategory = new Map<string, number>();
    expenseTransactions.forEach((transaction) => {
      monthlySpendByCategory.set(
        transaction.categoryId,
        (monthlySpendByCategory.get(transaction.categoryId) || 0) + transaction.amount,
      );
    });

    const rows = budgetAllocations.map((allocation) => {
      const category = getCategoryById(expenseCategories, allocation.category_id, 'expense');
      const allocated = Math.max(0, toNumber(allocation.allocated_amount));
      const spent = monthlySpendByCategory.get(allocation.category_id) || Math.max(0, toNumber(allocation.spent_amount));
      const usageRate = allocated > 0 ? (spent / allocated) * 100 : 0;
      return {
        category,
        allocated,
        spent,
        remaining: allocated - spent,
        usageRate,
        status: allocated <= 0 ? 'unset' : spent > allocated ? 'over' : usageRate >= 80 ? 'warning' : 'safe',
      } as BudgetComplianceRow;
    });

    const allocatedCategoryIds = new Set(rows.map((row) => row.category.id));
    categoryBreakdown.forEach((breakdown) => {
      if (allocatedCategoryIds.has(breakdown.categoryId)) return;
      rows.push({
        category: breakdown.category,
        allocated: 0,
        spent: breakdown.amount,
        remaining: -breakdown.amount,
        usageRate: 0,
        status: 'unset',
      });
    });

    return rows.sort((a, b) => b.spent - a.spent);
  }, [budgetAllocations, categoryBreakdown, expenseCategories, expenseTransactions]);

  const totalAllocatedBudget = useMemo(() => (
    budgetCompliance.reduce((sum, row) => sum + row.allocated, 0)
  ), [budgetCompliance]);

  const totalBudget = Math.max(0, toNumber(currentBudget?.total_budget_amount)) || totalAllocatedBudget;
  const budgetUsageRate = totalBudget > 0 ? (monthlyIncome.totalExpense / totalBudget) * 100 : 0;

  const topSpendingDays = useMemo((): TopSpendingDay[] => {
    const dayMap = new Map<string, TopSpendingDay>();
    expenseTransactions.forEach((transaction) => {
      const date = getTransactionDate(transaction);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const existing = dayMap.get(dateKey) || {
        dateKey,
        label: formatDayLabel(date),
        amount: 0,
        transactionCount: 0,
      };
      dayMap.set(dateKey, {
        ...existing,
        amount: existing.amount + transaction.amount,
        transactionCount: existing.transactionCount + 1,
      });
    });

    return [...dayMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [expenseTransactions]);

  const savingsRate = monthlyIncome.totalIncome > 0
    ? (monthlyIncome.savings / monthlyIncome.totalIncome) * 100
    : 0;

  const previousMonthComparison = monthlyComparison.length >= 2
    ? monthlyComparison[monthlyComparison.length - 2]
    : null;
  const selectedMonthComparison = monthlyComparison.find((item) => item.key === selectedMonthKey) ||
    monthlyComparison[monthlyComparison.length - 1] ||
    null;
  const monthlyExpenseVelocity = previousMonthComparison && previousMonthComparison.expense > 0 && selectedMonthComparison
    ? ((selectedMonthComparison.expense - previousMonthComparison.expense) / previousMonthComparison.expense) * 100
    : 0;

  const allReportCategories = useMemo(() => ({
    expense: expenseCategories,
    income: incomeCategories,
    all: allCategories,
  }), [allCategories, expenseCategories, incomeCategories]);

  return {
    user,
    selectedMonth,
    selectedYear,
    rangeMonths,
    rangeMonthItems,
    categories: allReportCategories,
    monthlyIncome,
    currentBudget,
    isBudgetLoading,
    totalBudget,
    totalAllocatedBudget,
    budgetUsageRate,
    currentMonthTransactions,
    expenseTransactions,
    categoryBreakdown,
    weeklyExpenseData,
    weeklyTransactionCountData,
    monthlyComparison,
    budgetCompliance,
    topSpendingDays,
    savingsRate,
    monthlyExpenseVelocity,
    getWeeklyCategoryExpenseData,
    refreshTransactions,
    refreshCategories,
    refreshBudgetData,
  };
}
