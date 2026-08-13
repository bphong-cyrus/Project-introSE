// SmartSpend AI - Forgot Password Screen
// UC01: Password Recovery
// Features:
// - Email input field
// - Send reset link button
// - Navigate to OTP screen
// - Back to Login

import React, { useState } from 'react';
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

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
  onNavigateToOTP: (email: string) => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBackToLogin,
  onNavigateToOTP,
}) => {
  const { forgotPassword, isLoading, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Validate email
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email không được để trống');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Email không hợp lệ');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Handle send reset email
  const handleSendReset = async () => {
    clearError();
    setSuccessMessage('');

    if (!validateEmail(email)) {
      return;
    }

    const result = await forgotPassword(email);
    console.log('ForgotPassword result:', result);

    if (result.success) {
      setSuccessMessage(result.message);
      // Tự động chuyển sang trang OTP sau khi gửi thành công
      setTimeout(() => {
        onNavigateToOTP(email);
      }, 500);
    } else {
      Alert.alert('Lỗi', result.message);
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
          <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>
            Không sao cả! Nhập email của bạn và chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailError && (
              <Text style={styles.errorText}>{emailError}</Text>
            )}
          </View>

          {/* Success Message */}
          {successMessage ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.buttonDisabled]}
            onPress={handleSendReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Gửi mã OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Ionicons name="mail" size={24} color={Colors.info} />
            <Text style={styles.infoText}>
              Nếu bạn không nhận được email trong vòng 5 phút, hãy kiểm tra thư mục spam hoặc thử lại.
            </Text>
          </View>
        </View>

        {/* Back to Login */}
        <TouchableOpacity style={styles.backToLogin} onPress={onBackToLogin}>
          <Ionicons name="arrow-back" size={16} color={Colors.primary} />
          <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
        </TouchableOpacity>
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
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 8,
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
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: Colors.success,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 32,
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
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  backToLoginText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;
