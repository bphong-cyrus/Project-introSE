import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export class CsvReportExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvReportExportError';
  }
}

export async function saveAndShareCsvReport(fileName: string, csvContent: string): Promise<string> {
  const contentWithBom = `\uFEFF${csvContent}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const blob = new Blob([contentWithBom], { type: 'text/csv;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    return fileName;
  }

  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new CsvReportExportError('Không tìm thấy thư mục lưu file CSV trên thiết bị.');
  }

  const localUri = `${baseDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(localUri, contentWithBom, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(localUri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Chia sẻ báo cáo CSV SmartSpend AI',
    });
  } else {
    Alert.alert('Đã tạo báo cáo CSV', `File đã được lưu tại:\n${localUri}`);
  }

  return localUri;
}
