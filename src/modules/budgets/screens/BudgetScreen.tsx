// SmartSpend AI - Budget Screen
// UC10: Set Monthly Budget, UC11: Budget Warning, UC06: Manage Categories
// PRIORITY: Original Budget UI requirement with radial gauge
// Features: Expense categories (with budget limits) and Income categories

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
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

const VIETNAMESE_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const MONTHS_SHORT = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

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

  // User's total monthly income/budget
  const [totalIncome, setTotalIncome] = useState(100000000);

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
      .update({
        expected_income_amount: totalIncome,
        expected_income_currency_code: 'VND',
        income_frequency: 'monthly',
        updated_at: new Date().toISOString(),
      })
      .eq('budget_id', ensuredBudgetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [selectedMonth, selectedYear, totalIncome, user?.id]);

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

    const nextTotal = fallbackTotal ?? expenseCats.reduce((sum, category) => sum + (nextLimits[category.id] ?? 0), 0);
    const { error: budgetUpdateError } = await supabase
      .from('budgets')
      .update({
        total_budget_amount: nextTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('budget_id', budget.budget_id);

    if (budgetUpdateError) throw budgetUpdateError;
    await evaluateBudgetNotifications();
  }, [ensureMonthlyBudget, evaluateBudgetNotifications, expenseBudgetLimits, expenseCats, user?.id]);

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

  // Calculate income category amounts
  const getIncomeCategoryAmounts = useCallback((): { category: Category; amount: number }[] => {
    return incomeCats.map((category) => {
      const categoryTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.date);
        return (
          txn.categoryId === category.id &&
          txn.type === 'income' &&
          txnDate.getMonth() === selectedMonth &&
          txnDate.getFullYear() === selectedYear
        );
      });

      const amount = categoryTransactions.reduce((sum, txn) => sum + txn.amount, 0);

      return { category, amount };
    });
  }, [incomeCats, selectedMonth, selectedYear, transactions]);

  const expenseBudgets = getExpenseCategoryBudgets();
  const incomeAmounts = getIncomeCategoryAmounts();

  // Calculate totals
  const totalBudgetLimit = expenseBudgets.reduce((sum, cb) => sum + cb.budgetLimit, 0);
  const totalSpent = expenseBudgets.reduce((sum, cb) => sum + cb.spent, 0);
  const totalIncomeReceived = incomeAmounts.reduce((sum, ia) => sum + ia.amount, 0);
  const overallPercentage = totalBudgetLimit > 0
    ? Math.round((totalSpent / totalBudgetLimit) * 100)
    : 0;

  // Check if total budget exceeds income
  const isOverBudget = totalBudgetLimit > totalIncome;
  const overBudgetAmount = totalBudgetLimit - totalIncome;

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
        syncBudgetAllocationsFromDatabase(),
      ]);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
      Alert.alert('Lỗi', 'Không thể tải lại danh mục.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshCategories, refreshTransactions, syncBudgetAllocationsFromDatabase]);

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

  const handleSaveCategoryBudget = async (categoryId: string, newLimit: number) => {
    setExpenseBudgetLimits(prev => ({ ...prev, [categoryId]: newLimit }));
    try {
      await saveCategoryBudgetToDatabase(categoryId, newLimit);
    } catch (error) {
      console.warn('Không thể lưu hạn mức danh mục:', error);
      Alert.alert('Lỗi', 'Hạn mức đã cập nhật tạm thời nhưng chưa lưu được vào cơ sở dữ liệu.');
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
                Tổng hạn mức ({totalBudgetLimit.toLocaleString('vi-VN')} VND) vượt quá thu nhập tháng ({totalIncome.toLocaleString('vi-VN')} VND)
              </Text>
            </View>
          </View>
        )}

        {/* Radial Gauge - Main Visual */}
        <View style={styles.gaugeContainer}>
          <RadialGauge
            spent={totalSpent}
            total={totalBudgetLimit}
            totalIncome={totalIncome}
            size={260}
          />
        </View>

        {/* Budget Summary Card */}
        <BudgetSummaryCard
          totalLimit={totalBudgetLimit}
          totalSpent={totalSpent}
        />

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
          {incomeAmounts.map((ia) => (
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
            if (selectedCategoryBudget?.category) {
              await handleSaveCategoryBudget(selectedCategoryBudget.category.id, newLimit);
            }
            setShowCategoryEdit(false);
          }}
        />
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
  bottomSpacer: {
    height: 20,
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
