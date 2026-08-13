// SmartSpend AI - Change Password Screen
// UC03: Change Password from Profile (Authenticated User)
// Features:
// - Email pre-filled from logged-in user (read-only)
// - Send OTP button
// - Navigate to OTP screen
// - Back to Profile

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';

interface ChangePasswordScreenProps {
  onBack: () => void;
  onNavigateToOTP: (email: string) => void;
}

const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  onBack,
  onNavigateToOTP,
}) => {
  const { user, forgotPassword, isLoading, clearError, error } = useAuth();

  // Email được pre-fill từ user đã đăng nhập (read-only)
  const [email] = useState(user?.email || '');
  const [emailError, setEmailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email là bắt buộc.');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Định dạng email không hợp lệ.');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Handle send OTP
  const handleSendOTP = async () => {
    clearError();
    setSuccessMessage('');

    console.log('ChangePasswordScreen - email:', email);

    if (!validateEmail(email)) {
      return;
    }

    const result = await forgotPassword(email);
    console.log('ChangePasswordScreen - forgotPassword result:', result);

    if (result.success) {
      setSuccessMessage(result.message);
      // Tự động chuyển sang trang OTP
      console.log('ChangePasswordScreen - navigating to OTP with email:', email);
      setTimeout(() => {
        onNavigateToOTP(email);
      }, 500);
    }
  };

  if (!email) {
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
          </View>

          <View style={styles.content}>
            <Text style={styles.errorText}>
              Không tìm thấy email người dùng. Vui lòng đăng nhập lại.
            </Text>
            <TouchableOpacity style={styles.backToProfileButton} onPress={onBack}>
              <Text style={styles.backToProfileText}>Quay lại Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={48} color={Colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Thay đổi mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập mã xác thực được gửi đến email của bạn để thay đổi mật khẩu.
          </Text>

          {/* Email Input (Read-only) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
            </View>
            <Text style={styles.hint}>Email này được lấy từ tài khoản của bạn và không thể thay đổi.</Text>
          </View>

          {/* Success Message */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Error Message */}
          {emailError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorTextSmall}>{emailError}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorTextSmall}>{error}</Text>
            </View>
          ) : null}

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Gửi mã xác thực</Text>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                Mã xác thực sẽ được gửi đến email của bạn. Mã có hiệu lực trong 5 phút.
              </Text>
            </View>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
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
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    color: Colors.textSecondary,
    backgroundColor: Colors.backgroundSecondary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: Colors.success,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTextSmall: {
    fontSize: 14,
    color: Colors.danger,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backToProfileButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToProfileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.backgroundSecondary,
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
});

export default ChangePasswordScreen;
