// SmartSpend AI - Recent Transactions Component
// Displays list of recent transactions
// Based on Figma Frame ID: 42:5

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Transaction } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';

interface RecentTransactionsProps {
  title?: string;
  transactions: Transaction[];
  onSeeAllPress?: () => void;
  onTransactionPress?: (transaction: Transaction) => void;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  title = 'Giao dịch gần đây',
  transactions,
  onSeeAllPress,
  onTransactionPress,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onTransactionPress?.(item)}
      activeOpacity={0.7}
    >
      {/* Left: Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: item.category?.color + '20' },
        ]}
      >
        <Ionicons
          name={toIoniconName(item.category?.icon, item.category?.name) as any}
          size={20}
          color={item.category?.color || Colors.primary}
        />
      </View>

      {/* Middle: Name & Category */}
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.transactionMeta}>
          {item.category?.name}, ngày {formatDate(item.date)}
        </Text>
      </View>

      {/* Right: Amount */}
      <Text
        style={[
          styles.transactionAmount,
          item.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
        ]}
      >
        {item.type === 'income' ? '+' : '-'}
        {formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  );

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

      {/* Transaction List */}
      <View style={styles.listContainer}>
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Chưa có giao dịch nào
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 100, // Space for bottom tab
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
  listContainer: {
    backgroundColor: Colors.textLight,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  incomeAmount: {
    color: Colors.income,
  },
  expenseAmount: {
    color: Colors.expense,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 56,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default RecentTransactions;
