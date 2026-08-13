// SmartSpend AI - Reset Password Screen
// UC03: Set New Password After OTP Verification
// Features:
// - New password input
// - Confirm password input
// - Real-time password validation
// - Password strength indicator

import React, { useState, useCallback } from 'react';
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

interface ResetPasswordScreenProps {
  email: string;
  verificationToken: string; // Token từ OTP verification
  onSuccess: () => void;
  onBack: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  email,
  verificationToken,
  onSuccess,
  onBack,
}) => {
  const { resetPassword, isLoading, clearError } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Password validation rules
  const passwordRequirements = [
    { key: 'uppercase', label: 'Ít nhất 1 chữ hoa (A-Z)', valid: false },
    { key: 'number', label: 'Ít nhất 1 số (0-9)', valid: false },
    { key: 'special', label: 'Ít nhất 1 ký tự đặc biệt', valid: false },
    { key: 'minLength', label: 'Tối thiểu 8 ký tự', valid: false },
  ];

  // Real-time password validation
  const validatePassword = useCallback((pwd: string) => {
    const updated = passwordRequirements.map((req) => {
      switch (req.key) {
        case 'uppercase':
          return { ...req, valid: /[A-Z]/.test(pwd) };
        case 'number':
          return { ...req, valid: /[0-9]/.test(pwd) };
        case 'special':
          return { ...req, valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) };
        case 'minLength':
          return { ...req, valid: pwd.length >= 8 };
        default:
          return req;
      }
    });
    return updated;
  }, []);

  const [passwordChecks, setPasswordChecks] = useState(passwordRequirements);

  // Get password strength level
  const getPasswordStrength = (): { level: number; label: string; color: string } => {
    const validCount = passwordChecks.filter((c) => c.valid).length;

    if (validCount === 0) return { level: 0, label: '', color: 'transparent' };
    if (validCount <= 1) return { level: 1, label: 'Yếu', color: Colors.danger };
    if (validCount <= 2) return { level: 2, label: 'Trung bình', color: Colors.warning };
    if (validCount === 3) return { level: 3, label: 'Khá mạnh', color: Colors.secondary };
    return { level: 4, label: 'Mạnh', color: Colors.success };
  };

  const strength = getPasswordStrength();

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Mật khẩu không được để trống';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Mật khẩu phải chứa ít nhất 1 chữ hoa';
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Mật khẩu phải chứa ít nhất 1 số';
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      newErrors.newPassword = 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle password change
  const handlePasswordChange = (text: string) => {
    setNewPassword(text);
    setPasswordChecks(validatePassword(text));
    if (errors.newPassword) {
      setErrors((prev) => ({ ...prev, newPassword: undefined }));
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    clearError();

    if (!validateForm()) {
      return;
    }

    console.log('Calling resetPassword with:', { email, verificationToken: verificationToken?.substring(0, 20) + '...' });

    const result = await resetPassword(email, newPassword, verificationToken);
    console.log('resetPassword result:', result);

    if (result.success) {
      // Hiển thị alert thành công và tự động chuyển trang
      Alert.alert(
        'Thành công!',
        'Mật khẩu của bạn đã được đặt lại.',
        [{ text: 'OK' }]
      );
      console.log('ResetPasswordScreen - onSuccess called, navigating...');
      // Tự động chuyển trang sau 1.5 giây
      setTimeout(() => {
        console.log('ResetPasswordScreen - executing onSuccess');
        onSuccess();
      }, 1500);
    } else {
      // Hiển thị lỗi chi tiết
      Alert.alert('Lỗi đặt lại mật khẩu', result.message || 'Vui lòng thử lại sau.');
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
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            Tạo mật khẩu mới cho tài khoản{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu mới</Text>
            <View
              style={[
                styles.inputContainer,
                errors.newPassword ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor={Colors.textMuted}
                value={newPassword}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            )}
          </View>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          level <= strength.level
                            ? strength.color
                            : Colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
              {strength.level > 0 && (
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              )}
            </View>
          )}

          {/* Password Requirements */}
          {newPassword.length > 0 && (
            <View style={styles.requirementsContainer}>
              {passwordChecks.map((req) => (
                <View key={req.key} style={styles.requirementItem}>
                  <Ionicons
                    name={req.valid ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={req.valid ? Colors.success : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      { color: req.valid ? Colors.success : Colors.textMuted },
                    ]}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <View
              style={[
                styles.inputContainer,
                errors.confirmPassword ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.resetButtonText}>Đặt lại mật khẩu</Text>
            )}
          </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
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
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  form: {
    gap: 16,
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
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  requirementsContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementText: {
    fontSize: 13,
  },
  resetButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;
