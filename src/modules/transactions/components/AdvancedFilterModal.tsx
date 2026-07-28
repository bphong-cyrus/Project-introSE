// UC08 - Advanced Filter Modal
// Filter by date range, type, category, amount range

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Category } from '../../../shared/types';
import { formatVNDInput, parseVNDInput } from '../utils';

export interface AdvancedFilter {
  dateFrom?: Date;
  dateTo?: Date;
  type?: 'all' | 'income' | 'expense';
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
}

interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filter: AdvancedFilter) => void;
  categories: Category[];
  initialFilter?: AdvancedFilter;
}

const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  categories,
  initialFilter,
}) => {
  const [dateFrom, setDateFrom] = useState(initialFilter?.dateFrom?.toISOString().split('T')[0] || '');
  const [dateTo, setDateTo] = useState(initialFilter?.dateTo?.toISOString().split('T')[0] || '');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>(
    initialFilter?.type || 'all'
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilter?.categoryIds || []
  );
  const [minAmount, setMinAmount] = useState(initialFilter?.minAmount?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(initialFilter?.maxAmount?.toString() || '');

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleApply = () => {
    const filter: AdvancedFilter = {
      type: selectedType,
      categoryIds: selectedCategories,
      minAmount: minAmount ? parseVNDInput(minAmount) : undefined,
      maxAmount: maxAmount ? parseVNDInput(maxAmount) : undefined,
    };

    if (dateFrom) {
      filter.dateFrom = new Date(dateFrom);
      filter.dateFrom.setHours(0, 0, 0, 0);
    }
    if (dateTo) {
      filter.dateTo = new Date(dateTo);
      filter.dateTo.setHours(23, 59, 59, 999);
    }

    onApply(filter);
    onClose();
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedType('all');
    setSelectedCategories([]);
    setMinAmount('');
    setMaxAmount('');
    onApply({});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Bộ lọc nâng cao</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Date Range */}
            <View style={styles.section}>
              <Text style={styles.label}>Khoảng ngày</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputBox}>
                  <Text style={styles.dateHint}>Từ ngày</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.dateInputBox}>
                  <Text style={styles.dateHint}>Đến ngày</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={dateTo}
                    onChangeText={setDateTo}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Type */}
            <View style={styles.section}>
              <Text style={styles.label}>Loại giao dịch</Text>
              <View style={styles.typeRow}>
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, selectedType === type && styles.typeChipActive]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      selectedType === type && styles.typeChipTextActive,
                    ]}>
                      {type === 'all' ? 'Tất cả' : type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.label}>Danh mục</Text>
              <View style={styles.categoryList}>
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                      onPress={() => toggleCategory(cat.id)}
                    >
                      <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                        <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                      </View>
                      <Text style={[
                        styles.categoryName,
                        isSelected && { color: Colors.primary, fontWeight: '600' },
                      ]}>
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amount Range */}
            <View style={styles.section}>
              <Text style={styles.label}>Khoảng số tiền (VND)</Text>
              <View style={styles.amountRow}>
                <View style={styles.amountInputBox}>
                  <Text style={styles.dateHint}>Tối thiểu</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={formatVNDInput(minAmount)}
                    onChangeText={(text) => setMinAmount(text.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.amountInputBox}>
                  <Text style={styles.dateHint}>Tối đa</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={formatVNDInput(maxAmount)}
                    onChangeText={(text) => setMaxAmount(text.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputBox: {
    flex: 1,
  },
  dateHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInputBox: {
    flex: 1,
  },
  amountInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  applyButton: {
    flex: 2,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AdvancedFilterModal;