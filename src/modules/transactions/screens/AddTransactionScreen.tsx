// SmartSpend AI - Add Transaction Screen (Frame 8)
// UC07: Add Manual Transaction

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';
import { Category } from '../../../shared/types';
import { useTransactions } from '../../../state/TransactionContext';
import { useAuth } from '../../../state/AuthContext';
import { MAX_TRANSACTION_AMOUNT } from '../utils';
import { useCategories } from '../../../state/CategoryContext';
import TypeSelector from '../components/TypeSelector';
import TransactionNameInput from '../components/TransactionNameInput';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import DateTimeInput, { DateTimeValidationState } from '../components/DateTimeInput';
import NoteInput from '../components/NoteInput';
import AIScanButton from '../components/AIScanButton';
import SaveButton from '../components/SaveButton';

interface AddTransactionScreenProps {
  onClose?: () => void;
  onSaved?: () => void;
  onScanReceipt?: () => void;
  initialType?: 'income' | 'expense';
}

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  onClose,
  onSaved,
  onScanReceipt,
  initialType = 'expense',
}) => {
  const { addTransaction } = useTransactions();
  const { getCategoriesByType } = useCategories();
  const { user } = useAuth();

  // Form state
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(initialType);
  const [transactionName, setTransactionName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [dateTimeValidation, setDateTimeValidation] = useState<DateTimeValidationState>({
    isDateValid: true,
    isTimeValid: true,
  });
  const [note, setNote] = useState<string>('');
  const [transactionNameError, setTransactionNameError] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string>('');

  // Success state - shows inline success message instead of Alert
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // Available categories based on type
  const availableCategories = getCategoriesByType(transactionType);

  // Set default category when categories load or type changes
  React.useEffect(() => {
    const categories = getCategoriesByType(transactionType);
    if (categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [transactionType]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle save - main save logic
  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;

    // Reset error
    setTransactionNameError('');
    setAmountError('');
    setCategoryError('');

    // Parse amount - remove non-digits
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    const trimmedTransactionName = transactionName.trim();

    // Validation: Transaction name must be filled
    if (!trimmedTransactionName) {
      setTransactionNameError('Tên giao dịch là bắt buộc');
      return;
    }

    // Validation: Amount must be > 0
    if (!amount || amount.trim() === '' || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Số tiền là bắt buộc và phải lớn hơn 0');
      return;
    }

    if (numericAmount > MAX_TRANSACTION_AMOUNT) {
      setAmountError('Số tiền giao dịch không được vượt quá 2 tỷ đồng');
      return;
    }

    // Validation: Category must be selected
    let targetCategory = selectedCategory;
    if (!targetCategory || targetCategory.type !== transactionType) {
      const categories = getCategoriesByType(transactionType);
      if (categories.length > 0) {
        targetCategory = categories[0];
        setSelectedCategory(targetCategory);
      }
    }

    if (!targetCategory) {
      setCategoryError('Vui lòng chọn danh mục');
      return;
    }

    const validCategory = targetCategory;

    if (!dateTimeValidation.isDateValid || !dateTimeValidation.isTimeValid) {
      Alert.alert(
        'Ngày/giờ chưa hợp lệ',
        dateTimeValidation.dateError ||
          dateTimeValidation.timeError ||
          'Vui lòng kiểm tra ngày và giờ giao dịch.'
      );
      return;
    }

    try {
      isSavingRef.current = true;
      setIsSaving(true);

      await addTransaction({
        userId: user?.id || 'user-1',
        name: trimmedTransactionName,
        amount: numericAmount,
        type: transactionType,
        categoryId: validCategory.id,
        category: validCategory,
        date: dateTime,
        note: note.trim() || undefined,
      });

      // Show success message inline
      setShowSuccess(true);

      // Navigate back after a short delay
      setTimeout(() => {
        if (onSaved) {
          onSaved();
        } else if (onClose) {
          onClose();
        }
      }, 1500);
    } catch (error: any) {
      isSavingRef.current = false;
      setIsSaving(false);
      Alert.alert('Không thể lưu giao dịch', error?.message || 'Vui lòng thử lại sau.');
    }
  }, [amount, selectedCategory, transactionName, transactionType, dateTime, dateTimeValidation, note, addTransaction, onSaved, onClose, user, getCategoriesByType]);

  // Handle AI scan - navigate to AI Scanner Screen
  const handleScanReceipt = useCallback(() => {
    if (onScanReceipt) {
      onScanReceipt();
    }
  }, [onScanReceipt]);

  // Handle amount change
  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
    if (amountError) {
      setAmountError('');
    }
  }, [amountError]);

  // Handle transaction name change
  const handleTransactionNameChange = useCallback((value: string) => {
    setTransactionName(value);
    if (transactionNameError) {
      setTransactionNameError('');
    }
  }, [transactionNameError]);

  // Handle category change
  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category);
    setCategoryError('');
  }, []);

  // Handle type change
  const handleTypeChange = useCallback((type: 'income' | 'expense') => {
    setTransactionType(type);
  }, []);

  // Show success overlay
  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Thành công!</Text>
          <Text style={styles.successMessage}>Tạo giao dịch thành công!</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm giao dịch</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Transaction Name Input */}
        <TransactionNameInput
          value={transactionName}
          onChangeText={handleTransactionNameChange}
          error={transactionNameError}
        />

        {/* Transaction Type Selector */}
        <TypeSelector
          selectedType={transactionType}
          onTypeChange={handleTypeChange}
        />

        {/* Amount Input */}
        <AmountInput
          amount={amount}
          onAmountChange={handleAmountChange}
          error={amountError}
        />

        {/* Category Picker */}
        <CategoryPicker
          categories={availableCategories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          error={categoryError}
        />

        {/* Date & Time Picker */}
        <DateTimeInput
          date={dateTime}
          onDateChange={setDateTime}
          onValidationChange={setDateTimeValidation}
        />

        {/* Note Input */}
        <NoteInput
          note={note}
          onNoteChange={setNote}
        />

        <View style={styles.actionButtons}>
          {/* AI Scanner Button */}
          <AIScanButton onPress={handleScanReceipt} />

          {/* Save Button */}
          <SaveButton
            onPress={handleSave}
            disabled={isSaving}
            label={isSaving ? 'ĐANG LƯU...' : 'LƯU LẠI'}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerRight: {
    minWidth: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  actionButtons: {
    marginTop: 16,
  },
  // Success overlay styles
  successContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

export default AddTransactionScreen;
