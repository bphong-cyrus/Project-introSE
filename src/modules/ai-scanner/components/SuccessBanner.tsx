// SmartSpend AI - Success Banner Component
// Frame 10: Top success banner after AI scan

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

const SuccessBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Nhận diện hóa đơn AI thành công</Text>
        <Text style={styles.subtitle}>Công nghệ OCR thông minh đã trích xuất dữ liệu tự động.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D5C47',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#2A9D8F',
    lineHeight: 16,
  },
});

export default SuccessBanner;