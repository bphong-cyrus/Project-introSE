// SmartSpend AI - OCR status banner shown on the result screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

interface SuccessBannerProps {
  needsManualReview?: boolean;
  overallConfidence?: number;
  missingFields?: string[];
}

const SuccessBanner: React.FC<SuccessBannerProps> = ({
  needsManualReview = false,
  overallConfidence = 0,
  missingFields = [],
}) => {
  const labels: Record<string, string> = {
    amount: 'số tiền',
    storeName: 'tên cửa hàng/người chuyển',
    date: 'ngày',
    category: 'danh mục',
    type: 'loại giao dịch',
  };
  const missingLabel = missingFields.map((field) => labels[field] || field).join(', ');

  return (
  <View style={[styles.banner, needsManualReview && styles.warningBanner]}>
    <View style={styles.iconContainer}>
      <Ionicons
        name={needsManualReview ? 'alert-circle' : 'checkmark-circle'}
        size={28}
        color={needsManualReview ? Colors.warning : Colors.success}
      />
    </View>
    <View style={styles.textContainer}>
      <Text style={[styles.title, needsManualReview && styles.warningTitle]}>
        {needsManualReview ? 'Cần kiểm tra thông tin OCR' : 'Nhận diện hóa đơn AI thành công'}
      </Text>
      <Text style={[styles.subtitle, needsManualReview && styles.warningSubtitle]}>
        {needsManualReview
          ? `Độ tin cậy ${overallConfidence}%. Vui lòng kiểm tra: ${missingLabel || 'các trường có điểm thấp'}.`
          : 'OCR đã trích xuất đủ trường và phân loại giao dịch tự động.'}
      </Text>
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
  warningBanner: {
    backgroundColor: '#FFF7E0',
    borderColor: '#F5D58A',
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
  warningTitle: {
    color: '#8A5A00',
  },
  subtitle: {
    fontSize: 12,
    color: '#2A9D8F',
    lineHeight: 16,
  },
  warningSubtitle: {
    color: '#8A5A00',
  },
});

export default SuccessBanner;
