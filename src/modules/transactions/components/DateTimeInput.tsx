// SmartSpend AI - Date & Time Input Component
// UC07: Text input for date and time with validation
// Supports multiple date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY

import React, { useState, useEffect, useCallback } from 'react';
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
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({ date, onDateChange }) => {
  const [dateString, setDateString] = useState('');
  const [timeString, setTimeString] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');

  // Initialize with current date
  useEffect(() => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    setDateString(`${day}/${month}/${year}`);

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    setTimeString(`${hours}:${minutes}`);
  }, [date]);

  // Parse and validate date
  const validateAndUpdateDate = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setDateError('Vui lòng nhập ngày');
      return false;
    }

    // Try to parse the date
    const parts = trimmed.split(/[\/\-\.]/);
    if (parts.length < 3) {
      // Not enough parts yet
      return false;
    }

    let day: number, month: number, year: number;

    // Try DD/MM/YYYY format first
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);

    // Handle 2-digit year
    if (year < 100) {
      year = year > 50 ? 1900 + year : 2000 + year;
    }

    // Validate
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      setDateError('Ngày không hợp lệ');
      return false;
    }

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      setDateError('Ngày không hợp lệ');
      return false;
    }

    // Check actual days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      setDateError(`Tháng ${month} chỉ có ${daysInMonth} ngày`);
      return false;
    }

    // Update date while preserving the existing time. Set year/month/day in
    // one call so changing from a 31-day month to a shorter month cannot roll
    // over through an invalid intermediate date.
    const newDate = new Date(date);
    newDate.setFullYear(year, month - 1, day);
    onDateChange(newDate);
    setDateError('');
    return true;
  }, [date, onDateChange]);

  // Parse and validate time
  const validateAndUpdateTime = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setTimeError('Vui lòng nhập giờ');
      return false;
    }

    // Remove non-digit except :
    const cleaned = trimmed.replace(/[^\d:]/g, '');
    const parts = cleaned.split(':');

    if (parts.length < 2) {
      // Not enough parts yet
      return false;
    }

    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) {
      setTimeError('Giờ không hợp lệ');
      return false;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setTimeError('Giờ không hợp lệ');
      return false;
    }

    // Update time
    const newDate = new Date(date);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0, 0);
    onDateChange(newDate);
    setTimeError('');
    return true;
  }, [date, onDateChange]);

  const handleDateChange = (text: string) => {
    setDateString(text);
    setDateError('');

    // Try to validate if format is complete
    const parts = text.split(/[\/\-\.]/);
    if (parts.length === 3 && parts[0].length >= 2 && parts[1].length >= 2 && parts[2].length >= 4) {
      validateAndUpdateDate(text);
    }
  };

  const handleDateBlur = () => {
    validateAndUpdateDate(dateString);
  };

  const handleTimeChange = (text: string) => {
    setTimeString(text);
    setTimeError('');

    // Try to validate if format is complete
    const parts = text.split(':');
    if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
      validateAndUpdateTime(text);
    }
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
