// UC08 - Transaction Card Component
// Used by Transaction History (Frame 7) and Home Dashboard (Frame 6)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Transaction } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';
import { formatVND, formatDateISO, formatTime } from '../utils';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPress }) => {
  const isExpense = transaction.type === 'expense';
  const categoryColor = transaction.category?.color || Colors.primary;
  const categoryIcon = toIoniconName(transaction.category?.icon, transaction.category?.name, 'wallet');
  const categoryName = transaction.category?.name || 'Khác';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Category Icon */}
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
        <Ionicons name={categoryIcon as any} size={20} color={categoryColor} />
      </View>

      {/* Center: Name + Category • Date • Time */}
      <View style={styles.centerContent}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.name}
        </Text>
        <Text style={styles.metadata} numberOfLines={1}>
          {categoryName} • {formatDateISO(transaction.date)} • {formatTime(transaction.date)}
        </Text>
      </View>

      {/* Right: Amount */}
      <Text style={[
        styles.amount,
        { color: isExpense ? '#E74C3C' : '#2ECC71' }
      ]}>
        {isExpense ? '-' : '+'}{formatVND(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  centerContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  metadata: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});

export default TransactionCard;