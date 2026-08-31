// SmartSpend AI - Date & Time Input Component
// UC07: Text input for date and time with validation
// Supports multiple date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

interface DateTimeInputProps {
  date: Date;
  onDateChange: (date: Date) => void;
  onValidationChange?: (state: DateTimeValidationState) => void;
}

export type DateTimeValidationState = {
  isDateValid: boolean;
  isTimeValid: boolean;
  dateError?: string;
  timeError?: string;
};

type ParsedDateParts = {
  day: number;
  month: number;
  year: number;
};

type ParsedTimeParts = {
  hours: number;
  minutes: number;
};

const parseDateParts = (input: string): { parts?: ParsedDateParts; error?: string } => {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'Vui lòng nhập ngày' };

  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length < 3) return { error: 'Ngày không hợp lệ' };

  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (year < 100) {
    year = year > 50 ? 1900 + year : 2000 + year;
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { error: 'Ngày không hợp lệ' };
  }

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return { error: 'Ngày không hợp lệ' };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return { error: `Tháng ${month} chỉ có ${daysInMonth} ngày` };
  }

  return { parts: { day, month, year } };
};

const parseTimeParts = (input: string): { parts?: ParsedTimeParts; error?: string } => {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'Vui lòng nhập giờ' };

  const cleaned = trimmed.replace(/[^\d:]/g, '');
  const parts = cleaned.split(':');
  if (parts.length < 2) return { error: 'Giờ không hợp lệ' };

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return { error: 'Giờ không hợp lệ' };
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { error: 'Giờ không hợp lệ' };
  }

  return { parts: { hours, minutes } };
};

const DateTimeInput: React.FC<DateTimeInputProps> = ({ date, onDateChange, onValidationChange }) => {
  const [dateString, setDateString] = useState('');
  const [timeString, setTimeString] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const didInitializeRef = useRef(false);
  const lastEmittedTimestampRef = useRef<number | null>(null);
  const dateTimestamp = date.getTime();

  const notifyValidation = useCallback((nextDateError: string, nextTimeError: string) => {
    onValidationChange?.({
      isDateValid: !nextDateError,
      isTimeValid: !nextTimeError,
      dateError: nextDateError || undefined,
      timeError: nextTimeError || undefined,
    });
  }, [onValidationChange]);

  const setValidationErrors = useCallback((nextDateError: string, nextTimeError: string) => {
    setDateError(nextDateError);
    setTimeError(nextTimeError);
    notifyValidation(nextDateError, nextTimeError);
  }, [notifyValidation]);

  // Initialize with current date
  useEffect(() => {
    if (didInitializeRef.current && lastEmittedTimestampRef.current === dateTimestamp) {
      return;
    }

    didInitializeRef.current = true;
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    setDateString(`${day}/${month}/${year}`);

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    setTimeString(`${hours}:${minutes}`);
    setDateError('');
    setTimeError('');
    notifyValidation('', '');
  }, [dateTimestamp]);

  // Parse and validate date
  const validateAndUpdateDate = useCallback((input: string) => {
    const parsedDate = parseDateParts(input);
    if (parsedDate.error || !parsedDate.parts) {
      setValidationErrors(parsedDate.error || 'Ngày không hợp lệ', timeError);
      return false;
    }

    const parsedTime = parseTimeParts(timeString);
    if (parsedTime.error || !parsedTime.parts) {
      setValidationErrors('', parsedTime.error || 'Giờ không hợp lệ');
      return false;
    }

    const newDate = new Date(date);
    newDate.setFullYear(parsedDate.parts.year, parsedDate.parts.month - 1, parsedDate.parts.day);
    newDate.setHours(parsedTime.parts.hours, parsedTime.parts.minutes, 0, 0);
    lastEmittedTimestampRef.current = newDate.getTime();
    onDateChange(newDate);
    setValidationErrors('', '');
    return true;
  }, [date, onDateChange, setValidationErrors, timeError, timeString]);

  // Parse and validate time
  const validateAndUpdateTime = useCallback((input: string) => {
    const parsedTime = parseTimeParts(input);
    if (parsedTime.error || !parsedTime.parts) {
      setValidationErrors(dateError, parsedTime.error || 'Giờ không hợp lệ');
      return false;
    }

    const parsedDate = parseDateParts(dateString);
    if (parsedDate.error || !parsedDate.parts) {
      setValidationErrors(parsedDate.error || 'Ngày không hợp lệ', '');
      return false;
    }

    const newDate = new Date(date);
    newDate.setFullYear(parsedDate.parts.year, parsedDate.parts.month - 1, parsedDate.parts.day);
    newDate.setHours(parsedTime.parts.hours, parsedTime.parts.minutes, 0, 0);
    lastEmittedTimestampRef.current = newDate.getTime();
    onDateChange(newDate);
    setValidationErrors('', '');
    return true;
  }, [date, dateError, dateString, onDateChange, setValidationErrors]);

  const handleDateChange = (text: string) => {
    setDateString(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationErrors('Vui lòng nhập ngày', timeError);
      return;
    }

    validateAndUpdateDate(text);
  };

  const handleDateBlur = () => {
    validateAndUpdateDate(dateString);
  };

  const handleTimeChange = (text: string) => {
    setTimeString(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationErrors(dateError, 'Vui lòng nhập giờ');
      return;
    }

    validateAndUpdateTime(text);
  };

  const handleTimeBlur = () => {
    validateAndUpdateTime(timeString);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Date Input */}
        <View style={styles.column}>
          <Text style={styles.label}>NGÀY GIAO DỊCH</Text>
          <View style={[styles.inputWrapper, dateError ? styles.inputError : null]}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={dateString}
              onChangeText={handleDateChange}
              onBlur={handleDateBlur}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
          {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
        </View>

        {/* Time Input */}
        <View style={styles.column}>
          <Text style={styles.label}>THỜI GIAN</Text>
          <View style={[styles.inputWrapper, timeError ? styles.inputError : null]}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={timeString}
              onChangeText={handleTimeChange}
              onBlur={handleTimeBlur}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          {timeError ? <Text style={styles.errorText}>{timeError}</Text> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    padding: 0,
  },
  errorText: {
    fontSize: 11,
    color: Colors.danger,
    marginTop: 4,
  },
});

export default DateTimeInput;
