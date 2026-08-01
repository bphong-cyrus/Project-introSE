// SmartSpend AI - OTP Verification Screen
// UC01: OTP Verification for Registration and Password Reset
// Features:
// - 6-digit OTP input
// - Auto-focus between digits
// - Resend OTP functionality
// - Countdown timer for resend
// - Navigate based on purpose (register/reset)

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';

interface OTPScreenProps {
  email: string;
  purpose: 'register' | 'resetPassword';
  onVerified: () => void;
  onBack: () => void;
}

const OTPScreen: React.FC<OTPScreenProps> = ({
  email,
  purpose,
  onVerified,
  onBack,
}) => {
  const { verifyOTP, resendOTP, isLoading } = useAuth();

  // OTP digits state
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Refs for OTP inputs
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Reset timer when canResend becomes true
  useEffect(() => {
    if (canResend) {
      setResendTimer(0);
    }
  }, [canResend]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  // Handle digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.slice(-1);

    // Update digits state
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (newDigits.every((d) => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  };

  // Handle backspace
  const handleKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerify = async (otp?: string) => {
    const code = otp || digits.join('');

    if (code.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số');
      return;
    }

    const result = await verifyOTP(email, code);

    if (result.success) {
      onVerified();
    } else {
      setError(result.message);
      // Clear inputs on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend) return;

    setError('');
    const result = await resendOTP(email);

    if (result.success) {
      Alert.alert('Thành công', result.message);
      setCanResend(false);
      setResendTimer(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
  };

  // Format timer display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open-outline" size={48} color={Colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Nhập mã OTP</Text>
        <Text style={styles.subtitle}>
          Chúng tôi đã gửi mã xác thực 6 chữ số đến{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleDigitChange(index, value)}
              onKeyPress={(e) => handleKeyPress(index, e)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Resend */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={isLoading}>
              <Text style={styles.resendText}>Gửi lại mã</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Gửi lại mã sau {formatTime(resendTimer)}
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (isLoading || digits.some((d) => !d)) && styles.buttonDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={isLoading || digits.some((d) => !d)}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>
              {purpose === 'register' ? 'Xác thực và tiếp tục' : 'Đặt lại mật khẩu'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              Mã OTP có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
  emailText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  otpInputError: {
    borderColor: Colors.danger,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 'auto',
    paddingTop: 24,
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

export default OTPScreen;
