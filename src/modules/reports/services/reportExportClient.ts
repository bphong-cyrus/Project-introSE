import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../data/datasources/supabase/supabase';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../ai-scanner/services/aiConfig';

export type MonthlyReportExportResponse = {
  exportId: string;
  fileName: string;
  downloadPath: string;
  downloadUrl: string;
  summary: {
    month: number;
    year: number;
    transactionCount: number;
    incomeTransactionCount: number;
    totalIncome: number;
    totalExpense: number;
    totalBudget: number;
    generatedAt: string;
  };
};

export class ReportExportError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ReportExportError';
    this.status = status;
  }
}

const REPORT_ENDPOINTS = {
  export: `${API_BASE_URL}/api/reports/export`,
  download: (exportId: string) => `${API_BASE_URL}/api/reports/exports/${exportId}/download`,
};

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ReportExportError(error.message, 401);
  const token = data.session?.access_token;
  if (!token) throw new ReportExportError('Bạn cần đăng nhập để xuất báo cáo.', 401);
  return token;
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonError(response: Response) {
  try {
    const body = await response.json();
    return body?.error || `Backend trả về HTTP ${response.status}`;
  } catch {
    return `Backend trả về HTTP ${response.status}`;
  }
}

export async function createMonthlyExcelReport(month: number, year: number): Promise<MonthlyReportExportResponse> {
  const token = await getAccessToken();
  let response: Response;

  try {
    response = await fetchWithTimeout(REPORT_ENDPOINTS.export, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ month, year }),
    }, 120_000);
  } catch (error: any) {
    throw new ReportExportError(
      `Không kết nối được tới backend export (${error?.message || 'network error'}). Hãy kiểm tra server ở ${API_BASE_URL}.`,
      0,
    );
  }

  if (!response.ok) {
    throw new ReportExportError(await parseJsonError(response), response.status);
  }

  const body = await response.json();
  if (!body?.success || !body?.data?.exportId) {
    throw new ReportExportError('Backend trả về payload export không hợp lệ.', response.status);
  }

  return body.data as MonthlyReportExportResponse;
}

export async function downloadMonthlyExcelReport(exportId: string, fileName: string): Promise<string> {
  const token = await getAccessToken();
  const url = REPORT_ENDPOINTS.download(exportId);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const response = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    }, 120_000);
    if (!response.ok) {
      throw new ReportExportError(await parseJsonError(response), response.status);
    }

    const blob = await response.blob();
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
    throw new ReportExportError('Không tìm thấy thư mục lưu file trên thiết bị.', 0);
  }

  const localUri = `${baseDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(url, localUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new ReportExportError(`Không thể tải báo cáo. HTTP ${result.status}`, result.status);
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
      dialogTitle: 'Chia sẻ báo cáo SmartSpend AI',
    });
  } else {
    Alert.alert('Đã tải báo cáo', `File đã được lưu tại:\n${result.uri}`);
  }

  return result.uri;
}
