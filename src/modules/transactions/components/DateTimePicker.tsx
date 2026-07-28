// SmartSpend AI - Date & Time Picker Component
// UC07: Side-by-side date and time selection

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

interface DateTimePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ date, onDateChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState(date);

  const formatDate = (d: Date): string => {
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatTime = (d: Date): string => {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setTempDate(date);
    setShowPicker(true);
  };

  const handleConfirm = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(newDate.getDate() + days);
    setTempDate(newDate);
  };

  const adjustHours = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setHours(newDate.getHours() + delta);
    setTempDate(newDate);
  };

  const adjustMinutes = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setMinutes(newDate.getMinutes() + delta);
    setTempDate(newDate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Date Picker */}
        <View style={styles.column}>
          <Text style={styles.label}>NGÀY GIAO DỊCH</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => openPicker('date')}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerText}>{formatDate(date)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Time Picker */}
        <View style={styles.column}>
          <Text style={styles.label}>THỜI GIAN</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => openPicker('time')}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerText}>{formatTime(date)}</Text>
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Date/Time Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {pickerMode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
              </Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmText}>Xong</Text>
              </TouchableOpacity>
            </View>

            {pickerMode === 'date' ? (
              <View style={styles.datePickerBody}>
                <Text style={styles.dateDisplay}>{formatDate(tempDate)}</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => adjustDate(-1)}
                  >
                    <Text style={styles.dateButtonText}>-1 ngày</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => adjustDate(1)}
                  >
                    <Text style={styles.dateButtonText}>+1 ngày</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateControls}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => adjustDate(-7)}
                  >
                    <Text style={styles.dateButtonText}>-7 ngày</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => adjustDate(7)}
                  >
                    <Text style={styles.dateButtonText}>+7 ngày</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.todayButton}
                  onPress={() => setTempDate(new Date())}
                >
                  <Text style={styles.todayButtonText}>Hôm nay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timePickerBody}>
                <Text style={styles.dateDisplay}>{formatTime(tempDate)}</Text>
                <View style={styles.timeControls}>
                  <View style={styles.timeControlRow}>
                    <Text style={styles.timeControlLabel}>Giờ:</Text>
                    <View style={styles.timeButtons}>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => adjustHours(-1)}
                      >
                        <Text style={styles.timeButtonText}>-1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => adjustHours(1)}
                      >
                        <Text style={styles.timeButtonText}>+1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.timeControlRow}>
                    <Text style={styles.timeControlLabel}>Phút:</Text>
                    <View style={styles.timeButtons}>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => adjustMinutes(-15)}
                      >
                        <Text style={styles.timeButtonText}>-15</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => adjustMinutes(15)}
                      >
                        <Text style={styles.timeButtonText}>+15</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'JetBrains Mono',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  datePickerBody: {
    padding: 20,
    alignItems: 'center',
  },
  timePickerBody: {
    padding: 20,
    alignItems: 'center',
  },
  dateDisplay: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
    fontFamily: 'JetBrains Mono',
  },
  dateControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  todayButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeControls: {
    width: '100%',
    gap: 16,
  },
  timeControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timeControlLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  timeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    width: 60,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default DateTimePicker;