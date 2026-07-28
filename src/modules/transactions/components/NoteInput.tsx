// SmartSpend AI - Note Input Component
// UC07: Multi-line text input for transaction note (optional)

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface NoteInputProps {
  note: string;
  onNoteChange: (note: string) => void;
  maxLength?: number;
}

const NoteInput: React.FC<NoteInputProps> = ({
  note,
  onNoteChange,
  maxLength = 200,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>GHI CHÚ (TÙY CHỌN)</Text>
        <Text style={styles.charCount}>
          {note.length}/{maxLength}
        </Text>
      </View>
      <TextInput
        style={styles.textArea}
        value={note}
        onChangeText={onNoteChange}
        placeholder="Ăn trưa, mua sắm cùng bạn bè..."
        placeholderTextColor={Colors.textMuted}
        multiline={true}
        numberOfLines={3}
        maxLength={maxLength}
        textAlignVertical="top"
      />
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
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default NoteInput;