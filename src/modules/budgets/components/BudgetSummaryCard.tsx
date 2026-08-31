// SmartSpend AI - Budget Summary Card Component
// Simplified: Only shows spent amount and progress bar
// Total budget & remaining info is in RadialGauge

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface BudgetSummaryCardProps {
  totalSpent: number;
  totalLimit: number;
}

const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
  totalSpent,
  totalLimit,
}) => {
  const percentage = totalLimit > 0
    ? Math.round((totalSpent / totalLimit) * 100)
    : 0;

  const progressColor = '#E74C3C';

  const formatCurrency = (amount: number): string => {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
  };

  return (
    <View style={styles.container}>
      {/* Label & Amount Row */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>Tổng chi tiêu</Text>
        <Text style={[styles.amount, { color: progressColor }]}>
          {formatCurrency(totalSpent)}
        </Text>
      </View>
      <Text style={styles.noteText}>Tỉ lệ so với tổng ngân sách của tháng</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
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
        <Text style={styles.percentageText}>{percentage}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  noteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
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
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 40,
    textAlign: 'right',
  },
});

export default BudgetSummaryCard;