// SmartSpend AI - Transaction History Screen
// UC06: View transaction history per category
// Features:
// - Header with category info
// - Filter by date range
// - Transaction list with icons and amounts
// - Total spending summary

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Transaction } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';
import { useTransactions } from '../../../state/TransactionContext';

interface TransactionHistoryScreenProps {
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  categoryType?: 'income' | 'expense';
  selectedMonth?: number;
  selectedYear?: number;
  onClose?: () => void;
}

const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  categoryId,
  categoryName = 'Khác',
  categoryColor = '#607D8B',
  categoryIcon = 'ellipsis-horizontal',
  categoryType = 'expense',
  selectedMonth,
  selectedYear,
  onClose,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month'>('all');
  const { transactions } = useTransactions();

  // Determine if this is an income category
  const isIncome = categoryType === 'income';
  const totalLabel = isIncome ? 'Tổng thu' : 'Tổng chi';
  const amountColor = isIncome ? Colors.income : Colors.expense;
  const amountPrefix = isIncome ? '+' : '-';
  const ioniconName = toIoniconName(categoryIcon, categoryName);

  // Filter transactions for this category within selected month
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((txn) => {
      const txnDate = new Date(txn.date);
      const matchesCategory = txn.categoryId === categoryId;
      const matchesType = txn.type === categoryType;
      // Filter by selected month and year
      const matchesMonth = selectedMonth !== undefined && selectedYear !== undefined
        ? txnDate.getMonth() === selectedMonth && txnDate.getFullYear() === selectedYear
        : true;
      return matchesCategory && matchesType && matchesMonth;
    });

    // Apply additional date filter (7 days or 30 days from current month)
    if (filterType === 'week') {
      const now = new Date(selectedYear || new Date().getFullYear(), selectedMonth || new Date().getMonth(), 1);
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((txn) => {
        const txnDate = new Date(txn.date);
        return txnDate >= now && txnDate <= weekEnd;
      });
    } else if (filterType === 'month') {
      const monthStart = new Date(selectedYear || new Date().getFullYear(), selectedMonth || new Date().getMonth(), 1);
      const monthEnd = new Date(monthStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((txn) => {
        const txnDate = new Date(txn.date);
        return txnDate >= monthStart && txnDate <= monthEnd;
      });
    }

    // Sort by date descending
    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions, categoryId, categoryType, selectedMonth, selectedYear, filterType]);

  // Calculate total for filtered transactions
  const totalFiltered = filteredTransactions.reduce(
    (sum, txn) => sum + txn.amount,
    0
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getDayLabel = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDate(d.toISOString());
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: categoryColor + '20' },
        ]}
      >
        <Ionicons name={ioniconName as any} size={20} color={categoryColor} />
      </View>

      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {item.name || 'Chi tiêu'}
        </Text>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionDate}>
            {getDayLabel(item.date)}
          </Text>
          <Text style={styles.transactionTime}>{formatTime(item.date)}</Text>
        </View>
      </View>

      <View style={styles.transactionAmount}>
        <Text style={[styles.amountText, { color: amountColor }]}>
          {amountPrefix}{formatCurrency(item.amount)}đ
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: categoryColor + '15' },
        ]}
      >
        <Ionicons name="receipt-outline" size={48} color={categoryColor} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
      <Text style={styles.emptySubtitle}>
        Không có giao dịch nào trong danh mục này
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
      </View>

      {/* Category Info */}
      <View style={styles.categoryCard}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: categoryColor + '20' },
          ]}
        >
          <Ionicons
            name={ioniconName as any}
            size={28}
            color={categoryColor}
          />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{categoryName}</Text>
          <Text style={styles.transactionCount}>
            {filteredTransactions.length} giao dịch
          </Text>
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={[styles.totalAmount, { color: amountColor }]}>
            {amountPrefix}{formatCurrency(totalFiltered)}đ
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'all' && styles.filterTabActive,
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text
            style={[
              styles.filterText,
              filterType === 'all' && styles.filterTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'week' && styles.filterTabActive,
          ]}
          onPress={() => setFilterType('week')}
        >
          <Text
            style={[
              styles.filterText,
              filterType === 'week' && styles.filterTextActive,
            ]}
          >
            7 ngày
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'month' && styles.filterTabActive,
          ]}
          onPress={() => setFilterType('month')}
        >
          <Text
            style={[
              styles.filterText,
              filterType === 'month' && styles.filterTextActive,
            ]}
          >
            30 ngày
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
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
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
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
  transactionCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  transactionTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  transactionAmount: {
    marginLeft: 12,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.expense,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default TransactionHistoryScreen;
