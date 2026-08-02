// SmartSpend AI - Image Helper Service
// Bridges expo-image-picker output -> { base64, mediaType } for the backend HTTP client.

import * as ImagePicker from 'expo-image-picker';

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
    quality: 0.8, // compress to stay under the 4 MB upload limit
    base64: true,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  return normalizeAsset(result.assets[0]);
}

export async function pickFromGallery(): Promise<PickedImage | null> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  return normalizeAsset(result.assets[0]);
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