// SmartSpend AI - Image Helper Service
// Bridges expo-image-picker output -> { base64, mediaType } for the backend HTTP client.
// Performance optimized: adaptive compression based on image size for faster AI processing

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface PickedImage {
  base64: string;
  mediaType: string; // image/jpeg | image/png | image/webp | image/gif
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export type BeforeImageProcessing = (
  asset: ImagePicker.ImagePickerAsset,
) => void | Promise<void>;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/jpeg',
  heif: 'image/jpeg',
};

// Image dimension limits (optimized for AI processing speed)
const MAX_IMAGE_SIZE = 1600; // Enough detail for OCR without oversized uploads
const SMALL_IMAGE_SIZE = 800; // Threshold for smaller compression
const TINY_IMAGE_SIZE = 400;  // Threshold for minimal compression

// Adaptive compression quality based on image characteristics
interface CompressionConfig {
  quality: number;
  maxDimension: number;
  description: string;
}

// Different compression presets for different use cases
const COMPRESSION_PRESETS = {
  // Small images (< 400px): Keep quality high
  tiny: {
    quality: 0.9,
    maxDimension: TINY_IMAGE_SIZE,
    description: 'small receipt',
  },
  // Medium images (< 800px): Balanced quality/size
  small: {
    quality: 0.8,
    maxDimension: SMALL_IMAGE_SIZE,
    description: 'medium receipt',
  },
  // Large images (801-1600px): balanced OCR detail and upload size
  large: {
    quality: 0.72,
    maxDimension: MAX_IMAGE_SIZE,
    description: 'large receipt',
  },
  // Very large images (> 1600px): resize and compress before upload
  xlarge: {
    quality: 0.65,
    maxDimension: MAX_IMAGE_SIZE,
    description: 'very large receipt',
  },
};

/**
 * Get the appropriate compression preset based on image dimensions
 */
function getCompressionPreset(width?: number, height?: number, _fileSize?: number): CompressionConfig {
  const maxDim = Math.max(width || 0, height || 0);

  // Dimension-based fallbacks
  if (maxDim <= TINY_IMAGE_SIZE) {
    return COMPRESSION_PRESETS.tiny;
  }
  if (maxDim <= SMALL_IMAGE_SIZE) {
    return COMPRESSION_PRESETS.small;
  }
  if (maxDim <= MAX_IMAGE_SIZE) {
    return COMPRESSION_PRESETS.large;
  }
  return COMPRESSION_PRESETS.xlarge;
}

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

export async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/* -------------------------------------------------------------------------- */
/* Picking                                                                    */
/* -------------------------------------------------------------------------- */

export async function pickRawFromCamera(): Promise<ImagePicker.ImagePickerAsset | null> {
  const granted = await ensureCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1.0, // Chất lượng cao trước, resize sau bằng ImageManipulator
    // Avoid encoding the original full-resolution image before the loading
    // overlay can be shown. The processed image is encoded below instead.
    base64: false,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
}

export async function pickRawFromGallery(): Promise<ImagePicker.ImagePickerAsset | null> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1.0, // Chất lượng cao trước, resize sau bằng ImageManipulator
    // Avoid encoding the original full-resolution image before the loading
    // overlay can be shown. The processed image is encoded below instead.
    base64: false,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0];
}

