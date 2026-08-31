// SmartSpend AI - Category Edit Screen
// UC10: Set Monthly Budget for individual categories
// Features:
// - Category info header with emoji and color
// - Budget limit input with currency formatting
// - Current spending display
// - Quick preset buttons (1M, 2M, 3M, 5M)
// - Validation: prevent budget exceeding total monthly income

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { CategoryBudget } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';

interface CategoryEditScreenProps {
  categoryBudget?: CategoryBudget;
  totalIncome?: number;
  currentTotalBudget?: number;
  onClose?: () => void;
  onSave?: (newLimit: number) => void;
}

const PRESET_AMOUNTS = [
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '2M', value: 2000000 },
  { label: '3M', value: 3000000 },
];

const CategoryEditScreen: React.FC<CategoryEditScreenProps> = ({
  categoryBudget,
  totalIncome = 5000000,
  currentTotalBudget = 0,
  onClose,
  onSave,
}) => {
  const category = categoryBudget?.category;

  const [budgetLimit, setBudgetLimit] = useState(
    categoryBudget?.budgetLimit !== undefined ? categoryBudget.budgetLimit.toString() : ''
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (categoryBudget?.budgetLimit !== undefined) {
      setBudgetLimit(categoryBudget.budgetLimit.toString());
    }
  }, [categoryBudget]);

  // Map category names to Ionicons names (fallback)
  const getCategoryIcon = (icon?: string, name?: string): string => {
    // First try to use icon directly from category
    if (icon) return toIoniconName(icon, name);

    // Fallback to default mapping by name
    const iconMap: { [key: string]: string } = {
      'Ăn uống': 'restaurant',
      'Food & Drinks': 'restaurant',
      'Di chuyển': 'car',
      'Transportation': 'car',
      'Mua sắm': 'cart',
      'Shopping': 'cart',
      'Học tập': 'book',
      'Education': 'book',
      'Giải trí': 'game-controller',
      'Entertainment': 'game-controller',
      'Sức khỏe': 'medical',
      'Health': 'medical',
      'Nhà cửa': 'home',
      'Home': 'home',
      'Khác': 'ellipsis-horizontal',
      'Other': 'ellipsis-horizontal',
    };
    return iconMap[name || 'Khác'] || 'ellipsis-horizontal';
  };

  const formatCurrency = (amount: number): string => {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
  };

  const parseBudgetInput = (text: string): number => {
    const digits = text.replace(/[^\d]/g, '');
    return parseInt(digits, 10) || 0;
  };

  const handleBudgetChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    setBudgetLimit(digits);
    setError('');
  };

  const handlePresetPress = (amount: number) => {
    setBudgetLimit(amount.toString());
    setError('');
  };

  const handleSave = () => {
    const amount = parseBudgetInput(budgetLimit);

    if (amount < 0) {
      setError('Hạn mức ngân sách không được âm');
      return;
    }

    if (amount > 100000000) {
      setError('Hạn mức tối đa là 100.000.000 VND');
      return;
    }

    // Validate: total budget should not exceed monthly income
    const newTotalBudget = currentTotalBudget - (categoryBudget?.budgetLimit || 0) + amount;
    if (newTotalBudget > totalIncome) {
      const message = `Tổng hạn mức ngân sách các danh mục không được vượt quá Tổng thu nhập của tháng (${formatCurrency(totalIncome)}). Vui lòng điều chỉnh lại!`;
      setError(message);
      Alert.alert('Không thể lưu hạn mức', message);
      return;
    }

    onSave?.(amount);
  };

  const remaining = categoryBudget
    ? categoryBudget.budgetLimit - categoryBudget.spent
    : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa hạn mức</Text>
        </View>

        {/* Category Info Card */}
        <View style={styles.categoryCard}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: (category?.color || '#607D8B') + '20' },
            ]}
          >
            <Ionicons
              name={getCategoryIcon(category?.icon, category?.name) as any}
              size={28}
              color={category?.color || Colors.primary}
            />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{category?.name || 'Khác'}</Text>
            <Text style={styles.categorySubtitle}>
              Đã chi: {formatCurrency(categoryBudget?.spent || 0)}
            </Text>
          </View>
        </View>

        {/* Income Info */}
        <View style={styles.incomeInfo}>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <Text style={styles.incomeLabel}>Thu nhập tháng</Text>
              <Text style={styles.incomeValue}>{formatCurrency(totalIncome)}</Text>
            </View>
            <View style={styles.incomeDivider} />
            <View style={styles.incomeItem}>
              <Text style={styles.incomeLabel}>Tổng hạn mức hiện tại</Text>
              <Text style={styles.incomeValue}>{formatCurrency(currentTotalBudget - (categoryBudget?.budgetLimit || 0))}</Text>
            </View>
          </View>
        </View>

        {/* Budget Limit Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hạn mức tháng này</Text>

          {/* Budget Input */}
          <View style={[styles.inputContainer, error && styles.inputErrorBorder]}>
            <TextInput
              style={styles.input}
              value={budgetLimit ? parseBudgetInput(budgetLimit).toLocaleString('vi-VN') : ''}
              onChangeText={handleBudgetChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.currencySuffix}>VND</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Preset Buttons */}
          <View style={styles.presetContainer}>
            {PRESET_AMOUNTS.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={styles.presetButton}
                onPress={() => handlePresetPress(preset.value)}
              >
                <Text style={styles.presetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Remaining budget after adding this */}
          <View style={styles.totalPreview}>
            <Text style={styles.totalPreviewLabel}>Tổng hạn mức sau khi lưu:</Text>
            <Text style={[
              styles.totalPreviewValue,
              (currentTotalBudget - (categoryBudget?.budgetLimit || 0) + parseBudgetInput(budgetLimit)) > totalIncome && styles.totalPreviewDanger
            ]}>
              {formatCurrency(currentTotalBudget - (categoryBudget?.budgetLimit || 0) + parseBudgetInput(budgetLimit))}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hạn mức mới</Text>
            <Text style={styles.infoValue}>
              {budgetLimit ? formatCurrency(parseBudgetInput(budgetLimit)) : '0 VND'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Đã chi</Text>
            <Text style={[styles.infoValue, styles.expenseText]}>
              {formatCurrency(categoryBudget?.spent || 0)}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.remainingRow]}>
            <Text style={styles.infoLabel}>Còn lại</Text>
            <Text
              style={[
                styles.infoValue,
                styles.remainingText,
                { color: remaining >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.tipText}>
            Đặt hạn mức hợp lý giúp bạn kiểm soát chi tiêu tốt hơn mỗi tháng.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !budgetLimit && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!budgetLimit}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Lưu hạn mức</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  incomeInfo: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeItem: {
    flex: 1,
    alignItems: 'center',
  },
  incomeDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.divider,
  },
  incomeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputErrorBorder: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingVertical: 16,
  },
  currencySuffix: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 8,
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  presetButton: {
    flex: 1,
    backgroundColor: Colors.primary + '15',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  totalPreviewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalPreviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalPreviewDanger: {
    color: Colors.danger,
  },
  infoSection: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  remainingRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  expenseText: {
    color: Colors.expense,
  },
  remainingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.backgroundSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CategoryEditScreen;