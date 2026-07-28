// SmartSpend AI - AI Scanner Screen (Frame 9)
// UC13: AI Receipt Scanner Entry
// Note: Image picker requires expo-image-picker package (install when ready for production)

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import CameraViewfinder from '../components/CameraViewfinder';
import ProcessingOverlay from '../components/ProcessingOverlay';

interface AIScannerScreenProps {
  onClose: () => void;
  onCapture: (mockData: ExtractedReceiptData) => void;
}

export interface ExtractedReceiptData {
  amount: number;
  storeName: string;
  date: Date;
  categoryId: string;
  categoryName: string;
  note?: string;
  imageUri?: string;
  type: 'income' | 'expense';
  confidence: {
    amount: number;
    storeName: number;
    date: number;
    category: number;
    type: number;
  };
}

type PermissionState = 'pending' | 'granted' | 'denied';

const AIScannerScreen: React.FC<AIScannerScreenProps> = ({ onClose, onCapture }) => {
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('pending');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Simulate permission granted for demo
    setTimeout(() => {
      setCameraPermission('granted');
    }, 500);
  }, []);

  const handleCapture = useCallback(() => {
    if (cameraPermission === 'denied') {
      Alert.alert(
        'Quyền truy cập Camera bị từ chối',
        'Vui lòng bật trong Cài đặt hoặc chọn ảnh từ Thư viện',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsProcessing(true);

    // Simulate AI processing with mock data
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;

      setIsProcessing(false);

      if (isSuccess) {
        const isExpense = Math.random() > 0.15;
        const mockData: ExtractedReceiptData = {
          amount: Math.floor(Math.random() * 500000) + 50000,
          storeName: 'Cửa hàng',
          date: new Date(),
          categoryId: isExpense ? 'exp-cat-1' : 'inc-cat-1',
          categoryName: isExpense ? 'Ăn uống' : 'Thu nhập khác',
          note: '',
          type: isExpense ? 'expense' : 'income',
          confidence: {
            amount: Math.floor(Math.random() * 15) + 80,
            storeName: Math.floor(Math.random() * 15) + 80,
            date: Math.floor(Math.random() * 15) + 80,
            category: Math.floor(Math.random() * 15) + 75,
            type: Math.floor(Math.random() * 15) + 80,
          },
        };
        onCapture(mockData);
      } else {
        Alert.alert(
          'Không thể nhận diện hình ảnh',
          'Vui lòng chụp lại hoặc chọn ảnh khác',
          [
            { text: 'Thử lại', onPress: () => {} },
          ]
        );
      }
    }, 2500);
  }, [cameraPermission, onCapture]);

  const handleChooseFromGallery = useCallback(() => {
    Alert.alert(
      'Chọn ảnh từ thư viện',
      'Tính năng chọn ảnh từ thư viện sẽ khả dụng khi cài đặt expo-image-picker.\n\nHiện tại đang dùng mock data để demo.',
      [
        { text: 'OK', onPress: () => {} },
        { text: 'Dùng mock data', onPress: () => {
          setIsProcessing(true);
          setTimeout(() => {
            setIsProcessing(false);
            const isExpense = Math.random() > 0.15;
            const mockData: ExtractedReceiptData = {
              amount: 235000,
              storeName: 'Circle K',
              date: new Date(),
              categoryId: isExpense ? 'exp-cat-1' : 'inc-cat-1',
              categoryName: isExpense ? 'Ăn uống' : 'Thu nhập khác',
              note: 'Nước uống + snack',
              type: isExpense ? 'expense' : 'income',
              confidence: {
                amount: 87,
                storeName: 92,
                date: 88,
                category: 85,
                type: 90,
              },
            };
            onCapture(mockData);
          }, 2000);
        }},
      ]
    );
  }, [onCapture]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
          <Text style={styles.closeText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QUÉT HÓA ĐƠN</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Camera Viewfinder - 3:4 portrait ratio */}
        <CameraViewfinder
          hasPermission={cameraPermission === 'granted'}
          onRequestPermission={() => {}}
        />

        {/* Capture Controls */}
        <View style={styles.captureControls}>
          {/* Folder/Gallery Button */}
          <TouchableOpacity
            style={styles.folderButton}
            onPress={handleChooseFromGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={[
              styles.captureButton,
              cameraPermission === 'denied' && styles.captureButtonDisabled,
            ]}
            onPress={handleCapture}
            activeOpacity={0.8}
            disabled={cameraPermission === 'denied'}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          {/* Spacer for symmetry */}
          <View style={styles.folderButton} />
        </View>

        {/* Processing Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Mẹo chụp ảnh tốt</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Đảm bảo ánh sáng đầy đủ</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Giữ hóa đơn phẳng, không nhăn</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Chụp rõ tổng tiền và tên cửa hàng</Text>
          </View>
        </View>
      </ScrollView>

      {/* Processing Overlay */}
      {isProcessing && <ProcessingOverlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeButton: {
    padding: 4,
    minWidth: 60,
  },
  closeText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  headerRight: {
    minWidth: 60,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  captureControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  folderButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 40,
  },
  captureButtonDisabled: {
    borderColor: Colors.border,
    opacity: 0.4,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
  },
  tipsSection: {
    marginTop: 32,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginRight: 8,
    width: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

export default AIScannerScreen;