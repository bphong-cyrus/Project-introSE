// SmartSpend AI - Profile Setup Screen
// UC01: Complete User Profile After Registration
// Features:
// - Full name (pre-filled if available)
// - Date of birth
// - Occupation
// - Monthly income
// - Save profile and complete onboarding

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';

interface ProfileSetupScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const formatDateForDisplay = (isoDate: string): string => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const parseDisplayDateToISO = (displayDate: string): string | undefined => {
  const match = displayDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const today = new Date();

  if (year < 1900 || year > today.getFullYear() || month < 1 || month > 12 || day < 1) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > today
  ) {
    return undefined;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const parseCurrencyInput = (value: string): number | undefined => {
  const numericValue = value.replace(/[^\d]/g, '');
  if (!numericValue) return undefined;

  const amount = Number(numericValue);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
};

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  onComplete,
  onSkip,
}) => {
  const { user, updateProfile, isLoading, completeOnboarding } = useAuth();

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? formatDateForDisplay(user.dateOfBirth) : '');
  const [occupation, setOccupation] = useState(user?.job || '');
  const [monthlyIncome, setMonthlyIncome] = useState(
    user?.income != null ? user.income.toLocaleString('vi-VN') : ''
  );

  // Validation errors
  const [errors, setErrors] = useState<{
    fullName?: string;
    dateOfBirth?: string;
    income?: string;
  }>({});

  useEffect(() => {
    setFullName(user?.fullName || '');
    setDateOfBirth(user?.dateOfBirth ? formatDateForDisplay(user.dateOfBirth) : '');
    setOccupation(user?.job || '');
    setMonthlyIncome(user?.income != null ? user.income.toLocaleString('vi-VN') : '');
  }, [user]);

  const handleDateChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    setDateOfBirth(parts.join('/'));
    if (errors.dateOfBirth) {
      setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
    }
  };

  // Validate income
  const validateIncome = (income: string): boolean => {
    if (!income) return true; // Income is optional
    return parseCurrencyInput(income) !== undefined;
  };

  // Format currency input
  const formatCurrencyInput = (value: string): string => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    // Format with commas
    return parseInt(numericValue, 10).toLocaleString('vi-VN');
  };

  // Handle income input
  const handleIncomeChange = (value: string) => {
    const formatted = formatCurrencyInput(value);
    setMonthlyIncome(formatted);
    if (errors.income) {
      setErrors((prev) => ({ ...prev, income: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên không được để trống';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    // Date of birth validation (optional but must be valid if provided)
    if (dateOfBirth && !parseDisplayDateToISO(dateOfBirth)) {
      newErrors.dateOfBirth = 'Ngày sinh không hợp lệ (DD/MM/YYYY)';
    }

    // Income validation
    if (!validateIncome(monthlyIncome)) {
      newErrors.income = 'Thu nhập không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    const normalizedDateOfBirth = dateOfBirth ? parseDisplayDateToISO(dateOfBirth) : undefined;

    // Parse income
    const income = parseCurrencyInput(monthlyIncome);

    const result = await updateProfile({
      fullName: fullName.trim(),
      dateOfBirth: normalizedDateOfBirth,
      job: occupation.trim() || undefined,
      income,
    });

    if (result.success) {
      completeOnboarding();
      onComplete();
    } else {
      Alert.alert('Lỗi', result.message);
    }
  };

  // Handle skip
  const handleSkip = () => {
    if (onSkip) {
      Alert.alert(
        'Bỏ qua thiết lập profile?',
        'Bạn có thể cập nhật thông tin cá nhân sau trong phần Hồ sơ.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Bỏ qua',
            onPress: () => {
              completeOnboarding();
              onSkip();
            },
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>👤</Text>
          </View>
          <Text style={styles.title}>Hoàn thiện hồ sơ</Text>
          <Text style={styles.subtitle}>
            Cung cấp thêm thông tin để cá nhân hóa trải nghiệm của bạn
          </Text>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressDots}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.progressText}>Bước 2/3</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
            <View
              style={[
                styles.inputContainer,
                errors.fullName ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập họ và tên của bạn"
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) {
                    setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
                autoCapitalize="words"
              />
            </View>
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          {/* Date of Birth Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh</Text>
            <View
              style={[
                styles.inputContainer,
                errors.dateOfBirth ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.textMuted}
                value={dateOfBirth}
                onChangeText={handleDateChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            {errors.dateOfBirth && (
              <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
            )}
          </View>

          {/* Occupation Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nghề nghiệp</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Kỹ sư, Giáo viên, Sinh viên..."
                placeholderTextColor={Colors.textMuted}
                value={occupation}
                onChangeText={setOccupation}
              />
            </View>
          </View>

          {/* Monthly Income Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thu nhập hàng tháng (VND)</Text>
            <View
              style={[
                styles.inputContainer,
                errors.income ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={monthlyIncome}
                onChangeText={handleIncomeChange}
                keyboardType="numeric"
              />
              <Text style={styles.currencySuffix}>VND</Text>
            </View>
            {errors.income && (
              <Text style={styles.errorText}>{errors.income}</Text>
            )}
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              Thông tin thu nhập giúp chúng tôi đưa ra gợi ý tiết kiệm phù hợp với bạn.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Cập nhật hồ sơ</Text>
            )}
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.skipButtonText}>Bỏ qua</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: Colors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },
  currencySuffix: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileSetupScreen;
