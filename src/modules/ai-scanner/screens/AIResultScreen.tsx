// SmartSpend AI - AI Result Screen (Frame 10)
// UC13: Edit and confirm AI-extracted receipt data

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';
import { useTransactions } from '../../../state/TransactionContext';
import { MAX_TRANSACTION_AMOUNT } from '../../transactions/utils';
import { useCategories } from '../../../state/CategoryContext';
import { Category } from '../../../shared/types';
import { Image } from 'react-native';
import SuccessBanner from '../components/SuccessBanner';
import ReceiptPreview from '../components/ReceiptPreview';
import CategoryDropdown from '../components/CategoryDropdown';
import TypeSelector from '../../transactions/components/TypeSelector';
import DateTimeInput from '../../transactions/components/DateTimeInput';
import type { ExtractedReceiptData } from './AIScannerScreen';

interface AIResultScreenProps {
  data: ExtractedReceiptData;
  onBack: () => void;
  onSaved: () => void;
}

const normaliseCategoryName = (value: string): string =>
  value.trim().toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const AIResultScreen: React.FC<AIResultScreenProps> = ({ data, onBack, onSaved }) => {
  const { addTransaction } = useTransactions();
  const { getCategoriesByType } = useCategories();

  // Form state - pre-filled with extracted data
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(data.type || 'expense');
  const [amount, setAmount] = useState<string>(data.amount.toString());
  const [storeName, setStoreName] = useState<string>(data.storeName);
  const [transactionName, setTransactionName] = useState<string>(data.storeName);
  const [transactionNameEdited, setTransactionNameEdited] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState<Date>(data.date);
  const [dateEdited, setDateEdited] = useState<boolean>(!data.missingFields?.includes('date'));
  const [note, setNote] = useState<string>(data.note || '');
  const [transactionNameError, setTransactionNameError] = useState<string>('');
  const [storeNameError, setStoreNameError] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const categories = getCategoriesByType(transactionType);
  const expenseCategories = getCategoriesByType('expense');
  const incomeCategories = getCategoriesByType('income');

  // Initialize selected category from extracted data
  React.useEffect(() => {
    const available = transactionType === 'expense' ? expenseCategories : incomeCategories;
    const matched = available.find(c => c.id === data.categoryId) ||
      available.find(c => normaliseCategoryName(c.name) === normaliseCategoryName(data.categoryName || ''));
    const categoryWasMissing = data.missingFields?.includes('category');
    setSelectedCategory(matched || (categoryWasMissing ? null : available[0]) || null);
  }, [transactionType, expenseCategories, incomeCategories, data.categoryId, data.categoryName, data.missingFields]);

  // Format amount with commas
  const formatAmount = (value: string): string => {
    if (!value) return '';
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('vi-VN');
  };

  // Handle amount change
  const handleAmountChange = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setAmount(digits);
    if (amountError) setAmountError('');
  }, [amountError]);

  const handleTransactionNameChange = useCallback((text: string) => {
    setTransactionName(text);
    setTransactionNameEdited(true);
    if (transactionNameError) setTransactionNameError('');
  }, [transactionNameError]);

  const handleStoreNameChange = useCallback((text: string) => {
    setStoreName(text);
    if (storeNameError) setStoreNameError('');
    if (!transactionNameEdited) {
      setTransactionName(text);
      if (transactionNameError) setTransactionNameError('');
    }
  }, [storeNameError, transactionNameEdited, transactionNameError]);

  const handleDateTimeChange = useCallback((nextDate: Date) => {
    setDate(nextDate);
    setDateEdited(true);
    if (dateError) setDateError('');
  }, [dateError]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;

    setTransactionNameError('');
    setStoreNameError('');
    setAmountError('');
    setCategoryError('');
    setDateError('');

    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    const trimmedTransactionName = transactionName.trim();

    if (!trimmedTransactionName) {
      setTransactionNameError('Tên giao dịch là bắt buộc');
      return;
    }

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Số tiền phải lớn hơn 0');
      return;
    }

    if (numericAmount > MAX_TRANSACTION_AMOUNT) {
      setAmountError('Số tiền giao dịch không được vượt quá 2 tỷ đồng');
      return;
    }

    if (!storeName.trim()) {
      setStoreNameError('Tên cửa hàng/người chuyển là bắt buộc');
      return;
    }

    if (!dateEdited) {
      setDateError('Vui lòng nhập ngày giao dịch');
      return;
    }

    if (!selectedCategory) {
      setCategoryError('Vui lòng chọn danh mục');
      return;
    }

    const finalDate = new Date(date);

    try {
      isSavingRef.current = true;
      setIsSaving(true);

      await addTransaction({
        userId: '',
        name: trimmedTransactionName,
        amount: numericAmount,
        type: transactionType,
        categoryId: selectedCategory.id,
        category: selectedCategory,
        date: finalDate,
        note: note.trim() || undefined,
        imageUrl: data.imageUri,
        source: 'ocr',
      });

      setShowSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 1500);
    } catch (error: any) {
      isSavingRef.current = false;
      setIsSaving(false);
      Alert.alert('Không thể lưu giao dịch', error?.message || 'Vui lòng thử lại sau.');
    }
  }, [amount, transactionName, storeName, selectedCategory, date, dateEdited, note, transactionType, data.imageUri, addTransaction, onSaved]);

  // Success overlay
  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Lưu giao dịch thành công!</Text>
        </View>
      </View>
    );
  }

  const dateConfidenceString = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;

  // Confidence color helper
  const getConfidenceColor = (value: number) => {
    if (value >= 90) return '#D5F5E3';
    if (value >= 70) return '#FCF3CF';
    return '#FADBD8';
  };

  const getConfidenceTextColor = (value: number) => {
    if (value >= 90) return '#0D5C47';
    if (value >= 70) return '#9A7B0A';
    return '#922B21';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kết quả quét</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Success Banner */}
        <SuccessBanner
          needsManualReview={data.needsManualReview}
          overallConfidence={data.overallConfidence ?? data.confidence.overall ?? 0}
          missingFields={data.missingFields}
        />

        {/* Receipt Preview */}
        <ReceiptPreview
          storeName={data.storeName}
          dateString={dateConfidenceString}
          confidenceLevel={data.confidence.amount}
          imageUri={data.imageUri}
          needsManualReview={data.needsManualReview}
        />

        {/* Transaction Type - AI Detected (Read-only with AI badge) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>LOẠI GIAO DỊCH</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(data.confidence.type) }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceTextColor(data.confidence.type) }]}>
                {data.confidence.type}% AI Confidence
              </Text>
            </View>
          </View>
          {data.missingFields?.includes('type') ? (
            <TypeSelector
              selectedType={transactionType}
              onTypeChange={setTransactionType}
            />
          ) : (
          <View style={styles.aiTypeContainer}>
            <Text style={styles.aiTypeText}>
              {transactionType === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
            </Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeIcon}>✨</Text>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
          )}
        </View>

        {/* Transaction Name */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>TÊN GIAO DỊCH</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(data.confidence.storeName) }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceTextColor(data.confidence.storeName) }]}>
                {data.confidence.storeName}% AI Confidence
              </Text>
            </View>
          </View>
          <TextInput
            style={[styles.textInput, transactionNameError ? styles.textInputError : null]}
            value={transactionName}
            onChangeText={handleTransactionNameChange}
            placeholder="Nhập tên giao dịch"
            placeholderTextColor={Colors.textMuted}
            maxLength={80}
          />
          {transactionNameError ? <Text style={styles.errorText}>{transactionNameError}</Text> : null}
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>TỔNG TIỀN (VND)</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(data.confidence.amount) }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceTextColor(data.confidence.amount) }]}>
                {data.confidence.amount}% AI Confidence
              </Text>
            </View>
          </View>
          <View style={[styles.amountInputContainer, amountError ? styles.amountInputError : null]}>
            <TextInput
              style={styles.amountInput}
              value={formatAmount(amount)}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={styles.currencySymbol}>VND</Text>
          </View>
          {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
          {typeof data.signedAmount === 'number' && data.signedAmount !== 0 ? (
            <Text style={styles.signHint}>
              OCR đọc {data.signedAmount < 0 ? 'âm → chi tiêu' : 'dương → thu nhập'}
            </Text>
          ) : null}
        </View>

        {/* Store Name */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>TÊN CỬA HÀNG</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(data.confidence.storeName) }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceTextColor(data.confidence.storeName) }]}>
                {data.confidence.storeName}% AI Confidence
              </Text>
            </View>
          </View>
          <TextInput
            style={[styles.textInput, storeNameError ? styles.textInputError : null]}
            value={storeName}
            onChangeText={handleStoreNameChange}
            placeholder="Nhập tên cửa hàng"
            placeholderTextColor={Colors.textMuted}
          />
          {storeNameError ? <Text style={styles.errorText}>{storeNameError}</Text> : null}
        </View>

        {/* Date & Time Picker - same component/configuration as Add Transaction */}
        <DateTimeInput
          date={date}
          onDateChange={handleDateTimeChange}
        />
        {dateError ? <Text style={styles.dateTimeErrorText}>{dateError}</Text> : null}

        {/* Category Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>DANH MỤC</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(data.confidence.category) }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceTextColor(data.confidence.category) }]}>
                {data.confidence.category}% AI Confidence
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.categorySelectContainer}
            onPress={() => setShowCategoryDropdown(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryText}>
              {selectedCategory ? selectedCategory.name : 'Chọn danh mục'}
            </Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeIcon}>✨</Text>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </TouchableOpacity>
          {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GHI CHÚ</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Thêm ghi chú (tùy chọn)"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonWrapper}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'ĐANG LƯU...' : 'LƯU GIAO DỊCH'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Dropdown Modal */}
      {showCategoryDropdown && (
        <CategoryDropdown
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={(cat) => {
            setSelectedCategory(cat);
            setCategoryError('');
            setShowCategoryDropdown(false);
          }}
          onClose={() => setShowCategoryDropdown(false)}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: 4,
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerRight: {
    minWidth: 80,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  // AI Type selector (read-only with AI badge)
  aiTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
  },
  aiTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  confidenceTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Amount input - same style as Frame 8
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    height: 64,
  },
  amountInputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textInputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  // Date input with icon inside - same pattern as amount
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 14,
    height: 48,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
  categorySelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 14,
    height: 52,
  },
  categoryText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
  },
  dateTimeErrorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: -14,
    marginBottom: 16,
  },
  signHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  saveButtonWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
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
  successIconText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});

export default AIResultScreen;
