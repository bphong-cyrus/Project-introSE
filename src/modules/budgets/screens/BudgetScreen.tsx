// SmartSpend AI - Budget Screen
// UC10: Set Monthly Budget, UC11: Budget Warning, UC06: Manage Categories
// PRIORITY: Original Budget UI requirement with radial gauge
// Features: Expense categories (with budget limits) and Income categories

import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Category, CategoryBudget } from '../../../shared/types';
import { useTransactions } from '../../../state/TransactionContext';
import { useCategories } from '../../../state/CategoryContext';
import RadialGauge from '../components/RadialGauge';
import BudgetSummaryCard from '../components/BudgetSummaryCard';
import BudgetCategoryCard from '../components/BudgetCategoryCard';
import IncomeCategoryCard from '../components/IncomeCategoryCard';
import BudgetWarningBanner from '../components/BudgetWarningBanner';
import { DeleteCategoryDialog, TransactionHistoryScreen, AddCategorySheet, AddIncomeCategorySheet } from '../../categories';
import CategoryEditScreen from './CategoryEditScreen';
import { useAuth } from '../../../state/AuthContext';
import { supabase } from '../../../data/datasources/supabase/supabase';
import { useMonthlyBudgetIncome } from '../hooks/useMonthlyBudgetIncome';

const VIETNAMESE_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const MONTHS_SHORT = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const INCOME_GREEN = '#2ECC71';
const EXPENSE_RED = '#E74C3C';

