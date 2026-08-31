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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';
import { useCategories } from '../../../state/CategoryContext';
import { supabase } from '../../../data/datasources/supabase/supabase';
import CameraViewfinder from '../components/CameraViewfinder';
import ProcessingOverlay from '../components/ProcessingOverlay';
import {
  pickRawFromCamera,
  pickRawFromGallery,
  prepareImageForAnalysis,
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

const getAverageConfidenceScore = (confidence: ExtractedReceiptData['confidence']) => {
  const values = Object.values(confidence)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  // Clamp to valid range (0 to 1 for confidence scores)
  return Math.min(1, Math.max(0, avg));
};

const getImageExtension = (mediaType: string) => {
  switch (mediaType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
};

const getModelName = (raw: string) => {
  const match = raw.match(/^model=([^\r\n]+)/);
  return match?.[1] || null;
};

const uploadReceiptImageForLog = async (userId: string, image: PickedImage) => {
  try {
    const response = await fetch(image.uri);
    const blob = await response.blob();
    const extension = getImageExtension(image.mediaType);
    const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const { error } = await supabase.storage
      .from('receipt-images')
      .upload(storagePath, blob, {
        contentType: image.mediaType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('receipt-images').getPublicUrl(storagePath);
    return data.publicUrl || image.uri;
  } catch (error) {
    console.warn('Không thể upload ảnh receipt cho scan log:', error);
    return image.uri || null;
  }
};

const saveAiScanLog = async (params: {
  userId?: string;
  image: PickedImage;
  status: 'success' | 'failed';
  processingTimeMs: number;
  data?: ExtractedReceiptData;
  raw?: string;
  errorCode?: string;
  errorMessage?: string;
}) => {
  if (!params.userId) return;

  try {
    const imageUrl = await uploadReceiptImageForLog(params.userId, params.image);
    const extractedFields = params.data
      ? {
          amount: params.data.amount,
          merchantName: params.data.storeName,
          date: params.data.date.toISOString(),
          categoryId: params.data.categoryId,
          categoryName: params.data.categoryName,
          type: params.data.type,
          confidence: params.data.confidence,
          note: params.data.note || null,
        }
      : null;

    // Clamp amount to database constraint (precision 3, scale 2 = max 9.99)
    const clampedAmount = params.data?.amount != null
      ? Math.min(9.99, Math.max(-9.99, params.data.amount))
      : null;

    const { error } = await supabase.from('scan_logs').insert({
      user_id: params.userId,
      receipt_id: null,
      ocr_result_id: null,
      status: params.status,
      extracted_amount: clampedAmount,
      extracted_merchant: params.data?.storeName ?? null,
      suggested_category_id: params.data?.categoryId ?? null,
      final_category_id: params.data?.categoryId ?? null,
      confidence_score: params.data ? getAverageConfidenceScore(params.data.confidence) : null,
      error_code: params.errorCode || null,
      error_message: params.errorMessage || null,
      is_reviewed: false,
      raw_receipt_image_url: imageUrl,
      raw_text: params.raw || null,
      extracted_fields: extractedFields,
      model_name: params.raw ? getModelName(params.raw) : null,
      processing_time_ms: params.processingTimeMs,
    });

    if (error) throw error;
  } catch (error) {
    console.warn('Không thể ghi scan log AI:', error);
  }
};

const AIScannerScreen: React.FC<AIScannerScreenProps> = ({ onClose, onCapture }) => {
  const { user } = useAuth();
  const { allCategories } = useCategories();
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastImageUri, setLastImageUri] = useState<string | undefined>(undefined);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [imageFileSize, setImageFileSize] = useState<number | undefined>(undefined);
  const processingStartedAtRef = useRef<number | undefined>(undefined);

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

  const resetProcessingState = useCallback(() => {
    processingStartedAtRef.current = undefined;
    setIsProcessing(false);
    setImageFileSize(undefined);
  }, []);

  const showProcessingBeforeImageWork = useCallback(
    async (asset: { fileSize?: number; base64?: string | null }) => {
      const startedAt = Date.now();
      processingStartedAtRef.current = startedAt;
      const fileSize = asset.fileSize ?? (asset.base64
        ? Math.round((asset.base64.length * 3) / 4)
        : undefined);

      setImageFileSize(fileSize);
      setIsProcessing(true);

      // Yield long enough for React Native to paint the overlay before the
      // image manipulation task starts.
      await new Promise<void>((resolve) => setTimeout(resolve, 32));
    },
    [],
  );

  const runAnalysis = useCallback(
    async (image: PickedImage) => {
      const startedAt = processingStartedAtRef.current ?? Date.now();
      processingStartedAtRef.current = startedAt;
      // Track file size for display
      const fileSize = image.fileSize ?? (image.base64
        ? Math.round((image.base64.length * 3) / 4)
        : undefined);
      setImageFileSize(fileSize);
      setIsProcessing(true);
      try {
        const result = await analyzeReceipt({
          base64: image.base64,
          mediaType: image.mediaType,
          uri: image.uri,
          categories: allCategories,
        });

        // Logging/uploading the receipt must not delay the result screen.
        void saveAiScanLog({
          userId: user?.id,
          image,
          status: 'success',
          processingTimeMs: Date.now() - startedAt,
          data: result.data,
          raw: result.raw,
        });

        onCapture(result.data);
      } catch (err: any) {
        const title =
          err instanceof GeminiApiError ? 'Lỗi AI Scanner' : 'Không thể phân tích hóa đơn';
        const detail =
          err?.message ||
          'Đã có lỗi khi gọi backend. Vui lòng kiểm tra kết nối mạng và thử lại.';

        void saveAiScanLog({
          userId: user?.id,
          image,
          status: 'failed',
          processingTimeMs: Date.now() - startedAt,
          errorCode: err instanceof GeminiApiError && err.status ? `HTTP_${err.status}` : 'AI_SCAN_ERROR',
          errorMessage: detail,
        });

        Alert.alert(title, detail, [
          { text: 'Thử lại', onPress: () => { void runAnalysis(image); } },
          { text: 'Đóng', style: 'cancel' },
        ]);
      } finally {
        resetProcessingState();
      }
    },
    [allCategories, onCapture, resetProcessingState, user?.id],
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

    let rawImage: ImagePickerAsset | null = null;
    let image: PickedImage | null = null;
    try {
      rawImage = await pickRawFromCamera();
      if (rawImage) {
        await showProcessingBeforeImageWork(rawImage);
        image = await prepareImageForAnalysis(rawImage);
      }
    } catch (e: any) {
      resetProcessingState();
      Alert.alert('Lỗi camera', e?.message ?? 'Không thể mở camera.', [{ text: 'OK' }]);
      return;
    }
    if (!image) {
      resetProcessingState();
      return;
    }

    setCameraPermission('granted');
    setLastImageUri(image.uri);
    await runAnalysis(image);
  }, [cameraPermission, runAnalysis]);

  const handleChooseFromGallery = useCallback(async () => {
    let rawImage: ImagePickerAsset | null = null;
    let image: PickedImage | null = null;
    try {
      rawImage = await pickRawFromGallery();
      if (rawImage) {
        await showProcessingBeforeImageWork(rawImage);
        image = await prepareImageForAnalysis(rawImage);
      }
    } catch (e: any) {
      resetProcessingState();
      Alert.alert('Lỗi thư viện ảnh', e?.message ?? 'Không thể mở thư viện ảnh.', [
        { text: 'OK' },
      ]);
      return;
    }
    if (!image) {
      resetProcessingState();
      return;
    }

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
            disabled={isProcessing}
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
            disabled={cameraPermission === 'denied' || isProcessing}
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
      {isProcessing && (
        <ProcessingOverlay
          fileSize={imageFileSize}
        />
      )}
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
