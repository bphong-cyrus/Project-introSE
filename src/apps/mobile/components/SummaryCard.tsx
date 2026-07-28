// SmartSpend AI - Summary Card Component
// Displays: Total Income, Total Expense, Available Balance
// Based on Figma Frame ID: 42:5

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface SummaryCardProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  totalIncome,
  totalExpense,
  balance,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  return (
    <View style={styles.container}>
      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
      </View>

      {/* Income & Expense Row */}
      <View style={styles.statsRow}>
        {/* Income */}
        <View style={styles.statItem}>
          <View style={[styles.iconCircle, styles.incomeCircle]}>
            <Text style={styles.iconText}>↑</Text>
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statLabel}>Tổng thu nhập</Text>
            <Text style={[styles.statAmount, styles.incomeAmount]}>
              +{formatCurrency(totalIncome)}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Expense */}
        <View style={styles.statItem}>
          <View style={[styles.iconCircle, styles.expenseCircle]}>
            <Text style={styles.iconText}>↓</Text>
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statLabel}>Tổng chi tiêu</Text>
            <Text style={[styles.statAmount, styles.expenseAmount]}>
              -{formatCurrency(totalExpense)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.textLight,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  incomeCircle: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  expenseCircle: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  incomeAmount: {
    color: Colors.income,
  },
  expenseAmount: {
    color: Colors.expense,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.divider,
    marginHorizontal: 10,
  },
});

export default SummaryCard;
