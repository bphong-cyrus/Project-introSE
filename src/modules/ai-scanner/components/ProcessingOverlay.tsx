// SmartSpend AI - Processing Overlay Component
// UC13: AI processing loading state
// Performance: Shows elapsed time and file size info for better UX

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../../shared/constants/colors';

export interface ProcessingOverlayProps {
  fileSize?: number; // in bytes
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  fileSize,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.title}>Đang xử lý hóa đơn với AI...</Text>
        <Text style={styles.subtitle}>Vui lòng đợi trong giây lát</Text>

        {/* Processing details */}
        <View style={styles.detailsContainer}>
          {fileSize ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kích thước ảnh:</Text>
              <Text style={styles.detailValue}>{formatFileSize(fileSize)}</Text>
            </View>
          ) : null}

        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  detailsContainer: {
    marginTop: 20,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default ProcessingOverlay;
