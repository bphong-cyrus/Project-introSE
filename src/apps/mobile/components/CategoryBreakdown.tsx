// SmartSpend AI - Category Breakdown Component
// Displays spending breakdown by category with progress bars
// Based on Figma Frame ID: 42:5, Grid component

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { CategoryBreakdown as CategoryBreakdownType } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';

interface CategoryBreakdownProps {
  title?: string;
  data: CategoryBreakdownType[];
  onSeeAllPress?: () => void;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  title = 'TỔNG QUAN CHI TIÊU THÁNG 7',
  data,
  onSeeAllPress,
}) => {
  const formatCurrency = (amount: number): string => {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAllPress && (
          <TouchableOpacity onPress={onSeeAllPress} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Xem thêm</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category List */}
      <View style={styles.categoryList}>
        {data.map((item) => (
          <View key={item.categoryId} style={styles.categoryItem}>
            {/* Category Info */}
            <View style={styles.categoryHeader}>
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: item.category.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={toIoniconName(item.category.icon, item.category.name) as any}
                    size={18}
                    color={item.category.color}
                  />
                </View>
                <Text style={styles.categoryName}>{item.category.name}</Text>
              </View>
              <Text style={styles.categoryAmount}>
                {formatCurrency(item.amount)}
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.category.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.percentageText}>{item.percentage}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  categoryList: {
    backgroundColor: Colors.textLight,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 40,
    textAlign: 'right',
  },
});

export default CategoryBreakdown;
