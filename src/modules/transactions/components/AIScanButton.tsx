// SmartSpend AI - AI Scanner Action Button
// UC07: Triggers navigation to AI Scanner Screen (Frame 9)

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIScanButtonProps {
  onPress: () => void;
}

const AIScanButton: React.FC<AIScanButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="scan" size={22} color="#FFFFFF" />
      </View>
      <Text style={styles.buttonText}>QUÉT HÓA ĐƠN AI</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3D5A98', // Dark blue/purple from design
    height: 52,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  iconContainer: {
    marginRight: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default AIScanButton;