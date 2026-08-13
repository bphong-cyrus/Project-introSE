// SmartSpend AI - Image Helper Service
// Bridges expo-image-picker output -> { base64, mediaType } for the backend HTTP client.

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface PickedImage {
  base64: string;
  mediaType: string; // image/jpeg | image/png | image/webp | image/gif
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/jpeg',
  heif: 'image/jpeg',
};

// Giới hạn kích thước ảnh tối đa
const MAX_IMAGE_SIZE = 1920; // pixels
const COMPRESSION_QUALITY = 0.7;

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

export async function pickFromCamera(): Promise<PickedImage | null> {
  const granted = await ensureCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1.0, // Chất lượng cao trước, resize sau bằng ImageManipulator
    base64: true,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  // Resize ảnh nếu cần thiết để giảm kích thước file
  return resizeImageIfNeeded(result.assets[0]);
}

export async function pickFromGallery(): Promise<PickedImage | null> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1.0, // Chất lượng cao trước, resize sau bằng ImageManipulator
    base64: true,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  // Resize ảnh nếu cần thiết để giảm kích thước file
  return resizeImageIfNeeded(result.assets[0]);
}

/* -------------------------------------------------------------------------- */
/* Image Resizing                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Resize ảnh nếu kích thước vượt quá giới hạn.
 * Sử dụng expo-image-manipulator để resize và nén ảnh.
 */
async function resizeImageIfNeeded(
  asset: ImagePicker.ImagePickerAsset
): Promise<PickedImage> {
  const needsResize =
    (asset.width && asset.width > MAX_IMAGE_SIZE) ||
    (asset.height && asset.height > MAX_IMAGE_SIZE);

  if (!needsResize) {
    // Ảnh nhỏ, chỉ nén nhẹ
    return compressImage(asset);
  }

  try {
    // Tính toán kích thước mới giữ nguyên tỷ lệ
    let targetWidth = asset.width ?? MAX_IMAGE_SIZE;
    let targetHeight = asset.height ?? MAX_IMAGE_SIZE;

    if (targetWidth > MAX_IMAGE_SIZE || targetHeight > MAX_IMAGE_SIZE) {
      const ratio = Math.min(MAX_IMAGE_SIZE / targetWidth, MAX_IMAGE_SIZE / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      base64: manipulated.base64 ?? '',
      mediaType: 'image/jpeg',
      uri: manipulated.uri,
      width: manipulated.width,
      height: manipulated.height,
      fileSize: undefined,
    };
  } catch (error) {
    console.warn('Resize thất bại, dùng ảnh gốc:', error);
    return compressImage(asset);
  }
}

/**
 * Nén ảnh nhỏ mà không resize
 */
async function compressImage(asset: ImagePicker.ImagePickerAsset): Promise<PickedImage> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [], // Không resize, chỉ nén
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      base64: manipulated.base64 ?? asset.base64 ?? '',
      mediaType: 'image/jpeg',
      uri: manipulated.uri,
      width: manipulated.width || asset.width,
      height: manipulated.height || asset.height,
      fileSize: undefined,
    };
  } catch (error) {
    // Nếu nén thất bại, trả về ảnh gốc
    return normalizeAsset(asset);
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

  return {
    base64,
    mediaType,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
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

export const __testing = { guessMime, normalizeAsset };