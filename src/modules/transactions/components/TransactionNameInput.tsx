// SmartSpend AI - Transaction Name Input Component
// UC07: Required transaction name for list and detail display

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface TransactionNameInputProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  maxLength?: number;
}

const TransactionNameInput: React.FC<TransactionNameInputProps> = ({
  value,
  onChangeText,
  error,
  maxLength = 80,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>TÊN GIAO DỊCH</Text>
        <Text style={styles.charCount}>
          {value.length}/{maxLength}
        </Text>
      </View>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Ví dụ: Cơm trưa, lương tháng..."
        placeholderTextColor={Colors.textMuted}
        maxLength={maxLength}
        returnKeyType="next"
        testID="transaction-name-input"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
  },
});

export default TransactionNameInput;
