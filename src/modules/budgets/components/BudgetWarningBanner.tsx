// SmartSpend AI - Budget Warning Banner Component
// UC11 - Budget Warning
// Shows when spending exceeds 80% of total budget

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

interface BudgetWarningBannerProps {
  percentage: number;
}

const BudgetWarningBanner: React.FC<BudgetWarningBannerProps> = ({ percentage }) => {
  if (percentage <= 80) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={20} color={Colors.warning} />
      <View style={styles.content}>
        <Text style={styles.title}>Cảnh báo ngân sách!</Text>
        <Text style={styles.message}>
          Bạn đã sử dụng {percentage}% ngân sách tháng này. Hãy cân nhắc chi tiêu hợp lý.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});

export default BudgetWarningBanner;