export async function prepareImageForAnalysis(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PickedImage> {
  // Resize ảnh nếu cần thiết để giảm kích thước file
  return resizeImageIfNeeded(asset);
}

export async function pickFromCamera(
  beforeProcessing?: BeforeImageProcessing,
): Promise<PickedImage | null> {
  const asset = await pickRawFromCamera();
  if (!asset) return null;

  // Let the screen show its loading state before the potentially expensive
  // resize/compression step starts.
  await beforeProcessing?.(asset);

  // Resize ảnh nếu cần thiết để giảm kích thước file
  return prepareImageForAnalysis(asset);
}

export async function pickFromGallery(
  beforeProcessing?: BeforeImageProcessing,
): Promise<PickedImage | null> {
  const asset = await pickRawFromGallery();
  if (!asset) return null;

  // Let the screen show its loading state before the potentially expensive
  // resize/compression step starts.
  await beforeProcessing?.(asset);

  // Resize ảnh nếu cần thiết để giảm kích thước file
  return prepareImageForAnalysis(asset);
}

/* -------------------------------------------------------------------------- */
/* Image Resizing & Compression (Performance Optimized)                       */
/* -------------------------------------------------------------------------- */

/**
 * Resize and compress image based on its size for optimal AI processing time.
 * Uses adaptive compression to balance quality and speed.
 */
async function resizeImageIfNeeded(
  asset: ImagePicker.ImagePickerAsset
): Promise<PickedImage> {
  // Get compression preset based on image characteristics
  const preset = getCompressionPreset(
    asset.width,
    asset.height,
    asset.fileSize
  );

  const needsResize =
    (asset.width && asset.width > preset.maxDimension) ||
    (asset.height && asset.height > preset.maxDimension);

  // For images that don't need resizing, just apply compression
  if (!needsResize) {
    return compressImageWithPreset(asset, preset);
  }

  try {
    // Calculate new dimensions maintaining aspect ratio
    let targetWidth = asset.width ?? MAX_IMAGE_SIZE;
    let targetHeight = asset.height ?? MAX_IMAGE_SIZE;

    if (targetWidth > preset.maxDimension || targetHeight > preset.maxDimension) {
      const ratio = Math.min(
        preset.maxDimension / targetWidth,
        preset.maxDimension / targetHeight
      );
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      {
        compress: preset.quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    // Calculate approximate file size from base64
    const base64Length = manipulated.base64?.length ?? 0;
    const estimatedSize = Math.round((base64Length * 3) / 4);

    return {
      base64: manipulated.base64 ?? '',
      mediaType: 'image/jpeg',
      uri: manipulated.uri,
      width: manipulated.width,
      height: manipulated.height,
      fileSize: estimatedSize,
    };
  } catch (error) {
    console.warn('Resize thất bại, dùng ảnh gốc:', error);
    return compressImageWithPreset(asset, preset);
  }
}

/**
 * Compress image with specific preset
 */
async function compressImageWithPreset(
  asset: ImagePicker.ImagePickerAsset,
  preset: CompressionConfig
): Promise<PickedImage> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [], // No resize, just compress
      {
        compress: preset.quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    const processedBase64 = manipulated.base64 ?? '';
    if (!processedBase64) {
      return normalizeAssetWithBase64(asset);
    }

    // Calculate approximate file size from base64.
    const estimatedSize = Math.round((processedBase64.length * 3) / 4);
    const originalSize = asset.fileSize ?? (asset.base64
      ? Math.round((asset.base64.length * 3) / 4)
      : 0);

    // Re-encoding a very small PNG/WebP as JPEG can make it larger than the
    // original. Keep the original in that case; compression must never grow
    // the upload payload when no resize is needed.
    if (originalSize > 0 && estimatedSize >= originalSize) {
      return normalizeAssetWithBase64(asset);
    }

    return {
      base64: processedBase64,
      mediaType: 'image/jpeg',
      uri: manipulated.uri,
      width: manipulated.width || asset.width,
      height: manipulated.height || asset.height,
      fileSize: estimatedSize,
    };
  } catch (error) {
    // If compression fails, return original
    return normalizeAssetWithBase64(asset);
  }
}

async function normalizeAssetWithBase64(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PickedImage> {
  const normalized = normalizeAsset(asset);
  if (normalized.base64) return normalized;

  try {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      ...normalized,
      base64,
      fileSize: asset.fileSize ?? Math.round((base64.length * 3) / 4),
    };
  } catch (error) {
    console.warn('Không thể đọc ảnh gốc để tạo base64:', error);
    return normalized;
  }
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

function normalizeAsset(asset: ImagePicker.ImagePickerAsset): PickedImage {
  let base64 = asset.base64 ?? '';
  let mediaType = guessMime(asset.uri, asset.mimeType);

  // Strip the leading "data:<mime>;base64," prefix if the picker returned it
  // (defensive — most versions don't, but some web fallbacks do).
  if (base64.startsWith('data:')) {
    const commaIdx = base64.indexOf(',');
    if (commaIdx >= 0) {
      const meta = base64.slice(5, commaIdx); // "image/png;base64"
      const semi = meta.indexOf(';');
      if (semi > 0) mediaType = meta.slice(0, semi);
      base64 = base64.slice(commaIdx + 1);
    }
  }

  // Calculate file size from base64 if not provided
  let fileSize = asset.fileSize;
  if (!fileSize && base64) {
    fileSize = Math.round((base64.length * 3) / 4);
  }

  return {
    base64,
    mediaType,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize,
  };
}

function guessMime(uri: string, explicit?: string | null): string {
  if (explicit) return explicit;
  if (!uri) return 'image/jpeg';
  const cleaned = uri.split('?')[0];
  const dot = cleaned.lastIndexOf('.');
  if (dot < 0) return 'image/jpeg';
  const ext = cleaned.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'image/jpeg';
}

/* -------------------------------------------------------------------------- */
/* Performance Stats (for debugging/monitoring)                               */
/* -------------------------------------------------------------------------- */

interface ImageProcessingStats {
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
  compressionRatio: number;
  estimatedOriginalSize: number;
  estimatedProcessedSize: number;
  presetUsed: string;
}

export function calculateProcessingStats(
  original: ImagePicker.ImagePickerAsset,
  processed: PickedImage
): ImageProcessingStats {
  const originalSize = original.fileSize ?? (original.base64 ? Math.round((original.base64.length * 3) / 4) : 0);
  const processedSize = processed.fileSize ?? (processed.base64 ? Math.round((processed.base64.length * 3) / 4) : 0);

  return {
    originalWidth: original.width ?? 0,
    originalHeight: original.height ?? 0,
    processedWidth: processed.width ?? 0,
    processedHeight: processed.height ?? 0,
    compressionRatio: originalSize > 0 ? processedSize / originalSize : 1,
    estimatedOriginalSize: originalSize,
    estimatedProcessedSize: processedSize,
    presetUsed: getCompressionPreset(original.width, original.height, original.fileSize).description,
  };
}

export const __testing = {
  guessMime,
  normalizeAsset,
  normalizeAssetWithBase64,
  getCompressionPreset,
  calculateProcessingStats,
};
