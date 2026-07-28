// SmartSpend AI - Amount Input Component
// UC07: Large display input for transaction amount with VND currency

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface AmountInputProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  error?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({ amount, onAmountChange, error }) => {
  const inputRef = useRef<TextInput>(null);

  // Format number with thousand separators (commas)
  const formatForDisplay = (value: string): string => {
    if (!value || value === '0') return '';
    const num = parseInt(value, 10) || 0;
    return num.toLocaleString('en-US');
  };

  // Handle text input change
  const handleChange = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    onAmountChange(digits);
  }, [onAmountChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SỐ TIỀN (VND)</Text>
      <TouchableOpacity
        style={[styles.inputContainer, error ? styles.inputContainerError : null]}
        onPress={() => inputRef.current?.focus()}
        activeOpacity={1}
      >
        {/* Left side - amount input */}
        <View style={styles.amountWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={formatForDisplay(amount)}
            onChangeText={handleChange}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={18}
            selectionColor={Colors.primary}
          />
        </View>
        {/* Right side - currency symbol */}
        <Text style={styles.currencySymbol}>đ</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 18,
    minHeight: 64,
  },
  inputContainerError: {
    borderColor: Colors.danger,
    borderWidth: 2,
  },
  amountWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'left',
    padding: 0,
    margin: 0,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
  },
});

export default AmountInput;
