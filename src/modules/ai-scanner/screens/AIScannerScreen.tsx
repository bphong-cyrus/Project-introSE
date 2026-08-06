// SmartSpend AI - AI Scanner Screen (Frame 9)
// UC13: AI Receipt Scanner Entry
//
// This screen captures a photo of a receipt (via camera or gallery) using
// expo-image-picker, sends the image to the Gemini API (vision model), and
// forwards the structured extraction result to AIResultScreen for review.
//
// The previous mock implementation (random amounts, hard-coded "Cửa hàng")
// has been replaced by:
//   - services/imageHelper.ts       : camera/gallery + base64 conversion
//   - services/backendClient.ts     : HTTP client -> Express backend
//   - services/receiptAnalyzer.ts   : façade that maps mobile types
//   - services/aiConfig.ts          : backend URL config
//
// Gemini itself lives on the server (src/backend/src/services/geminiClient.js)
// so the API key never ships in the mobile bundle.

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
import { useCategories } from '../../../state/CategoryContext';
import CameraViewfinder from '../components/CameraViewfinder';
import ProcessingOverlay from '../components/ProcessingOverlay';
import {
  pickFromCamera,
  pickFromGallery,
  PickedImage,
} from '../services/imageHelper';
import {
  analyzeReceipt,
  GeminiApiError,
} from '../services/receiptAnalyzer';
import { pingBackend } from '../services/backendClient';
import { API_BASE_URL } from '../services/aiConfig';

interface AIScannerScreenProps {
  onClose: () => void;
  onCapture: (data: ExtractedReceiptData) => void;
}

export interface ExtractedReceiptData {
  amount: number;
  /** Signed amount read by OCR: negative = expense, positive = income. */
  signedAmount?: number;
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
    overall?: number;
  };
  overallConfidence?: number;
  missingFields?: string[];
  needsManualReview?: boolean;
  autoApproved?: boolean;
}

type PermissionState = 'pending' | 'granted' | 'denied';

const AIScannerScreen: React.FC<AIScannerScreenProps> = ({ onClose, onCapture }) => {
  const { allCategories } = useCategories();
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastImageUri, setLastImageUri] = useState<string | undefined>(undefined);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await import('expo-image-picker').then((m) =>
        m.getCameraPermissionsAsync(),
      );
      if (cancelled) return;
      setCameraPermission(status === 'granted' ? 'granted' : 'pending');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Probe the backend on mount so we can warn early if it's unreachable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ping = await pingBackend();
      if (!cancelled) setBackendReady(ping.ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------- Handlers -------------------------------- */

  const runAnalysis = useCallback(
    async (image: PickedImage) => {
      setIsProcessing(true);
      try {
        const result = await analyzeReceipt({
          base64: image.base64,
          mediaType: image.mediaType,
          uri: image.uri,
          categories: allCategories,
        });

        onCapture(result.data);
      } catch (err: any) {
        const title =
          err instanceof GeminiApiError ? 'Lỗi AI Scanner' : 'Không thể phân tích hóa đơn';
        const detail =
          err?.message ||
          'Đã có lỗi khi gọi backend. Vui lòng kiểm tra kết nối mạng và thử lại.';
        Alert.alert(title, detail, [
          { text: 'Thử lại', onPress: () => {} },
          { text: 'Đóng', style: 'cancel' },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [allCategories, onCapture],
  );

  const handleCapture = useCallback(async () => {
    if (cameraPermission === 'denied') {
      Alert.alert(
        'Quyền truy cập Camera bị từ chối',
        'Vui lòng bật trong Cài đặt hoặc chọn ảnh từ Thư viện',
        [{ text: 'OK' }],
      );
      return;
    }

    let image: PickedImage | null = null;
    try {
      image = await pickFromCamera();
    } catch (e: any) {
      Alert.alert('Lỗi camera', e?.message ?? 'Không thể mở camera.', [{ text: 'OK' }]);
      return;
    }
    if (!image) return; // user cancelled

    setCameraPermission('granted');
    setLastImageUri(image.uri);
    await runAnalysis(image);
  }, [cameraPermission, runAnalysis]);

  const handleChooseFromGallery = useCallback(async () => {
    let image: PickedImage | null = null;
    try {
      image = await pickFromGallery();
    } catch (e: any) {
      Alert.alert('Lỗi thư viện ảnh', e?.message ?? 'Không thể mở thư viện ảnh.', [
        { text: 'OK' },
      ]);
      return;
    }
    if (!image) return;

    setLastImageUri(image.uri);
    await runAnalysis(image);
  }, [runAnalysis]);

  /* ------------------------------ Render --------------------------------- */

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
          hasPermission={cameraPermission !== 'denied'}
          onRequestPermission={() => setCameraPermission('granted')}
        />

        {/* Capture Controls */}
        <View style={styles.captureControls}>
          <TouchableOpacity
            style={styles.folderButton}
            onPress={handleChooseFromGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

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

          <View style={styles.folderButton} />
        </View>

        {/* Status hint */}
        {lastImageUri ? (
          <View style={styles.statusBox}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.statusText}>Đã chụp ảnh, AI đang phân tích...</Text>
          </View>
        ) : null}

        {/* Backend status hint */}
        {backendReady === false ? (
          <View style={[styles.statusBox, styles.statusBoxWarn]}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
            <Text style={[styles.statusText, { color: Colors.warning }]}>
              Không kết nối được tới backend ({API_BASE_URL}). Hãy chạy `npm start` trong thư mục backend/.
            </Text>
          </View>
        ) : null}

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
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
    paddingHorizontal: 12,
  },
  statusBoxWarn: {
    backgroundColor: '#FFF7E0',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  statusText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500',
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
