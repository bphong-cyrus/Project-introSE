// UC08 - Filter Chips Component
// Horizontal scrollable chips for quick filtering

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../../shared/constants/colors';

export type QuickFilter =
  | 'all'
  | 'income'
  | 'expense'
  | 'food'
  | 'transport'
  | 'shopping'
  | 'education'
  | 'other';

interface FilterChipsProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  categoryCounts?: Record<string, number>;
}

const FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'income', label: 'Thu nhập' },
  { key: 'expense', label: 'Chi tiêu' },
  { key: 'food', label: 'Ăn uống' },
  { key: 'transport', label: 'Di chuyển' },
  { key: 'shopping', label: 'Mua sắm' },
  { key: 'education', label: 'Học tập' },
  { key: 'other', label: 'Khác' },
];

const FilterChips: React.FC<FilterChipsProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onFilterChange(filter.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 44,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  container: {
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default FilterChips;