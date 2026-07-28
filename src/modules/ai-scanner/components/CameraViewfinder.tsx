// SmartSpend AI - Camera Viewfinder Component
// Frame 9: 3:4 portrait viewfinder with corner alignment guides

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../shared/constants/colors';

interface CameraViewfinderProps {
  hasPermission: boolean;
  onRequestPermission: () => void;
}

const CameraViewfinder: React.FC<CameraViewfinderProps> = ({ hasPermission }) => {
  return (
    <View style={styles.container}>
      {/* 3:4 Aspect Ratio Frame (portrait) */}
      <View style={styles.viewfinder}>
        {/* Dark background - simulates camera feed area */}
        <View style={styles.cameraFeed}>
          {/* Corner alignment guides - top-left */}
          <View style={[styles.corner, styles.cornerTopLeft]} />
          {/* Corner alignment guides - top-right */}
          <View style={[styles.corner, styles.cornerTopRight]} />
          {/* Corner alignment guides - bottom-left */}
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          {/* Corner alignment guides - bottom-right */}
          <View style={[styles.corner, styles.cornerBottomRight]} />

          {/* Instruction text */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {hasPermission
                ? 'Đặt hóa đơn cân đối trong khung hình'
                : 'Đang chờ quyền truy cập camera...'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 3 / 4, // Portrait ratio
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  cameraFeed: {
    flex: 1,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  cornerTopLeft: {
    top: 20,
    left: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 20,
    right: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
});

export default CameraViewfinder;