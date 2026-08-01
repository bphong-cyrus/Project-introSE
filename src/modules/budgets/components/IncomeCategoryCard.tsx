// SmartSpend AI - Income Category Card Component
// Features:
// - Category icon
// - No pie chart (unlike expense categories)
// - Category name and current amount
// - Click to view transaction history
// - Delete button for non-default categories

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Category } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';

interface IncomeCategoryCardProps {
  category: Category;
  amount: number;
  onPress?: () => void;
  onDeletePress?: () => void;
}

// Default icon mapping by category name
const DEFAULT_ICON_MAP: { [key: string]: string } = {
  'Lương': 'cash',
  'Salary': 'cash',
  'Thưởng': 'gift',
  'Bonus': 'gift',
  'Đầu tư': 'trending-up',
  'Investment': 'trending-up',
  'Freelance': 'briefcase',
  'Quà tặng': 'heart',
  'Gift': 'heart',
  'Khác': 'ellipsis-horizontal',
  'Other': 'ellipsis-horizontal',
};

const IncomeCategoryCard: React.FC<IncomeCategoryCardProps> = ({
  category,
  amount,
  onPress,
  onDeletePress,
}) => {
  const categoryColor = category?.color || '#4CAF50';

  // Get category icon - use category.icon first, fallback to default mapping
  const getCategoryIcon = (): string => {
    if (category?.icon) return toIoniconName(category.icon, category.name);
    return DEFAULT_ICON_MAP[category?.name || 'Khác'] || 'ellipsis-horizontal';
  };

  const categoryIcon = getCategoryIcon();
  const isDefault = category?.isDefault || false;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: categoryColor + '20' },
        ]}
      >
        <Ionicons
          name={categoryIcon as any}
          size={24}
          color={categoryColor}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.categoryName}>{category?.name || 'Khác'}</Text>
        <Text style={styles.amountLabel}>Số tiền hiện có</Text>
      </View>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: Colors.income }]}>
          +{formatCurrency(amount)}đ
        </Text>
      </View>

      {/* Delete Button - only for non-default categories */}
      {!isDefault && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e?.stopPropagation?.();
            onDeletePress?.();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* History Indicator */}
      <View style={styles.historyIndicator}>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  amountContainer: {
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  historyIndicator: {
    width: 24,
    alignItems: 'center',
  },
});

export default IncomeCategoryCard;
