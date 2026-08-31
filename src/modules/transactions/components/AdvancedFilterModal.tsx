// UC08 - Advanced Filter Modal
// Filter by date range, type, category, amount range

import React, { useMemo, useState } from 'react';
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
import { toIoniconName } from '../../../shared/utils/icons';
import { formatDateISO, formatVNDInput, parseVNDInput } from '../utils';

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

const DATE_FORMAT_HINT = 'YYYY-MM-DD hoặc DD/MM/YYYY';

interface ParsedDateInput {
  date?: Date;
  normalized?: string;
  error?: string;
}

const buildLocalDate = (year: number, month: number, day: number): ParsedDateInput => {
  const date = new Date(year, month - 1, day);
  const isValid = date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValid) {
    return { error: 'Ngày không tồn tại.' };
  }

  date.setHours(0, 0, 0, 0);
  return {
    date,
    normalized: formatDateISO(date),
  };
};

const parseFlexibleDateInput = (value: string): ParsedDateInput => {
  const trimmed = value.trim();
  if (!trimmed) return {};

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    return buildLocalDate(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10),
      parseInt(isoMatch[3], 10)
    );
  }

  const dayFirstMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dayFirstMatch) {
    return buildLocalDate(
      parseInt(dayFirstMatch[3], 10),
      parseInt(dayFirstMatch[2], 10),
      parseInt(dayFirstMatch[1], 10)
    );
  }

  return { error: `Định dạng ngày không hợp lệ. Dùng ${DATE_FORMAT_HINT}.` };
};

const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  categories,
  initialFilter,
}) => {
  const [dateFrom, setDateFrom] = useState(initialFilter?.dateFrom ? formatDateISO(initialFilter.dateFrom) : '');
  const [dateTo, setDateTo] = useState(initialFilter?.dateTo ? formatDateISO(initialFilter.dateTo) : '');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>(
    initialFilter?.type || 'all'
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilter?.categoryIds || []
  );
  const [minAmount, setMinAmount] = useState(initialFilter?.minAmount?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(initialFilter?.maxAmount?.toString() || '');

  const parsedDateFrom = useMemo(() => parseFlexibleDateInput(dateFrom), [dateFrom]);
  const parsedDateTo = useMemo(() => parseFlexibleDateInput(dateTo), [dateTo]);
  const minAmountValue = useMemo(() => (
    minAmount ? parseVNDInput(minAmount) : undefined
  ), [minAmount]);
  const maxAmountValue = useMemo(() => (
    maxAmount ? parseVNDInput(maxAmount) : undefined
  ), [maxAmount]);
  const dateRangeError = parsedDateFrom.date && parsedDateTo.date && parsedDateTo.date < parsedDateFrom.date
    ? 'Đến ngày phải lớn hơn hoặc bằng Từ ngày.'
    : '';
  const amountRangeError = minAmountValue !== undefined &&
    maxAmountValue !== undefined &&
    maxAmountValue < minAmountValue
    ? 'Số tiền tối đa phải lớn hơn hoặc bằng số tiền tối thiểu.'
    : '';
  const hasValidationError = !!(
    parsedDateFrom.error ||
    parsedDateTo.error ||
    dateRangeError ||
    amountRangeError
  );

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const normalizeDateFrom = () => {
    if (parsedDateFrom.normalized) {
      setDateFrom(parsedDateFrom.normalized);
    }
  };

  const normalizeDateTo = () => {
    if (parsedDateTo.normalized) {
      setDateTo(parsedDateTo.normalized);
    }
  };

  const handleApply = () => {
    if (hasValidationError) return;

    const filter: AdvancedFilter = {
      type: selectedType,
      categoryIds: selectedCategories,
      minAmount: minAmountValue,
      maxAmount: maxAmountValue,
    };

    if (parsedDateFrom.date) {
      filter.dateFrom = new Date(parsedDateFrom.date);
      filter.dateFrom.setHours(0, 0, 0, 0);
    }
    if (parsedDateTo.date) {
      filter.dateTo = new Date(parsedDateTo.date);
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
                    style={[
                      styles.dateInput,
                      parsedDateFrom.error && styles.inputError,
                    ]}
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    onBlur={normalizeDateFrom}
                    placeholder={DATE_FORMAT_HINT}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.dateInputBox}>
                  <Text style={styles.dateHint}>Đến ngày</Text>
                  <TextInput
                    style={[
                      styles.dateInput,
                      (parsedDateTo.error || dateRangeError) && styles.inputError,
                    ]}
                    value={dateTo}
                    onChangeText={setDateTo}
                    onBlur={normalizeDateTo}
                    placeholder={DATE_FORMAT_HINT}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              {parsedDateFrom.error ? (
                <Text style={styles.errorText}>Từ ngày: {parsedDateFrom.error}</Text>
              ) : null}
              {parsedDateTo.error ? (
                <Text style={styles.errorText}>Đến ngày: {parsedDateTo.error}</Text>
              ) : null}
              {dateRangeError ? <Text style={styles.errorText}>{dateRangeError}</Text> : null}
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
                        <Ionicons name={toIoniconName(cat.icon, cat.name) as any} size={14} color={cat.color} />
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
                    style={[
                      styles.amountInput,
                      amountRangeError && styles.inputError,
                    ]}
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
                    style={[
                      styles.amountInput,
                      amountRangeError && styles.inputError,
                    ]}
                    value={formatVNDInput(maxAmount)}
                    onChangeText={(text) => setMaxAmount(text.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              {amountRangeError ? <Text style={styles.errorText}>{amountRangeError}</Text> : null}
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
              style={[
                styles.applyButton,
                hasValidationError && styles.applyButtonDisabled,
              ]}
              onPress={handleApply}
              disabled={hasValidationError}
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
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.danger,
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
  applyButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AdvancedFilterModal;