// SmartSpend AI - Transaction Type Selector
// UC07: Segmented Control for selecting Expense/Income type

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface TypeSelectorProps {
  selectedType: 'income' | 'expense';
  onTypeChange: (type: 'income' | 'expense') => void;
}

const TypeSelector: React.FC<TypeSelectorProps> = ({ selectedType, onTypeChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>PHÂN LOẠI GIAO DỊCH</Text>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segment,
            selectedType === 'expense' && styles.segmentActive,
          ]}
          onPress={() => onTypeChange('expense')}
          activeOpacity={0.7}
          testID="type-expense-button"
        >
          <Text
            style={[
              styles.segmentText,
              selectedType === 'expense' && styles.segmentTextActive,
            ]}
          >
            Chi tiêu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segment,
            selectedType === 'income' && styles.segmentActive,
          ]}
          onPress={() => onTypeChange('income')}
          activeOpacity={0.7}
          testID="type-income-button"
        >
          <Text
            style={[
              styles.segmentText,
              selectedType === 'income' && styles.segmentTextActive,
            ]}
          >
            Thu nhập
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default TypeSelector;