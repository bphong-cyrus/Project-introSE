// SmartSpend AI - Edit Transaction Screen (Frame 11)
// UC11: Edit existing transaction - Save button at bottom, no top bar save

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Category, Transaction } from '../../../shared/types';
import { useTransactions } from '../../../state/TransactionContext';
import { MAX_TRANSACTION_AMOUNT } from '../utils';
import { useCategories } from '../../../state/CategoryContext';
import TypeSelector from '../components/TypeSelector';
import TransactionNameInput from '../components/TransactionNameInput';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import DateTimeInput from '../components/DateTimeInput';
import NoteInput from '../components/NoteInput';

interface EditTransactionScreenProps {
  transaction: Transaction;
  onBack: () => void;
  onSaved: () => void;
}

const toAmountInputValue = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '';
  return Math.trunc(value).toString();
};

const EditTransactionScreen: React.FC<EditTransactionScreenProps> = ({
  transaction,
  onBack,
  onSaved,
}) => {
  const { updateTransaction, getTransaction } = useTransactions();
  const { getCategoriesByType } = useCategories();

  // Form state - initialize from transaction
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(transaction.type);
  const [transactionName, setTransactionName] = useState<string>(transaction.name);
  const [amount, setAmount] = useState<string>(toAmountInputValue(transaction.amount));
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    transaction.category || null
  );
  const [dateTime, setDateTime] = useState<Date>(new Date(transaction.date));
  const [note, setNote] = useState<string>(transaction.note || '');
  const [transactionNameError, setTransactionNameError] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // Animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get fresh transaction data (in case it was updated elsewhere)
  const freshTransaction = getTransaction(transaction.id);
  useEffect(() => {
    if (freshTransaction && !showSuccess) {
      setTransactionType(freshTransaction.type);
      setTransactionName(freshTransaction.name);
      setAmount(toAmountInputValue(freshTransaction.amount));
      setSelectedCategory(freshTransaction.category || null);
      setDateTime(new Date(freshTransaction.date));
      setNote(freshTransaction.note || '');
    }
  }, [freshTransaction, showSuccess]);

  // Available categories based on type
  const availableCategories = getCategoriesByType(transactionType);

  // Set default category when type changes and current category doesn't match
  useEffect(() => {
    const categories = getCategoriesByType(transactionType);
    if (categories.length > 0 && selectedCategory) {
      const matchesType = categories.some(c => c.id === selectedCategory.id);
      if (!matchesType) {
        setSelectedCategory(categories[0]);
      }
    }
  }, [transactionType, selectedCategory]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onBack();
  }, [onBack]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;

    // Reset error
    setTransactionNameError('');
    setAmountError('');

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
    if (!selectedCategory) {
      return;
    }

    try {
      isSavingRef.current = true;
      setIsSaving(true);

      const saved = await updateTransaction(transaction.id, {
        name: trimmedTransactionName,
        amount: numericAmount,
        type: transactionType,
        categoryId: selectedCategory.id,
        category: selectedCategory,
        date: dateTime,
        note: note.trim() || undefined,
      });

      if (!saved) {
        throw new Error('Không thể cập nhật giao dịch trong cơ sở dữ liệu.');
      }

      // Show success
      setShowSuccess(true);

      // Navigate back after delay
      setTimeout(() => {
        onSaved();
      }, 1500);
    } catch (error: any) {
      isSavingRef.current = false;
      setIsSaving(false);
      Alert.alert('Không thể cập nhật giao dịch', error?.message || 'Vui lòng thử lại sau.');
    }
  }, [amount, selectedCategory, transactionName, transactionType, dateTime, note, transaction.id, updateTransaction, onSaved]);

  // Handle type change
  const handleTypeChange = useCallback((type: 'income' | 'expense') => {
    setTransactionType(type);
  }, []);

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

  // Handle category select
  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category);
  }, []);

  // Show success overlay
  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Thành công!</Text>
          <Text style={styles.successMessage}>Cập nhật giao dịch thành công!</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header - Back only, no Save */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa giao dịch</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          />

          {/* Date & Time Picker */}
          <DateTimeInput
            date={dateTime}
            onDateChange={setDateTime}
          />

          {/* Note Input */}
          <NoteInput
            note={note}
            onNoteChange={setNote}
          />
        </ScrollView>

        {/* Save Button at Bottom */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
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
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  cancelButton: {
    padding: 4,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerRight: {
    minWidth: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Success overlay
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

export default EditTransactionScreen;
