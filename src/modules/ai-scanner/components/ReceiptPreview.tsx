// SmartSpend AI - Receipt Preview Component
// Frame 10: Collapsible receipt preview thumbnail

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

interface ReceiptPreviewProps {
  storeName: string;
  dateString: string;
  confidenceLevel: number;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ storeName, dateString, confidenceLevel }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>BẢN XEM TRƯỚC HÓA ĐƠN</Text>
        <View style={styles.ocrBadge}>
          <Text style={styles.ocrBadgeText}>OCR confident</Text>
        </View>
      </TouchableOpacity>

      {/* Receipt thumbnail */}
      {expanded && (
        <View style={styles.previewCard}>
          <View style={styles.thumbnail}>
            {/* Placeholder receipt icon */}
            <View style={styles.thumbnailContent}>
              <View style={styles.thumbnailRow} />
              <View style={styles.thumbnailRow} />
              <View style={styles.thumbnailRowShort} />
              <View style={styles.thumbnailRow} />
              <View style={styles.thumbnailRowShort} />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.dateText}>
              {dateString} • confidence level {confidenceLevel}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  ocrBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ocrBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976D2',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 64,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  thumbnailContent: {
    width: '70%',
    height: '70%',
    justifyContent: 'space-around',
  },
  thumbnailRow: {
    height: 4,
    backgroundColor: '#BDBDBD',
    borderRadius: 2,
  },
  thumbnailRowShort: {
    height: 4,
    backgroundColor: '#BDBDBD',
    borderRadius: 2,
    width: '60%',
  },
  infoContainer: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default ReceiptPreview;