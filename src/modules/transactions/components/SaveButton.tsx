// SmartSpend AI - Save Button Component
// UC07: Standalone save button with its own callback

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface SaveButtonProps {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  onPress,
  disabled = false,
  label = 'LƯU LẠI',
}) => {
  return (
    <TouchableOpacity
      style={[styles.saveButton, disabled ? styles.saveButtonDisabled : null]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      testID="save-button"
    >
      <Text style={styles.saveButtonText}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  saveButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default SaveButton;
