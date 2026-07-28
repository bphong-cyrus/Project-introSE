// SmartSpend AI - Processing Overlay Component
// UC13: AI processing loading state

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../../shared/constants/colors';

const ProcessingOverlay: React.FC = () => {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.title}>Đang xử lý hóa đơn với AI...</Text>
        <Text style={styles.subtitle}>Vui lòng đợi trong giây lát</Text>
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
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
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
});

export default ProcessingOverlay;