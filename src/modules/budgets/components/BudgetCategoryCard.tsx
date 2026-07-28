// SmartSpend AI - Budget Category Card Component
// Features:
// - Mini pie chart showing spending ratio with category-themed colors
// - Category icon from icon property
// - Horizontal progress bar
// - Edit, Delete, and History buttons

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { CategoryBudget } from '../../../shared/types';

interface BudgetCategoryCardProps {
  categoryBudget: CategoryBudget;
  onPress?: () => void;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  onHistoryPress?: () => void;
}

// Helper to darken a hex color
const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

// Helper to lighten a hex color
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min((num >> 16) + amt, 255);
  const G = Math.min(((num >> 8) & 0x00FF) + amt, 255);
  const B = Math.min((num & 0x0000FF) + amt, 255);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

// Default icon mapping by category name
const DEFAULT_ICON_MAP: { [key: string]: string } = {
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

const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({
  categoryBudget,
  onPress,
  onEditPress,
  onDeletePress,
  onHistoryPress,
}) => {
  const category = categoryBudget.category;
  const remaining = categoryBudget.budgetLimit - categoryBudget.spent;
  const percentage = categoryBudget.budgetLimit > 0
    ? Math.round((categoryBudget.spent / categoryBudget.budgetLimit) * 100)
    : 0;

  // Get category color
  const categoryColor = category?.color || '#607D8B';
  const progressColor = darkenColor(categoryColor, 20);
  const backgroundColor = lightenColor(categoryColor, 70);

  // Get category icon - use category.icon first, fallback to default mapping
  const getCategoryIcon = (): string => {
    // First try to use the icon directly from category
    if (category?.icon) {
      return category.icon;
    }
    // Fallback to default mapping by name
    return DEFAULT_ICON_MAP[category?.name || 'Khác'] || 'ellipsis-horizontal';
  };

  const categoryIcon = getCategoryIcon();
  const isDefault = category?.isDefault || false;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Mini pie chart calculations
  const pieSize = 70;
  const pieRadius = 28;
  const circumference = 2 * Math.PI * pieRadius;
  const strokeDashoffset = circumference * (1 - Math.min(percentage / 100, 1));

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Mini Pie Chart with category-themed colors */}
      <View style={styles.pieContainer}>
        <Svg width={pieSize} height={pieSize}>
          <Circle
            cx={pieSize / 2}
            cy={pieSize / 2}
            r={pieRadius}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={8}
          />
          <Circle
            cx={pieSize / 2}
            cy={pieSize / 2}
            r={pieRadius}
            fill="none"
            stroke={progressColor}
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${pieSize / 2} ${pieSize / 2})`}
          />
        </Svg>
        <View style={[styles.pieCenter, { backgroundColor: backgroundColor }]}>
          <Ionicons
            name={categoryIcon as any}
            size={24}
            color={categoryColor}
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.categoryName}>{category?.name || 'Khác'}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Hạn mức:</Text>
          <Text style={styles.value}>{formatCurrency(categoryBudget.budgetLimit)}đ</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Đã chi:</Text>
          <Text style={[styles.value, styles.expenseValue]}>
            {formatCurrency(categoryBudget.spent)}đ
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Còn lại:</Text>
          <Text style={[styles.value, remaining >= 0 ? styles.remainingPositive : styles.remainingNegative]}>
            {formatCurrency(remaining)}đ
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBackground, { backgroundColor: backgroundColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Edit Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={(e) => {
            e?.stopPropagation?.();
            onEditPress?.();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={14} color="#FFFFFF" />
        </TouchableOpacity>

        {/* History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={(e) => {
            e?.stopPropagation?.();
            onHistoryPress?.();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="time" size={14} color="#FFFFFF" />
        </TouchableOpacity>

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
            <Ionicons name="trash" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  pieContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pieCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  expenseValue: {
    color: Colors.expense,
  },
  remainingPositive: {
    color: Colors.success,
  },
  remainingNegative: {
    color: Colors.danger,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BudgetCategoryCard;