const formatCurrency = (amount: number): string => {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} VND`;
};

const parseCurrencyInput = (text: string): number => {
  const digits = text.replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
};

const buildBudgetLimitError = (income: number) => (
  `Tổng hạn mức ngân sách các danh mục không được vượt quá Tổng thu nhập của tháng (${formatCurrency(income)}). Vui lòng điều chỉnh lại!`
);

const BudgetScreen: React.FC = () => {
  // Use global contexts for shared state
  const { user } = useAuth();
  const { transactions, refreshTransactions } = useTransactions();
  const {
    expenseCategories: ctxExpenseCats,
    incomeCategories: ctxIncomeCats,
    addCategory,
    deleteCategory,
    refreshCategories,
  } = useCategories();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddExpenseSheet, setShowAddExpenseSheet] = useState(false);
  const [showAddIncomeSheet, setShowAddIncomeSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCategoryEdit, setShowCategoryEdit] = useState(false);
  const [selectedCategoryBudget, setSelectedCategoryBudget] = useState<CategoryBudget | null>(null);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null);

  // Current selected month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const {
    fixedMonthlyIncome,
    isFixedIncomeOverridden,
    isLoadingIncome,
    variableIncomeTotal,
    totalIncome,
    totalExpense,
    savings,
    incomeCategoryAmounts,
    refreshMonthlyIncome,
    saveFixedMonthlyIncome,
  } = useMonthlyBudgetIncome(selectedMonth, selectedYear);
  const [showFixedIncomeModal, setShowFixedIncomeModal] = useState(false);
  const [fixedIncomeInput, setFixedIncomeInput] = useState('');
  const [isSavingFixedIncome, setIsSavingFixedIncome] = useState(false);

  // Budget limits per expense category
  const [expenseBudgetLimits, setExpenseBudgetLimits] = useState<{ [key: string]: number }>({});

  // Categories state (synced with global context)
  const [expenseCats, setExpenseCats] = useState<Category[]>(ctxExpenseCats);
  const [incomeCats, setIncomeCats] = useState<Category[]>(ctxIncomeCats);

  // Sync local state with context when context changes
  React.useEffect(() => {
    setExpenseCats(ctxExpenseCats);
  }, [ctxExpenseCats]);

  React.useEffect(() => {
    setIncomeCats(ctxIncomeCats);
  }, [ctxIncomeCats]);

  const ensureMonthlyBudget = useCallback(async () => {
    if (!user?.id) return null;

    const month = selectedMonth + 1;

    const { data: ensuredBudgetId, error: ensureError } = await supabase.rpc('refresh_user_budget_spending', {
      target_year: selectedYear,
      target_month: month,
    });

    if (ensureError) throw ensureError;
    if (!ensuredBudgetId) return null;

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('budget_id', ensuredBudgetId)
      .single();

    if (error) throw error;
    return data;
  }, [selectedMonth, selectedYear, user?.id]);

  const evaluateBudgetNotifications = useCallback(async () => {
    const { error } = await supabase.rpc('evaluate_user_budget_notifications');
    if (error) {
      console.warn('Không thể kiểm tra cảnh báo ngân sách:', error.message);
    }
  }, []);

  const syncBudgetAllocationsFromDatabase = useCallback(async () => {
    if (!user?.id || expenseCats.length === 0) return;

    try {
      const budget = await ensureMonthlyBudget();
      if (!budget) return;

      const { data: allocations, error: allocationError } = await supabase
        .from('budget_category_allocations')
        .select('*')
        .eq('budget_id', budget.budget_id);

      if (allocationError) throw allocationError;

      const allocationsByCategory = new Map((allocations ?? []).map((allocation) => [allocation.category_id, allocation]));
      const nextLimits: { [key: string]: number } = {};

      for (const category of expenseCats) {
        const existingAllocation = allocationsByCategory.get(category.id);
        nextLimits[category.id] = existingAllocation
          ? Number(existingAllocation.allocated_amount)
          : 0;
      }

      setExpenseBudgetLimits((prev) => {
        const prevSerialized = JSON.stringify(prev);
        const nextSerialized = JSON.stringify(nextLimits);
        return prevSerialized === nextSerialized ? prev : nextLimits;
      });
    } catch (error) {
      console.warn('Không thể đồng bộ hạn mức ngân sách:', error);
    }
  }, [ensureMonthlyBudget, expenseCats, user?.id]);

  React.useEffect(() => {
    syncBudgetAllocationsFromDatabase();
  }, [syncBudgetAllocationsFromDatabase]);

  const saveCategoryBudgetToDatabase = useCallback(async (categoryId: string, newLimit: number, fallbackTotal?: number) => {
    if (!user?.id) return;

    const nextLimits = { ...expenseBudgetLimits, [categoryId]: newLimit };
    const nextTotal = fallbackTotal ?? expenseCats.reduce((sum, category) => sum + (nextLimits[category.id] ?? 0), 0);
    if (nextTotal > totalIncome) {
      throw new Error(buildBudgetLimitError(totalIncome));
    }

    const budget = await ensureMonthlyBudget();
    if (!budget) return;

    const { error: allocationError } = await supabase
      .from('budget_category_allocations')
      .upsert(
        {
          budget_id: budget.budget_id,
          category_id: categoryId,
          allocated_amount: newLimit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'budget_id,category_id' }
      );

    if (allocationError) throw allocationError;

    const { error: budgetUpdateError } = await supabase
      .from('budgets')
      .update({
        total_budget_amount: nextTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('budget_id', budget.budget_id);

    if (budgetUpdateError) throw budgetUpdateError;
    await evaluateBudgetNotifications();
  }, [ensureMonthlyBudget, evaluateBudgetNotifications, expenseBudgetLimits, expenseCats, totalIncome, user?.id]);

  // Note: transactions from useTransactions() context is used for category calculations

  // Calculate expense category budgets
  const getExpenseCategoryBudgets = useCallback((): CategoryBudget[] => {
    return expenseCats.map((category) => {
      const categoryTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.date);
        return (
          txn.categoryId === category.id &&
          txn.type === 'expense' &&
          txnDate.getMonth() === selectedMonth &&
          txnDate.getFullYear() === selectedYear
        );
      });

      const spent = categoryTransactions.reduce((sum, txn) => sum + txn.amount, 0);
      const budgetLimit = expenseBudgetLimits[category.id] ?? 0;

      return {
        category,
        budgetLimit,
        spent,
      };
    });
  }, [expenseCats, selectedMonth, selectedYear, expenseBudgetLimits, transactions]);

  const expenseBudgets = getExpenseCategoryBudgets();

  // Calculate totals
  const totalBudgetLimit = expenseBudgets.reduce((sum, cb) => sum + cb.budgetLimit, 0);
  const totalSpent = totalExpense;
  const overallPercentage = totalBudgetLimit > 0
    ? Math.round((totalSpent / totalBudgetLimit) * 100)
    : 0;

  // Check if total budget exceeds income
  const isOverBudget = totalBudgetLimit > totalIncome;

  // Handle month change
  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthPicker(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshCategories(),
        refreshTransactions(),
        refreshMonthlyIncome(),
        syncBudgetAllocationsFromDatabase(),
      ]);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
      Alert.alert('Lỗi', 'Không thể tải lại danh mục.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshCategories, refreshMonthlyIncome, refreshTransactions, syncBudgetAllocationsFromDatabase]);

  // Add expense category
  const handleAddExpenseCategory = async (categoryData: { name: string; color: string; icon: string }) => {
    const newCategory = await addCategory({
      name: categoryData.name,
      icon: categoryData.icon,
      color: categoryData.color,
      type: 'expense',
      isDefault: false,
    });

    if (!newCategory) {
      Alert.alert('Không thể tạo danh mục', 'Danh mục chưa được lưu vào cơ sở dữ liệu. Vui lòng thử lại.');
      return;
    }

    setExpenseBudgetLimits(prev => ({ ...prev, [newCategory.id]: 0 }));
    saveCategoryBudgetToDatabase(newCategory.id, 0, totalBudgetLimit).catch((error) => {
      console.warn('Không thể lưu hạn mức danh mục mới:', error);
    });
    setShowAddExpenseSheet(false);
  };

  // Add income category
  const handleAddIncomeCategory = async (categoryData: { name: string; color: string; icon: string }) => {
    const newCategory = await addCategory({
      name: categoryData.name,
      icon: categoryData.icon,
      color: categoryData.color,
      type: 'income',
      isDefault: false,
    });

    if (!newCategory) {
      Alert.alert('Không thể tạo danh mục', 'Danh mục chưa được lưu vào cơ sở dữ liệu. Vui lòng thử lại.');
      return;
    }

    setShowAddIncomeSheet(false);
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  // Confirm delete with transfer to target category
  const confirmDeleteWithTransfer = async (targetCategoryId: string) => {
    if (!categoryToDelete) {
      return;
    }

    if (!targetCategoryId || targetCategoryId === categoryToDelete.id) {
      Alert.alert('Không thể xóa danh mục', 'Vui lòng chọn một danh mục thay thế hợp lệ.');
      return;
    }

    const targetCategory = (categoryToDelete.type === 'expense' ? expenseCats : incomeCats)
      .find((category) => category.id === targetCategoryId);

    if (!targetCategory) {
      Alert.alert('Không thể xóa danh mục', 'Danh mục thay thế không tồn tại hoặc đã bị xóa.');
      return;
    }

    const success = await deleteCategory(categoryToDelete.id, targetCategoryId);

    if (!success) {
      Alert.alert(
        'Không thể xóa danh mục',
        'Chưa thể chuyển giao giao dịch hoặc cập nhật cơ sở dữ liệu. Vui lòng thử lại.'
      );
      return;
    }

    if (categoryToDelete.type === 'expense') {
      setExpenseBudgetLimits(prev => {
        const newLimits = { ...prev };
        delete newLimits[categoryToDelete.id];
        return newLimits;
      });
    }

    await Promise.all([refreshCategories(), refreshTransactions()]);
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  const handleEditCategoryBudget = (categoryBudget: CategoryBudget) => {
    setSelectedCategoryBudget(categoryBudget);
    setShowCategoryEdit(true);
  };

  const handleViewHistory = (category: Category) => {
    setHistoryCategory(category);
    setShowTransactionHistory(true);
  };

  const openFixedIncomeEditor = () => {
    setFixedIncomeInput(String(Math.round(fixedMonthlyIncome || 0)));
    setShowFixedIncomeModal(true);
  };

  const handleFixedIncomeInputChange = (text: string) => {
    setFixedIncomeInput(text.replace(/[^\d]/g, ''));
  };

  const handleSaveFixedMonthlyIncome = async () => {
    const amount = parseCurrencyInput(fixedIncomeInput);
    if (amount < 0) {
      Alert.alert('Thu nhập không hợp lệ', 'Thu nhập cố định tháng phải là số không âm.');
      return;
    }

    setIsSavingFixedIncome(true);
    try {
      await saveFixedMonthlyIncome(amount);
      await refreshMonthlyIncome();
      setShowFixedIncomeModal(false);

      const nextTotalIncome = amount + variableIncomeTotal;
      if (totalBudgetLimit > nextTotalIncome) {
        Alert.alert(
          'Cần kiểm tra lại hạn mức',
          `Tổng hạn mức hiện tại (${formatCurrency(totalBudgetLimit)}) đang vượt Tổng thu nhập mới (${formatCurrency(nextTotalIncome)}). Các lần chỉnh hạn mức tiếp theo sẽ bị chặn cho đến khi bạn điều chỉnh lại.`
        );
      }
    } catch (error) {
      console.warn('Không thể lưu thu nhập cố định tháng:', error);
      Alert.alert(
        'Không thể lưu thu nhập',
        error instanceof Error ? error.message : 'Vui lòng thử lại.'
      );
    } finally {
      setIsSavingFixedIncome(false);
    }
  };

  const handleSaveCategoryBudget = async (categoryId: string, newLimit: number) => {
    const currentLimit = expenseBudgetLimits[categoryId] ?? 0;
    const nextTotalBudget = totalBudgetLimit - currentLimit + newLimit;
    if (nextTotalBudget > totalIncome) {
      Alert.alert('Không thể lưu hạn mức', buildBudgetLimitError(totalIncome));
      return false;
    }

    try {
      await saveCategoryBudgetToDatabase(categoryId, newLimit);
      setExpenseBudgetLimits(prev => ({ ...prev, [categoryId]: newLimit }));
      return true;
    } catch (error) {
      console.warn('Không thể lưu hạn mức danh mục:', error);
      const message = error instanceof Error
        ? error.message
        : 'Không thể lưu hạn mức vào cơ sở dữ liệu.';
      Alert.alert('Lỗi', message);
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: Colors.primary }]}>Ngân sách</Text>

          {/* Month Picker */}
          <TouchableOpacity
            style={styles.monthPicker}
            onPress={() => setShowMonthPicker(true)}
          >
            <Ionicons name="calendar" size={18} color={Colors.primary} />
            <Text style={styles.monthText}>
              {VIETNAMESE_MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Budget Warning Banner (UC11) */}
        <BudgetWarningBanner percentage={overallPercentage} />

        {/* Over Budget Warning */}
        {isOverBudget && (
          <View style={styles.overBudgetWarning}>
            <Ionicons name="warning" size={20} color={Colors.danger} />
            <View style={styles.overBudgetContent}>
              <Text style={styles.overBudgetTitle}>Vượt quá thu nhập!</Text>
              <Text style={styles.overBudgetMessage}>
                Tổng hạn mức ({formatCurrency(totalBudgetLimit)}) vượt quá Tổng thu nhập của tháng ({formatCurrency(totalIncome)}).
              </Text>
            </View>
          </View>
        )}

        {/* Radial Gauge - Main Visual */}
        <View style={styles.gaugeContainer}>
          <RadialGauge
            spent={totalSpent}
            total={totalBudgetLimit}
            size={260}
          />
        </View>

        {/* Budget Summary Card */}
        <BudgetSummaryCard
          totalLimit={totalBudgetLimit}
          totalSpent={totalSpent}
        />

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIcon, { backgroundColor: INCOME_GREEN + '18' }]}>
              <Ionicons name="trending-up" size={20} color={INCOME_GREEN} />
            </View>
            <View style={styles.metricTextBox}>
              <Text style={styles.metricLabel}>Tổng thu nhập</Text>
              <Text style={[styles.metricAmount, { color: INCOME_GREEN }]}>{formatCurrency(totalIncome)}</Text>
            </View>
          </View>
          <Text style={styles.metricNote}>
            Thu nhập cố định tháng + thu nhập phát sinh theo danh mục.
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIcon, { backgroundColor: (savings >= 0 ? INCOME_GREEN : EXPENSE_RED) + '18' }]}>
              <Ionicons name={savings >= 0 ? 'wallet' : 'alert-circle'} size={20} color={savings >= 0 ? INCOME_GREEN : EXPENSE_RED} />
            </View>
            <View style={styles.metricTextBox}>
              <Text style={styles.metricLabel}>Số tiền tiết kiệm</Text>
              <Text style={[styles.metricAmount, { color: savings >= 0 ? INCOME_GREEN : EXPENSE_RED }]}>
                {formatCurrency(savings)}
              </Text>
            </View>
          </View>
          <Text style={styles.metricNote}>
            Công thức: Tổng thu nhập - Tổng chi tiêu của tháng.
          </Text>
        </View>

        {/* ==================== INCOME CATEGORIES SECTION ==================== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thu nhập theo danh mục</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: Colors.income }]}
            onPress={() => setShowAddIncomeSheet(true)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        {/* Income Category List */}
        <View style={styles.categoryList}>
          <View style={styles.fixedIncomeCard}>
            <View style={styles.fixedIncomeMain}>
              <View style={[styles.fixedIncomeIcon, { backgroundColor: INCOME_GREEN + '18' }]}>
                <Ionicons name="wallet-outline" size={24} color={INCOME_GREEN} />
              </View>
              <View style={styles.fixedIncomeContent}>
                <Text style={styles.fixedIncomeTitle}>Thu nhập cố định tháng {selectedMonth + 1}/{selectedYear}</Text>
                <Text style={styles.fixedIncomeSubtitle}>
                  {isFixedIncomeOverridden ? 'Đã chỉnh riêng cho tháng này' : 'Mặc định từ Hồ sơ cá nhân'}
                </Text>
              </View>
            </View>
            <View style={styles.fixedIncomeFooter}>
              {isLoadingIncome ? (
                <ActivityIndicator color={INCOME_GREEN} />
              ) : (
                <Text style={styles.fixedIncomeAmount}>+{formatCurrency(fixedMonthlyIncome)}</Text>
              )}
              <TouchableOpacity style={styles.fixedIncomeEditButton} onPress={openFixedIncomeEditor}>
                <Ionicons name="create-outline" size={15} color="#FFFFFF" />
                <Text style={styles.fixedIncomeEditText}>Sửa</Text>
              </TouchableOpacity>
            </View>
          </View>

          {incomeCategoryAmounts.map((ia) => (
            <IncomeCategoryCard
              key={ia.category.id}
              category={ia.category}
              amount={ia.amount}
              onPress={() => handleViewHistory(ia.category)}
              onDeletePress={() => !ia.category.isDefault && handleDeleteCategory(ia.category)}
            />
          ))}
        </View>

        {/* ==================== EXPENSE CATEGORIES SECTION ==================== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hạn mức chi tiêu</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddExpenseSheet(true)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        {/* Expense Category List */}
        <View style={styles.categoryList}>
          {expenseBudgets.map((cb) => (
            <BudgetCategoryCard
              key={cb.category?.id || cb.categoryId || 'unknown'}
              categoryBudget={cb}
              onPress={() => cb.category && handleViewHistory(cb.category)}
              onEditPress={() => handleEditCategoryBudget(cb)}
              onDeletePress={() => cb.category && !cb.category.isDefault && handleDeleteCategory(cb.category)}
              onHistoryPress={() => cb.category && handleViewHistory(cb.category)}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.monthPickerModal}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Chọn tháng</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.yearSelector}>
              <TouchableOpacity
                onPress={() => setSelectedYear(selectedYear - 1)}
                style={styles.yearButton}
              >
                <Ionicons name="chevron-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <TouchableOpacity
                onPress={() => setSelectedYear(selectedYear + 1)}
                style={styles.yearButton}
              >
                <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthGrid}>
              {MONTHS_SHORT.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthButton,
                    selectedMonth === index && styles.monthButtonActive,
                  ]}
                  onPress={() => handleMonthChange(index, selectedYear)}
                >
                  <Text
                    style={[
                      styles.monthButtonText,
                      selectedMonth === index && styles.monthButtonTextActive,
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Edit Screen */}
      <Modal
        visible={showCategoryEdit}
        animationType="slide"
        onRequestClose={() => setShowCategoryEdit(false)}
      >
        <CategoryEditScreen
          categoryBudget={selectedCategoryBudget ?? undefined}
          totalIncome={totalIncome}
          currentTotalBudget={totalBudgetLimit}
          onClose={() => setShowCategoryEdit(false)}
          onSave={async (newLimit) => {
            let saved = true;
            if (selectedCategoryBudget?.category) {
              saved = await handleSaveCategoryBudget(selectedCategoryBudget.category.id, newLimit);
            }
            if (saved) {
              setShowCategoryEdit(false);
            }
          }}
        />
      </Modal>

      {/* Fixed Monthly Income Modal */}
      <Modal
        visible={showFixedIncomeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFixedIncomeModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.incomeModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.incomeModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFixedIncomeModal(false)}
          />
          <View style={styles.incomeModalCard}>
            <View style={styles.incomeModalHeader}>
              <Text style={styles.incomeModalTitle}>Thu nhập cố định tháng {selectedMonth + 1}/{selectedYear}</Text>
              <TouchableOpacity onPress={() => setShowFixedIncomeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.incomeModalDescription}>
              Giá trị này được lưu riêng cho tháng đang chọn. Nếu chưa chỉnh, hệ thống dùng Thu nhập hàng tháng trong Hồ sơ cá nhân làm mặc định.
            </Text>

            <View style={styles.incomeInputContainer}>
              <TextInput
                style={styles.incomeInput}
                value={fixedIncomeInput ? parseCurrencyInput(fixedIncomeInput).toLocaleString('vi-VN') : ''}
                onChangeText={handleFixedIncomeInputChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.incomeCurrency}>VND</Text>
            </View>

            <View style={styles.incomePreviewCard}>
              <Text style={styles.incomePreviewLabel}>Tổng thu nhập sau khi lưu</Text>
              <Text style={styles.incomePreviewValue}>
                {formatCurrency(parseCurrencyInput(fixedIncomeInput) + variableIncomeTotal)}
              </Text>
              <Text style={styles.incomePreviewNote}>
                Bao gồm thu nhập cố định và {formatCurrency(variableIncomeTotal)} thu nhập phát sinh.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.incomeSaveButton, isSavingFixedIncome && styles.incomeSaveButtonDisabled]}
              onPress={handleSaveFixedMonthlyIncome}
              disabled={isSavingFixedIncome}
            >
              {isSavingFixedIncome ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.incomeSaveButtonText}>Lưu thu nhập cố định</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Expense Category Sheet */}
      <AddCategorySheet
        visible={showAddExpenseSheet}
        onClose={() => setShowAddExpenseSheet(false)}
        onSave={handleAddExpenseCategory}
      />

      {/* Add Income Category Sheet */}
      <AddIncomeCategorySheet
        visible={showAddIncomeSheet}
        onClose={() => setShowAddIncomeSheet(false)}
        onSave={handleAddIncomeCategory}
      />

      {/* Delete Category Dialog with Transfer */}
      <DeleteCategoryDialog
        visible={showDeleteDialog}
        categoryToDelete={categoryToDelete}
        availableCategories={categoryToDelete?.type === 'expense' ? expenseCats : incomeCats}
        onCancel={() => {
          setShowDeleteDialog(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDeleteWithTransfer}
      />

      {/* Transaction History Screen */}
      <Modal
        visible={showTransactionHistory}
        animationType="slide"
        onRequestClose={() => setShowTransactionHistory(false)}
      >
        <TransactionHistoryScreen
          categoryId={historyCategory?.id}
          categoryName={historyCategory?.name}
          categoryColor={historyCategory?.color}
          categoryIcon={historyCategory?.icon}
          categoryType={historyCategory?.type}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={() => setShowTransactionHistory(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  monthText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  overBudgetWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    alignItems: 'flex-start',
    gap: 10,
  },
  overBudgetContent: {
    flex: 1,
  },
  overBudgetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
    marginBottom: 2,
  },
  overBudgetMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  metricCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextBox: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  metricAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricNote: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  fixedIncomeCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D8F5E4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fixedIncomeMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fixedIncomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fixedIncomeContent: {
    flex: 1,
  },
  fixedIncomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  fixedIncomeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fixedIncomeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  fixedIncomeAmount: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: INCOME_GREEN,
  },
  fixedIncomeEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: INCOME_GREEN,
  },
  fixedIncomeEditText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
  incomeModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  incomeModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  incomeModalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  incomeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  incomeModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  incomeModalDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  incomeInput: {
    flex: 1,
    minHeight: 56,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  incomeCurrency: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  incomePreviewCard: {
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  incomePreviewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  incomePreviewValue: {
    fontSize: 14,
    color: INCOME_GREEN,
    fontWeight: '600',
  },
  incomePreviewNote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  incomeSaveButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: INCOME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  incomeSaveButtonDisabled: {
    opacity: 0.65,
  },
  incomeSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Month Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthPickerModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  yearButton: {
    padding: 8,
  },
  yearText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 80,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: Colors.primary,
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default BudgetScreen;
