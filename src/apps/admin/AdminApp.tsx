// SmartSpend AI - Admin App Shell
// Web-first admin dashboard with Supabase realtime metrics.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { supabase, Database } from '../../data/datasources/supabase/supabase';
import AILogsPage from './pages/AILogsPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';
import NotificationsPage from './pages/NotificationsPage';
import UsersPage from './pages/UsersPage';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type ReceiptImageRow = Database['public']['Tables']['receipt_images']['Row'];
type ScanLogRow = Database['public']['Tables']['scan_logs']['Row'];
type OcrResultRow = Database['public']['Tables']['ocr_results']['Row'];
type RecommendationRunRow = Database['public']['Tables']['recommendation_runs']['Row'];
type FeedbackRow = Database['public']['Tables']['feedbacks']['Row'];
type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationCampaignRow = Database['public']['Tables']['notification_campaigns']['Row'];
type NotificationCampaignTargetRow = Database['public']['Tables']['notification_campaign_targets']['Row'];
type UserNotificationSettingsRow = Database['public']['Tables']['user_notification_settings']['Row'];
type AuthUserRow = Database['public']['Functions']['get_admin_auth_users']['Returns'][number];

type AdminAuthState = 'loading' | 'unauthenticated' | 'authenticated' | 'denied';
type AdminSection = 'dashboard' | 'users' | 'notifications' | 'ai_logs' | 'feedback';
type DashboardTimeRange = 'month' | 'last_7_days' | 'last_30_days';
type UserStatusFilter = 'all' | 'active' | 'inactive';
type AiLogStatusFilter = 'all' | 'success' | 'failed' | 'reviewed' | 'unreviewed';
type FeedbackStatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type FeedbackTypeFilter = 'all' | 'bug' | 'suggestion' | 'question';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
type CampaignAudience = 'all_users' | 'specific_users';
type CampaignDelivery = 'now' | 'scheduled';

type DashboardData = {
  authUsers: AuthUserRow[];
  categories: CategoryRow[];
  profiles: ProfileRow[];
  transactions: TransactionRow[];
  receipts: ReceiptRow[];
  receiptImages: ReceiptImageRow[];
  scans: ScanLogRow[];
  ocrResults: OcrResultRow[];
  recommendationRuns: RecommendationRunRow[];
  feedbacks: FeedbackRow[];
  auditLogs: AuditLogRow[];
  notifications: NotificationRow[];
  notificationCampaigns: NotificationCampaignRow[];
  notificationTargets: NotificationCampaignTargetRow[];
  notificationSettings: UserNotificationSettingsRow[];
};

type TrendPoint = {
  label: string;
  totalUsers: number;
};

type UserManagementRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  status: string;
  isAdmin: boolean;
  joinDate: string | null;
  lastActive: string | null;
  totalTransactions: number;
  manualTransactions: number;
  aiTransactions: number;
  scanLogs: number;
  feedbacks: number;
  authUser: AuthUserRow | null;
  profile: ProfileRow | null;
};

type AdminEditProfileForm = {
  fullName: string;
  dateOfBirth: string;
  job: string;
  income: string;
};

const EMPTY_DATA: DashboardData = {
  authUsers: [],
  categories: [],
  profiles: [],
  transactions: [],
  receipts: [],
  receiptImages: [],
  scans: [],
  ocrResults: [],
  recommendationRuns: [],
  feedbacks: [],
  auditLogs: [],
  notifications: [],
  notificationCampaigns: [],
  notificationTargets: [],
  notificationSettings: [],
};

const ADMIN_COLORS = {
  primary: '#059669',
  primaryLight: '#D1FAE5',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
  info: '#2563EB',
  purple: '#7C3AED',
};

const monthNames = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const FEEDBACK_PRIORITY_OPTIONS: { value: FeedbackPriority; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'critical', label: 'Khẩn cấp' },
];

const FEEDBACK_RELATED_MODULES = [
  'AI Scanner',
  'Budget',
  'Transactions',
  'Auth',
  'Notification',
  'Report',
  'Other',
];

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  ai_scanner: 'Lỗi Quét Hóa Đơn (AI Scanner)',
  budget: 'Lỗi Quản Lý Ngân Sách (Budget)',
  transactions: 'Lỗi Lịch Sử Giao Dịch (Transactions)',
  auth: 'Lỗi Đăng Nhập / Tài Khoản (Auth)',
  suggestion: 'Góp Ý Tính Năng Mới (Suggestion)',
  other: 'Khác (Other)',
};

const authUserFields = [
  'uid',
  'display_name',
  'email',
  'phone',
  'providers',
  'provider_type',
  'created_at',
  'last_sign_in_at',
] as const;

const getInitialAdminSection = (): AdminSection => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/users')) {
    return 'users';
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/notifications')) {
    return 'notifications';
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/ai-logs')) {
    return 'ai_logs';
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/feedback')) {
    return 'feedback';
  }

  return 'dashboard';
};

const getCanonicalStatus = (status?: string | null): 'active' | 'inactive' => {
  const normalized = (status || 'active').trim().toLowerCase();
  return normalized === 'inactive' || normalized === 'banned' || normalized === 'deactive' || normalized === 'deactivated' || normalized === 'blocked'
    ? 'inactive'
    : 'active';
};

const getStatusLabel = (status?: string | null) => (
  getCanonicalStatus(status) === 'active' ? 'Hoạt động' : 'Đã khóa'
);

const getRoleLabel = (isAdmin: boolean) => (isAdmin ? 'Quản trị' : 'Người dùng');

const getTransactionSource = (source?: string | null) => (source || '').trim().toLowerCase();

const isManualTransaction = (transaction: TransactionRow) => getTransactionSource(transaction.source) === 'manual';

const isOcrTransaction = (transaction: TransactionRow) => getTransactionSource(transaction.source) === 'ocr';

const parseTimestampMs = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getLatestTimestamp = (values: Array<string | null | undefined>) => {
  const latest = values.reduce<number | null>((max, value) => {
    const timestamp = parseTimestampMs(value);
    if (timestamp == null) return max;
    return max == null || timestamp > max ? timestamp : max;
  }, null);

  return latest == null ? null : new Date(latest).toISOString();
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const parseIsoDateInput = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatCurrencyValue = (value?: number | null, currencyCode = 'VND') => {
  if (value == null) return 'Chưa cập nhật';
  return `${formatNumber(Number(value))} ${currencyCode || 'VND'}`;
};

const formatProviderList = (providers?: string[] | null) => {
  if (!providers || providers.length === 0) return 'Chưa có dữ liệu';
  return providers.join(', ');
};

const maskEmail = (email?: string | null) => {
  if (!email) return 'Chưa có email';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};

const formatExportTimestamp = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const escapeCsvValue = (value: unknown) => {
  const raw = value == null ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
};

const attributeLabels: Record<string, string> = {
  uid: 'UID',
  user_id: 'UID hồ sơ',
  display_name: 'Tên hiển thị',
  email: 'Email',
  phone: 'Số điện thoại',
  providers: 'Nhà cung cấp đăng nhập',
  provider_type: 'Loại đăng nhập',
  created_at: 'Ngày đăng ký',
  last_sign_in_at: 'Lần đăng nhập cuối',
  full_name: 'Họ tên',
  date_of_birth: 'Ngày sinh',
  job: 'Nghề nghiệp',
  occupation: 'Nghề nghiệp',
  initial_income: 'Thu nhập hàng tháng',
  monthly_income: 'Thu nhập hàng tháng',
  currency_code: 'Mã tiền tệ',
  locale: 'Ngôn ngữ',
  time_zone: 'Múi giờ',
  avatar_url: 'URL ảnh đại diện',
  updated_at: 'Cập nhật lần cuối',
  is_admin: 'Quyền quản trị',
  account_status: 'Trạng thái tài khoản',
};

const getAttributeLabel = (key: string) => (
  attributeLabels[key] || key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

const formatAttributeValue = (key: string, value: unknown) => {
  if (value == null || value === '') return 'Chưa có dữ liệu';
  if (key === 'created_at' || key === 'updated_at' || key === 'last_sign_in_at') return formatDateTime(String(value));
  if (key === 'date_of_birth') return formatDate(String(value));
  if (key === 'initial_income' || key === 'monthly_income') return formatCurrencyValue(Number(value));
  if (key === 'account_status') return getStatusLabel(String(value));
  if (key === 'is_admin') return value ? 'Có' : 'Không';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Chưa có dữ liệu';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const normalizeAuthTimestamp = (value: unknown) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(' ', 'T')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
    .replace(/([+-]\d{2})$/, '$1:00')
    .replace(/\.(\d{3})\d+/, '.$1');
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

const getCampaignStatusLabel = (status?: string | null) => {
  switch ((status || '').toLowerCase()) {
    case 'sent':
      return 'Đã gửi';
    case 'scheduled':
      return 'Đang lên lịch';
    case 'failed':
      return 'Thất bại';
    case 'canceled':
      return 'Đã hủy';
    default:
      return status || 'Không rõ';
  }
};

const isCampaignFailed = (status?: string | null) => (status || '').toLowerCase() === 'failed';
const isCampaignScheduled = (status?: string | null) => (status || '').toLowerCase() === 'scheduled';
const getEffectiveCampaignStatus = (campaign: NotificationCampaignRow) => {
  const scheduledAt = parseTimestampMs(campaign.scheduled_at);
  if (isCampaignScheduled(campaign.status) && scheduledAt != null && scheduledAt <= Date.now()) {
    return 'sent';
  }

  return campaign.status || '';
};
const isCampaignScheduledForFuture = (campaign: NotificationCampaignRow) => {
  const scheduledAt = parseTimestampMs(campaign.scheduled_at);
  return isCampaignScheduled(campaign.status) && (scheduledAt == null || scheduledAt > Date.now());
};
const getCampaignSentAt = (campaign: NotificationCampaignRow) => (
  campaign.sent_at || (getEffectiveCampaignStatus(campaign) === 'sent' ? campaign.scheduled_at : null)
);
const isValidExpoPushToken = (token?: string | null) => /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token || '');

const getNotificationTypeLabel = (type?: string | null) => {
  switch ((type || '').toLowerCase()) {
    case 'admin_campaign':
      return 'Admin gửi';
    case 'budget_warning':
      return 'Cảnh báo ngân sách';
    case 'daily_reminder':
      return 'Nhắc nhở mặc định';
    default:
      return type || 'Không rõ';
  }
};

const formatRequestError = (label: string, error: any) => {
  const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');
  return detail ? `${label}: ${detail}` : `${label}: ${String(error)}`;
};

const withRequestLabel = async <T,>(label: string, request: PromiseLike<T>): Promise<T> => {
  try {
    return await request;
  } catch (error: any) {
    throw new Error(formatRequestError(label, error));
  }
};

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const formatDuration = (milliseconds: number) => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0s';
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)} phút`;
};

const getMonthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0);
  return { start, end };
};

const getPreviousMonth = (year: number, month: number) => {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
};

const getRollingDayRange = (days: number, offset = 0) => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1 - (days * offset));

  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end };
};

const getDashboardDateRange = (
  year: number,
  month: number,
  range: DashboardTimeRange
) => {
  if (range === 'last_7_days') return getRollingDayRange(7);
  if (range === 'last_30_days') return getRollingDayRange(30);
  return getMonthRange(year, month);
};

const getPreviousDashboardDateRange = (
  year: number,
  month: number,
  range: DashboardTimeRange
) => {
  if (range === 'last_7_days') return getRollingDayRange(7, 1);
  if (range === 'last_30_days') return getRollingDayRange(30, 1);
  const previous = getPreviousMonth(year, month);
  return getMonthRange(previous.year, previous.month);
};

const formatShortDate = (date: Date) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
}).format(date);

const getDashboardPeriodLabel = (
  year: number,
  month: number,
  range: DashboardTimeRange
) => {
  if (range === 'month') return `${monthNames[month]} ${year}`;

  const { start, end } = getDashboardDateRange(year, month, range);
  const inclusiveEnd = new Date(end);
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
  const label = range === 'last_7_days' ? '7 ngày gần nhất' : '30 ngày gần nhất';
  return `${label} (${formatShortDate(start)} - ${formatShortDate(inclusiveEnd)})`;
};

const DASHBOARD_TIME_RANGE_OPTIONS: { value: DashboardTimeRange; label: string }[] = [
  { value: 'month', label: 'Theo tháng' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
];

const isWithinRange = (value: string | null | undefined, start: Date, end: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
};

const isFailedScan = (scan: ScanLogRow) => {
  const status = scan.status.toLowerCase();
  return status.includes('fail') || status.includes('error') || status.includes('reject');
};

const isResolvedStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === 'resolved' || normalized === 'closed' || normalized === 'done';
};

const isPendingStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === 'pending' || normalized === 'open' || normalized === 'new';
};

const isBugFeedback = (feedback: FeedbackRow) => {
  const category = feedback.category.toLowerCase();
  if (['ai_scanner', 'budget', 'transactions', 'auth'].includes(category)) return true;
  return category.includes('bug') || category.includes('lỗi') || category.includes('error');
};

const getFeedbackCategoryLabel = (category?: string | null) => {
  if (!category) return 'Không rõ danh mục';
  return FEEDBACK_CATEGORY_LABELS[category] || category;
};

const normalizeFeedbackStatus = (status?: string | null): FeedbackStatusFilter => {
  const normalized = (status || 'pending').trim().toLowerCase();
  if (normalized === 'open' || normalized === 'new') return 'pending';
  if (normalized === 'done') return 'resolved';
  if (normalized === 'in progress' || normalized === 'chuyển dev' || normalized === 'chuyen dev') return 'in_progress';
  if (normalized === 'resolved') return 'resolved';
  if (normalized === 'closed') return 'closed';
  if (normalized === 'in_progress') return 'in_progress';
  return 'pending';
};

const getFeedbackStatusLabel = (status?: string | null) => {
  switch (normalizeFeedbackStatus(status)) {
    case 'pending':
      return 'Chờ xử lý';
    case 'in_progress':
      return 'Đang xử lý';
    case 'resolved':
      return 'Đã giải quyết';
    case 'closed':
      return 'Đã đóng';
    default:
      return 'Không rõ';
  }
};

const getFeedbackPriorityLabel = (priority?: string | null) => {
  switch ((priority || 'medium').toLowerCase()) {
    case 'low':
      return 'Thấp';
    case 'medium':
      return 'Trung bình';
    case 'high':
      return 'Cao';
    case 'critical':
      return 'Khẩn cấp';
    default:
      return priority || 'Trung bình';
  }
};

const getFeedbackPriorityReason = (feedback: FeedbackRow) => {
  const priority = (feedback.priority || 'medium').toLowerCase();
  const category = feedback.category;

  if (priority === 'critical') {
    return 'Khẩn cấp khi nội dung có dấu hiệu chặn đăng nhập, khóa tài khoản, mất tiền, crash/sập ứng dụng hoặc Admin nâng mức khi chuyển Dev.';
  }

  if (priority === 'high') {
    return 'Cao vì phản hồi thuộc nhóm Auth, Budget hoặc Transactions, các nhóm ảnh hưởng trực tiếp đến tài khoản và dữ liệu tài chính.';
  }

  if (priority === 'medium') {
    return category === 'ai_scanner'
      ? 'Trung bình vì lỗi AI Scanner cần kiểm tra nhưng thường không chặn truy cập tài khoản hoặc dữ liệu giao dịch đã lưu.'
      : 'Trung bình cho phản hồi cần xử lý theo SLA thông thường hoặc dữ liệu cũ chưa có rule ưu tiên chi tiết.';
  }

  return 'Thấp cho góp ý tính năng mới hoặc mục Khác chưa có dấu hiệu lỗi nghiêm trọng.';
};

const getFeedbackType = (feedback: FeedbackRow): FeedbackTypeFilter => {
  const source = `${feedback.category} ${feedback.subject}`.toLowerCase();
  if (feedback.category === 'suggestion') return 'suggestion';
  if (feedback.category === 'other') return 'question';
  if (source.includes('suggestion') || source.includes('gợi ý') || source.includes('tính năng')) return 'suggestion';
  if (source.includes('other') || source.includes('khác') || source.includes('hỏi') || source.includes('question')) return 'question';
  return 'bug';
};

const getFeedbackTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'bug':
      return 'Báo lỗi';
    case 'suggestion':
      return 'Gợi ý';
    case 'question':
      return 'Câu hỏi';
    default:
      return 'Không rõ';
  }
};

const getFeedbackDisplayCode = (feedbackId: string) => `FB-${feedbackId.slice(0, 8).toUpperCase()}`;

const getScanDisplayCode = (scanLogId: string) => `AI-${scanLogId.slice(0, 8).toUpperCase()}`;

const normalizeConfidencePercent = (value?: number | null) => {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, percent));
};

const getConfidenceLabel = (value?: number | null) => {
  const percent = normalizeConfidencePercent(value);
  return percent == null ? 'N/A' : `${Math.round(percent)}%`;
};

const getAverageConfidence = (values: Array<number | null | undefined>) => {
  const normalized = values
    .map(normalizeConfidencePercent)
    .filter((value): value is number => value != null);

  if (normalized.length === 0) return 0;
  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
};

const getReviewLabel = (isReviewed?: boolean | null) => (
  isReviewed ? 'Đã kiểm tra' : 'Chưa kiểm tra'
);

const getScanStatusLabel = (scan: ScanLogRow) => {
  const normalized = (scan.status || '').toLowerCase();
  if (normalized === 'resolved') return 'Đã xử lý';
  if (isFailedScan(scan)) return 'Lỗi';
  if (normalized.includes('success') || normalized.includes('complete') || normalized.includes('done')) return 'Thành công';
  return scan.status || 'Không rõ';
};

const getJsonStringField = (source: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const classifyFailureReason = (scan: ScanLogRow) => {
  const source = `${scan.error_code || ''} ${scan.error_message || ''}`.toLowerCase();
  if (!source.trim()) return 'Không rõ nguyên nhân';
  if (source.includes('blur') || source.includes('mờ') || source.includes('quality')) return 'Ảnh mờ / chất lượng thấp';
  if (source.includes('amount') || source.includes('total') || source.includes('tổng tiền')) return 'Không thấy tổng tiền';
  if (source.includes('format') || source.includes('json') || source.includes('parse')) return 'Sai định dạng dữ liệu';
  if (source.includes('timeout') || source.includes('network') || source.includes('kết nối')) return 'Lỗi kết nối / timeout';
  if (source.includes('merchant') || source.includes('store')) return 'Không nhận diện cửa hàng';
  return 'Khác';
};

const getDurationMs = (startedAt?: string | null, completedAt?: string | null) => {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return end - start;
};

const getUniqueActiveUsers = (
  transactions: TransactionRow[],
  scans: ScanLogRow[],
  profiles: ProfileRow[],
  start: Date,
  end: Date
) => {
  const activeUserIds = new Set<string>();

  transactions.forEach((transaction) => {
    if (isWithinRange(transaction.transaction_date, start, end)) {
      activeUserIds.add(transaction.user_id);
    }
  });

  scans.forEach((scan) => {
    if (isWithinRange(scan.created_at, start, end)) {
      activeUserIds.add(scan.user_id);
    }
  });

  profiles.forEach((profile) => {
    if (isWithinRange(profile.updated_at, start, end)) {
      activeUserIds.add(profile.user_id);
    }
  });

  return activeUserIds.size;
};

const normalizeAuthUsers = (authUsers: AuthUserRow[]) => {
  const rowWithMissingField = authUsers.find((authUser) => {
    const row = authUser as Record<string, unknown>;
    return authUserFields.some((field) => !(field in row));
  });

  if (rowWithMissingField) {
    throw new Error('Auth data chưa đúng cấu trúc: thiếu một trong các trường UID, Display name, Email, Phone, Providers, Provider type, Created at hoặc Last sign in at.');
  }

  const normalizedAuthUsers = authUsers
    .map((authUser) => ({
      ...authUser,
      uid: String(authUser.uid || '').trim(),
      created_at: normalizeAuthTimestamp(authUser.created_at) || '',
      last_sign_in_at: normalizeAuthTimestamp(authUser.last_sign_in_at),
    }))
    .filter((authUser) => authUser.uid && authUser.created_at);

  if (authUsers.length > 0 && normalizedAuthUsers.length === 0) {
    throw new Error('Auth data có bản ghi thiếu UID hoặc Created at không hợp lệ, chưa thể vẽ biểu đồ tăng trưởng người dùng.');
  }

  return normalizedAuthUsers;
};

const buildUserManagementRows = (dashboardData: DashboardData): UserManagementRow[] => {
  const profilesById = new Map(dashboardData.profiles.map((profile) => [profile.user_id, profile]));
  const authUsersById = new Map(dashboardData.authUsers.map((authUser) => [authUser.uid, authUser]));
  const userIds = new Set<string>([
    ...dashboardData.profiles.map((profile) => profile.user_id),
    ...dashboardData.authUsers.map((authUser) => authUser.uid),
  ]);

  return Array.from(userIds)
    .map((userId) => {
      const profile = profilesById.get(userId) ?? null;
      const authUser = authUsersById.get(userId) ?? null;
      const userTransactions = dashboardData.transactions.filter((transaction) => transaction.user_id === userId);
      const userScans = dashboardData.scans.filter((scan) => scan.user_id === userId);
      const userFeedbacks = dashboardData.feedbacks.filter((feedback) => feedback.user_id === userId);
      const lastActive = getLatestTimestamp([
        authUser?.last_sign_in_at,
        profile?.updated_at,
        ...userTransactions.map((transaction) => transaction.created_at || transaction.transaction_date),
        ...userScans.map((scan) => scan.created_at),
        ...userFeedbacks.map((feedback) => feedback.created_at),
      ]);

      return {
        id: userId,
        fullName: profile?.full_name || authUser?.display_name || 'Chưa cập nhật',
        email: authUser?.email || '',
        phone: authUser?.phone || '',
        avatarUrl: profile?.avatar_url || null,
        status: getCanonicalStatus(profile?.account_status),
        isAdmin: Boolean(profile?.is_admin),
        joinDate: authUser?.created_at || null,
        lastActive,
        totalTransactions: userTransactions.length,
        manualTransactions: userTransactions.filter(isManualTransaction).length,
        aiTransactions: userTransactions.filter(isOcrTransaction).length,
        scanLogs: userScans.length,
        feedbacks: userFeedbacks.length,
        authUser,
        profile,
      };
    })
    .sort((a, b) => {
      const aTime = parseTimestampMs(a.joinDate) ?? 0;
      const bTime = parseTimestampMs(b.joinDate) ?? 0;
      return bTime - aTime;
    });
};

const buildTechnicalAttributes = (user: UserManagementRow) => {
  const authAttributes = user.authUser
    ? Object.entries(user.authUser).map(([key, value]) => ({
        key: `auth.${key}`,
        label: getAttributeLabel(key),
        value: formatAttributeValue(key, value),
      }))
    : [];
  const profileAttributes = user.profile
    ? Object.entries(user.profile).map(([key, value]) => ({
        key: `profile.${key}`,
        label: getAttributeLabel(key),
        value: formatAttributeValue(key, value),
      }))
    : [];

  return { authAttributes, profileAttributes };
};

const buildUserTrend = (
  authUsers: AuthUserRow[],
  year: number,
  month: number
): TrendPoint[] => {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysToShow = isCurrentMonth ? today.getDate() : daysInMonth;

  return Array.from({ length: daysToShow }, (_, index) => {
    const dayEnd = new Date(year, month, index + 2, 0, 0, 0, 0);

    return {
      label: String(index + 1),
      totalUsers: authUsers.filter((authUser) => {
        const normalizedCreatedAt = normalizeAuthTimestamp(authUser.created_at);
        if (!normalizedCreatedAt) return false;

        return new Date(normalizedCreatedAt) < dayEnd;
      }).length,
    };
  });
};

const buildUserTrendForRange = (
  authUsers: AuthUserRow[],
  start: Date,
  end: Date
): TrendPoint[] => {
  const dayMs = 24 * 60 * 60 * 1000;
  const daysToShow = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));

  return Array.from({ length: daysToShow }, (_, index) => {
    const dayStart = new Date(start);
    dayStart.setDate(start.getDate() + index);
    const dayEnd = new Date(start);
    dayEnd.setDate(start.getDate() + index + 1);

    return {
      label: formatShortDate(dayStart),
      totalUsers: authUsers.filter((authUser) => {
        const normalizedCreatedAt = normalizeAuthTimestamp(authUser.created_at);
        if (!normalizedCreatedAt) return false;

        return new Date(normalizedCreatedAt) < dayEnd;
      }).length,
    };
  });
};

const LineChart: React.FC<{ data: TrendPoint[] }> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 620;
  const height = 240;
  const plotLeft = 44;
  const plotRight = 18;
  const plotTop = 22;
  const plotBottom = 42;
  const plotWidth = width - plotLeft - plotRight;
  const plotHeight = height - plotTop - plotBottom;
  const maxValue = Math.max(1, ...data.map((item) => item.totalUsers));
  const maxLabel = Math.ceil(maxValue);
  const middleLabel = Math.ceil(maxValue / 2);

  const chartPoints = data.map((item, index) => {
    const x = plotLeft + (index / Math.max(data.length - 1, 1)) * plotWidth;
    const y = plotTop + (1 - item.totalUsers / maxValue) * plotHeight;
    return {
      ...item,
      x,
      y,
      xPercent: (x / width) * 100,
    };
  });
  const points = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const hoveredPoint = hoveredIndex != null ? chartPoints[hoveredIndex] : null;
  const hoverLayerProps = Platform.OS === 'web'
    ? ({
        onMouseMove: (event: any) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * width;
          const nearestIndex = chartPoints.reduce((nearest, point, index) => {
            const nearestDistance = Math.abs(chartPoints[nearest].x - relativeX);
            const pointDistance = Math.abs(point.x - relativeX);
            return pointDistance < nearestDistance ? index : nearest;
          }, 0);
          setHoveredIndex(nearestIndex);
        },
        onMouseLeave: () => setHoveredIndex(null),
      } as any)
    : {};

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Tăng trưởng người dùng</Text>
          <Text style={styles.chartSubtitle}>Tổng số người dùng lũy kế theo từng ngày</Text>
        </View>
      </View>
      <View style={styles.lineChartWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Polyline points={`${plotLeft},${height - plotBottom} ${width - plotRight},${height - plotBottom}`} stroke={ADMIN_COLORS.border} strokeWidth="1" />
          <Polyline points={`${plotLeft},${plotTop} ${plotLeft},${height - plotBottom}`} stroke={ADMIN_COLORS.border} strokeWidth="1" />
          <SvgText x={8} y={plotTop + 4} fontSize="11" fontWeight="700" fill={ADMIN_COLORS.muted}>{maxLabel}</SvgText>
          <SvgText x={8} y={plotTop + plotHeight / 2 + 4} fontSize="11" fontWeight="700" fill={ADMIN_COLORS.muted}>{middleLabel}</SvgText>
          <SvgText x={8} y={height - plotBottom + 4} fontSize="11" fontWeight="700" fill={ADMIN_COLORS.muted}>0</SvgText>
          <SvgText x={plotLeft} y={height - 10} fontSize="11" fontWeight="700" fill={ADMIN_COLORS.muted}>Ngày 1</SvgText>
          <SvgText x={plotLeft + plotWidth / 2 - 20} y={height - 10} fontSize="11" fontWeight="700" fill={ADMIN_COLORS.muted}>
            Ngày {data[Math.floor(data.length / 2)]?.label || '1'}
          </SvgText>
          <SvgText x={width - plotRight - 48} y={height - 10} fontSize="11" fontWeight="700" fill={ADMIN_COLORS.muted}>
            Ngày {data[data.length - 1]?.label || '1'}
          </SvgText>
          <Polyline points={points} fill="none" stroke={ADMIN_COLORS.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {chartPoints.map((point, index) => (
            <Circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 5 : 3}
              fill={hoveredIndex === index ? ADMIN_COLORS.success : ADMIN_COLORS.primary}
              stroke={ADMIN_COLORS.surface}
              strokeWidth={2}
            />
          ))}
        </Svg>
        <View style={styles.chartHoverLayer} {...hoverLayerProps}>
          {chartPoints.map((point, index) => {
            const hoverProps = Platform.OS === 'web'
              ? ({
                  onMouseEnter: () => setHoveredIndex(index),
                  onMouseLeave: () => setHoveredIndex(null),
                } as any)
              : {};

            return (
              <TouchableOpacity
                key={point.label}
                activeOpacity={0.8}
                onPress={() => setHoveredIndex(index)}
                {...hoverProps}
                style={[
                  styles.chartPointHitArea,
                  {
                    left: `${point.xPercent}%`,
                  top: point.y - 14,
                  },
                ]}
              >
                <View style={styles.chartPointHitDot} />
              </TouchableOpacity>
            );
          })}
          {hoveredPoint ? (
            <View
              style={[
                styles.chartTooltip,
                {
                  left: `${Math.min(Math.max(hoveredPoint.xPercent, 14), 86)}%`,
                  top: Math.max(4, hoveredPoint.y - 58),
                },
              ]}
            >
              <Text style={styles.tooltipTitle}>Ngày {hoveredPoint.label}</Text>
              <Text style={styles.tooltipValue}>{formatNumber(hoveredPoint.totalUsers)} người dùng</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const DonutChart: React.FC<{ manual: number; ai: number }> = ({ manual, ai }) => {
  const size = 168;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = manual + ai;
  const aiRatio = total > 0 ? ai / total : 0;
  const manualRatio = total > 0 ? manual / total : 0;

  return (
    <View style={styles.donutContent}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ADMIN_COLORS.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${aiRatio * circumference} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ADMIN_COLORS.info}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${manualRatio * circumference} ${circumference}`}
          strokeDashoffset={-(aiRatio * circumference)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutNumber}>{formatNumber(total)}</Text>
        <Text style={styles.donutLabel}>Tổng</Text>
      </View>
    </View>
  );
};

const FailureReasonChart: React.FC<{ items: { label: string; value: number }[] }> = ({ items }) => {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return <Text style={styles.emptyText}>Không có lỗi AI trong tháng đã chọn.</Text>;
  }

  return (
    <View style={styles.failureList}>
      {items.map((item) => (
        <View key={item.label} style={styles.failureItem}>
          <View style={styles.failureRow}>
            <Text style={styles.failureLabel}>{item.label}</Text>
            <Text style={styles.failureValue}>{formatNumber(item.value)}</Text>
          </View>
          <View style={styles.failureTrack}>
            <View style={[styles.failureBar, { width: `${Math.max(8, (item.value / max) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}> = ({ title, value, subtitle, icon, color = ADMIN_COLORS.primary }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricSubtitle}>{subtitle}</Text>
  </View>
);

const SidebarItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}> = ({
  icon,
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.sidebarItem, active && styles.sidebarItemActive]}
    onPress={onPress}
    activeOpacity={onPress ? 0.78 : 1}
    disabled={!onPress}
  >
    <Ionicons name={icon} size={18} color={active ? ADMIN_COLORS.primary : ADMIN_COLORS.muted} />
    <Text style={[styles.sidebarText, active && styles.sidebarTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function AdminApp() {
  const now = new Date();
  const [activeSection, setActiveSection] = useState<AdminSection>(getInitialAdminSection);
  const [authState, setAuthState] = useState<AdminAuthState>('loading');
  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DATA);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dashboardTimeRange, setDashboardTimeRange] = useState<DashboardTimeRange>('month');
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isEditUserVisible, setIsEditUserVisible] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<AdminEditProfileForm>({
    fullName: '',
    dateOfBirth: '',
    job: '',
    income: '',
  });
  const [editProfileError, setEditProfileError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userActionError, setUserActionError] = useState('');
  const [showCreateNotification, setShowCreateNotification] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [campaignAudience, setCampaignAudience] = useState<CampaignAudience>('all_users');
  const [campaignDelivery, setCampaignDelivery] = useState<CampaignDelivery>('now');
  const [campaignSchedule, setCampaignSchedule] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [selectedCampaignUserIds, setSelectedCampaignUserIds] = useState<string[]>([]);
  const [campaignError, setCampaignError] = useState('');
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [aiLogSearch, setAiLogSearch] = useState('');
  const [aiLogStatusFilter, setAiLogStatusFilter] = useState<AiLogStatusFilter>('all');
  const [selectedScanLogId, setSelectedScanLogId] = useState<string | null>(null);
  const [aiLogError, setAiLogError] = useState('');
  const [relabelCategoryId, setRelabelCategoryId] = useState('');
  const [relabelNotes, setRelabelNotes] = useState('');
  const [isSavingAiLog, setIsSavingAiLog] = useState(false);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<FeedbackStatusFilter>('all');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<FeedbackTypeFilter>('all');
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [feedbackResponse, setFeedbackResponse] = useState('');
  const [feedbackInternalNotes, setFeedbackInternalNotes] = useState('');
  const [feedbackDetailStatus, setFeedbackDetailStatus] = useState<Exclude<FeedbackStatusFilter, 'all'>>('resolved');
  const [feedbackError, setFeedbackError] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [showForwardDevModal, setShowForwardDevModal] = useState(false);
  const [forwardPriority, setForwardPriority] = useState<FeedbackPriority>('high');
  const [forwardRelatedModule, setForwardRelatedModule] = useState('Other');
  const [forwardTechnicalNotes, setForwardTechnicalNotes] = useState('');
  const [isForwardingFeedback, setIsForwardingFeedback] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsDashboardLoading(true);
    setDashboardError('');

    try {
      const [
        authUsers,
        categories,
        profiles,
        transactions,
        receipts,
        receiptImages,
        scans,
        ocrResults,
        recommendationRuns,
        feedbacks,
        auditLogs,
        notifications,
        notificationCampaigns,
        notificationTargets,
        notificationSettings,
      ] = await Promise.all([
        withRequestLabel('get_admin_auth_users', supabase.rpc('get_admin_auth_users')),
        withRequestLabel('categories.select', supabase.from('categories').select('*')),
        withRequestLabel('user_profiles.select', supabase.from('user_profiles').select('*')),
        withRequestLabel('transactions.select', supabase.from('transactions').select('*')),
        withRequestLabel('receipts.select', supabase.from('receipts').select('*')),
        withRequestLabel('receipt_images.select', supabase.from('receipt_images').select('*')),
        withRequestLabel('scan_logs.select', supabase.from('scan_logs').select('*')),
        withRequestLabel('ocr_results.select', supabase.from('ocr_results').select('*')),
        withRequestLabel('recommendation_runs.select', supabase.from('recommendation_runs').select('*')),
        withRequestLabel('feedbacks.select', supabase.from('feedbacks').select('*')),
        withRequestLabel('audit_logs.select', supabase.from('audit_logs').select('*')),
        withRequestLabel('notifications.select', supabase.from('notifications').select('*').order('created_at', { ascending: false })),
        withRequestLabel('notification_campaigns.select', supabase.from('notification_campaigns').select('*').order('created_at', { ascending: false })),
        withRequestLabel('notification_campaign_targets.select', supabase.from('notification_campaign_targets').select('*')),
        withRequestLabel('user_notification_settings.select', supabase.from('user_notification_settings').select('*')),
      ]);

      const failedResponse = [
        { label: 'get_admin_auth_users', error: authUsers.error },
        { label: 'categories.select', error: categories.error },
        { label: 'user_profiles.select', error: profiles.error },
        { label: 'transactions.select', error: transactions.error },
        { label: 'receipts.select', error: receipts.error },
        { label: 'receipt_images.select', error: receiptImages.error },
        { label: 'scan_logs.select', error: scans.error },
        { label: 'ocr_results.select', error: ocrResults.error },
        { label: 'recommendation_runs.select', error: recommendationRuns.error },
        { label: 'feedbacks.select', error: feedbacks.error },
        { label: 'audit_logs.select', error: auditLogs.error },
        { label: 'notifications.select', error: notifications.error },
        { label: 'notification_campaigns.select', error: notificationCampaigns.error },
        { label: 'notification_campaign_targets.select', error: notificationTargets.error },
        { label: 'user_notification_settings.select', error: notificationSettings.error },
      ].find((item) => Boolean(item.error));
      if (failedResponse?.error) {
        throw new Error(formatRequestError(failedResponse.label, failedResponse.error));
      }

      setDashboardData({
        authUsers: normalizeAuthUsers(authUsers.data ?? []),
        categories: categories.data ?? [],
        profiles: profiles.data ?? [],
        transactions: transactions.data ?? [],
        receipts: receipts.data ?? [],
        receiptImages: receiptImages.data ?? [],
        scans: scans.data ?? [],
        ocrResults: ocrResults.data ?? [],
        recommendationRuns: recommendationRuns.data ?? [],
        feedbacks: feedbacks.data ?? [],
        auditLogs: auditLogs.data ?? [],
        notifications: notifications.data ?? [],
        notificationCampaigns: notificationCampaigns.data ?? [],
        notificationTargets: notificationTargets.data ?? [],
        notificationSettings: notificationSettings.data ?? [],
      });
    } catch (error: any) {
      const message = error?.message || 'Không thể tải dữ liệu Admin Dashboard.';
      setDashboardError(message);
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  const verifyAdminProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.is_admin || getCanonicalStatus(data.account_status) !== 'active') {
      return null;
    }

    return data;
  }, []);

  const hydrateAdminSession = useCallback(async () => {
    setAuthState('loading');
    setLoginError('');

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session?.user) {
        setAdminProfile(null);
        setAuthState('unauthenticated');
        return;
      }

      const profile = await verifyAdminProfile(session.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        setAdminProfile(null);
        setAuthState('denied');
        setLoginError('Tài khoản này không có quyền quản trị.');
        return;
      }

      setAdminProfile(profile);
      setAuthState('authenticated');
      await loadDashboardData();
    } catch (error: any) {
      setAdminProfile(null);
      setAuthState('unauthenticated');
      setLoginError(error?.message || 'Không thể xác thực quyền quản trị.');
    }
  }, [loadDashboardData, verifyAdminProfile]);

  useEffect(() => {
    hydrateAdminSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAdminProfile(null);
        setDashboardData(EMPTY_DATA);
        setAuthState('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, [hydrateAdminSession]);

  useEffect(() => {
    if (authState !== 'authenticated') return;

    const tables = [
      'categories',
      'user_profiles',
      'transactions',
      'receipts',
      'receipt_images',
      'scan_logs',
      'ocr_results',
      'recommendation_runs',
      'feedbacks',
      'audit_logs',
      'notification_campaigns',
      'notification_campaign_targets',
      'user_notification_settings',
      'notifications',
    ];
    const channel = supabase.channel('admin-dashboard-realtime');

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          loadDashboardData();
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState, loadDashboardData]);

  const metrics = useMemo(() => {
    const { start, end } = getDashboardDateRange(selectedYear, selectedMonth, dashboardTimeRange);
    const { start: previousStart, end: previousEnd } = getPreviousDashboardDateRange(selectedYear, selectedMonth, dashboardTimeRange);

    const monthTransactions = dashboardData.transactions.filter((transaction) =>
      isWithinRange(transaction.transaction_date, start, end)
    );
    const monthScans = dashboardData.scans.filter((scan) => isWithinRange(scan.created_at, start, end));
    const monthRecommendationRuns = dashboardData.recommendationRuns.filter((run) =>
      isWithinRange(run.started_at, start, end) || isWithinRange(run.completed_at, start, end)
    );
    const failedScans = monthScans.filter(isFailedScan);
    const unreviewedScanErrors = failedScans.filter((scan) => !scan.is_reviewed).length;
    const activeUsers = getUniqueActiveUsers(dashboardData.transactions, dashboardData.scans, dashboardData.profiles, start, end);
    const previousActiveUsers = getUniqueActiveUsers(
      dashboardData.transactions,
      dashboardData.scans,
      dashboardData.profiles,
      previousStart,
      previousEnd
    );

    const growthRate = previousActiveUsers === 0
      ? (activeUsers > 0 ? 100 : 0)
      : ((activeUsers - previousActiveUsers) / previousActiveUsers) * 100;

    const manualTransactions = monthTransactions.filter(isManualTransaction).length;
    const aiTransactions = monthTransactions.filter(isOcrTransaction).length;

    const failureGroups = failedScans.reduce<Record<string, number>>((acc, scan) => {
      const label = classifyFailureReason(scan);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const ocrDurations = monthScans
      .map((scan) => {
        if (scan.processing_time_ms != null) return scan.processing_time_ms;
        const matchedOcr = dashboardData.ocrResults.find((ocr) => ocr.receipt_id === scan.receipt_id);
        return getDurationMs(scan.created_at, matchedOcr?.processed_at);
      })
      .filter((duration): duration is number => duration != null);

    const recommendationDurations = monthRecommendationRuns
      .map((run) => getDurationMs(run.started_at, run.completed_at))
      .filter((duration): duration is number => duration != null);

    const aiDurations = [...ocrDurations, ...recommendationDurations];
    const averageAiProcessingMs = aiDurations.length > 0
      ? aiDurations.reduce((sum, duration) => sum + duration, 0) / aiDurations.length
      : 0;

    const pendingFeedbacks = dashboardData.feedbacks.filter(
      (feedback) => !isBugFeedback(feedback) && isPendingStatus(feedback.status)
    ).length;
    const pendingFeedbackQueue = dashboardData.feedbacks.filter(
      (feedback) => isPendingStatus(feedback.status)
    ).length;
    const unresolvedBugs = dashboardData.feedbacks.filter(
      (feedback) => isBugFeedback(feedback) && !isResolvedStatus(feedback.status)
    ).length;

    return {
      totalUsers: dashboardData.authUsers.length,
      activeUsers,
      growthRate,
      periodLabel: getDashboardPeriodLabel(selectedYear, selectedMonth, dashboardTimeRange),
      userTrend: dashboardTimeRange === 'month'
        ? buildUserTrend(dashboardData.authUsers, selectedYear, selectedMonth)
        : buildUserTrendForRange(dashboardData.authUsers, start, end),
      totalTransactions: monthTransactions.length,
      totalScanLogs: monthScans.length,
      failedScans: failedScans.length,
      unreviewedScanErrors,
      successRate: monthScans.length > 0 ? ((monthScans.length - failedScans.length) / monthScans.length) * 100 : 0,
      averageAiProcessingMs,
      manualTransactions,
      aiTransactions,
      failureReasons: Object.entries(failureGroups)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      pendingFeedbacks,
      pendingFeedbackQueue,
      unresolvedBugs,
    };
  }, [dashboardData, dashboardTimeRange, selectedMonth, selectedYear]);

  const userRows = useMemo(() => buildUserManagementRows(dashboardData), [dashboardData]);

  const filteredUserRows = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();

    return userRows.filter((row) => {
      const matchesKeyword = !keyword ||
        row.fullName.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword);
      const matchesStatus = userStatusFilter === 'all' || getCanonicalStatus(row.status) === userStatusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [userRows, userSearch, userStatusFilter]);

  const selectedUser = useMemo(
    () => userRows.find((row) => row.id === selectedUserId) ?? null,
    [selectedUserId, userRows]
  );

  const selectedNotification = useMemo(
    () => dashboardData.notifications.find((notification) => notification.notification_id === selectedNotificationId) ?? null,
    [dashboardData.notifications, selectedNotificationId]
  );

  const selectedUserAuditLogs = useMemo(() => {
    if (!selectedUser) return [];

    return dashboardData.auditLogs
      .filter((log) => log.target_id === selectedUser.id)
      .sort((a, b) => (parseTimestampMs(b.created_at) ?? 0) - (parseTimestampMs(a.created_at) ?? 0));
  }, [dashboardData.auditLogs, selectedUser]);

  const selectedUserAttributes = useMemo(
    () => selectedUser ? buildTechnicalAttributes(selectedUser) : { authAttributes: [], profileAttributes: [] },
    [selectedUser]
  );

  const campaignRecipientRows = useMemo(() => {
    if (campaignAudience === 'specific_users') {
      return userRows.filter((row) =>
        selectedCampaignUserIds.includes(row.id) &&
        Boolean(row.profile) &&
        getCanonicalStatus(row.status) === 'active'
      );
    }

    return userRows.filter((row) => Boolean(row.profile) && getCanonicalStatus(row.status) === 'active');
  }, [campaignAudience, selectedCampaignUserIds, userRows]);

  const filteredCampaignUsers = useMemo(() => {
    const keyword = campaignSearch.trim().toLowerCase();

    return userRows.filter((row) => {
      const matchesKeyword = !keyword ||
        row.fullName.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword) ||
        row.id.toLowerCase().includes(keyword);

      return matchesKeyword && Boolean(row.profile) && getCanonicalStatus(row.status) === 'active';
    });
  }, [campaignSearch, userRows]);

  const activeNotificationRows = useMemo(
    () => dashboardData.notifications.filter((notification) => {
      const createdAt = parseTimestampMs(notification.created_at);
      return !notification.deleted_at && createdAt != null && createdAt <= Date.now();
    }),
    [dashboardData.notifications]
  );

  const profileByUserId = useMemo(() => {
    const entries = dashboardData.profiles.map((profile) => [profile.user_id, profile] as const);
    return new Map(entries);
  }, [dashboardData.profiles]);

  const authUserById = useMemo(() => {
    const entries = dashboardData.authUsers.map((authUser) => [authUser.uid, authUser] as const);
    return new Map(entries);
  }, [dashboardData.authUsers]);

  const categoryById = useMemo(() => {
    const entries = dashboardData.categories.map((category) => [category.category_id, category] as const);
    return new Map(entries);
  }, [dashboardData.categories]);

  const receiptById = useMemo(() => {
    const entries = dashboardData.receipts.map((receipt) => [receipt.receipt_id, receipt] as const);
    return new Map(entries);
  }, [dashboardData.receipts]);

  const receiptImageById = useMemo(() => {
    const entries = dashboardData.receiptImages.map((receiptImage) => [receiptImage.receipt_image_id, receiptImage] as const);
    return new Map(entries);
  }, [dashboardData.receiptImages]);

  const transactionByReceiptId = useMemo(() => {
    const entries = dashboardData.transactions
      .filter((transaction) => Boolean(transaction.receipt_id))
      .map((transaction) => [transaction.receipt_id as string, transaction] as const);
    return new Map(entries);
  }, [dashboardData.transactions]);

  const ocrResultByReceiptId = useMemo(() => {
    const entries = dashboardData.ocrResults.map((ocrResult) => [ocrResult.receipt_id, ocrResult] as const);
    return new Map(entries);
  }, [dashboardData.ocrResults]);

  const relabelCategoryOptions = useMemo(() => dashboardData.categories
    .filter((category) => category.type === 'expense' && category.is_active)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name, 'vi')), [dashboardData.categories]);

  const aiLogRows = useMemo(() => dashboardData.scans
    .map((scan) => {
      const profile = profileByUserId.get(scan.user_id);
      const authUser = authUserById.get(scan.user_id);
      const matchedReceipt = scan.receipt_id ? receiptById.get(scan.receipt_id) : null;
      const matchedReceiptImage = matchedReceipt?.receipt_image_id ? receiptImageById.get(matchedReceipt.receipt_image_id) : null;
      const matchedTransaction = scan.receipt_id ? transactionByReceiptId.get(scan.receipt_id) : null;
      const matchedOcr = scan.receipt_id ? ocrResultByReceiptId.get(scan.receipt_id) : null;
      const extractedFields = scan.extracted_fields || matchedOcr?.extracted_fields || null;
      const suggestedCategory = scan.suggested_category_id ? categoryById.get(scan.suggested_category_id) : null;
      const finalCategory = scan.final_category_id ? categoryById.get(scan.final_category_id) : null;
      const extractedCategoryName = getJsonStringField(extractedFields, ['categoryName', 'category_name', 'category', 'suggestedCategory']);
      const confidencePercent = normalizeConfidencePercent(scan.confidence_score);
      const processingTimeMs = scan.processing_time_ms ?? getDurationMs(scan.created_at, matchedOcr?.processed_at) ?? 0;
      const failed = isFailedScan(scan);
      const reviewed = Boolean(scan.is_reviewed || scan.reviewed_at);

      return {
        ...scan,
        displayCode: getScanDisplayCode(scan.scan_log_id),
        userName: profile?.full_name || authUser?.display_name || 'Chưa cập nhật',
        userEmail: authUser?.email || '',
        transactionId: matchedTransaction?.transaction_id || null,
        receiptImageUrl: scan.raw_receipt_image_url || matchedReceiptImage?.storage_url || null,
        rawOcrText: scan.raw_text || matchedOcr?.raw_text || '',
        extractedFields,
        suggestedCategoryLabel: suggestedCategory?.name || extractedCategoryName || 'Chưa xác định',
        finalCategoryLabel: finalCategory?.name || null,
        categoryLabel: finalCategory?.name || suggestedCategory?.name || extractedCategoryName || 'Chưa xác định',
        confidencePercent,
        confidenceLabel: getConfidenceLabel(scan.confidence_score),
        processingTimeMs,
        failed,
        reviewed,
        statusLabel: getScanStatusLabel(scan),
        reviewLabel: getReviewLabel(reviewed),
        ocrConfidence: matchedOcr?.confidence ?? null,
      };
    })
    .sort((a, b) => (parseTimestampMs(b.created_at) ?? 0) - (parseTimestampMs(a.created_at) ?? 0)), [
      authUserById,
      categoryById,
      dashboardData.scans,
      ocrResultByReceiptId,
      profileByUserId,
      receiptById,
      receiptImageById,
      transactionByReceiptId,
    ]);

  const filteredAiLogRows = useMemo(() => {
    const keyword = aiLogSearch.trim().toLowerCase();

    return aiLogRows.filter((row) => {
      const matchesKeyword = !keyword ||
        row.displayCode.toLowerCase().includes(keyword) ||
        row.scan_log_id.toLowerCase().includes(keyword) ||
        (row.transactionId || '').toLowerCase().includes(keyword) ||
        (row.receipt_id || '').toLowerCase().includes(keyword) ||
        row.user_id.toLowerCase().includes(keyword) ||
        row.userName.toLowerCase().includes(keyword) ||
        row.userEmail.toLowerCase().includes(keyword) ||
        row.categoryLabel.toLowerCase().includes(keyword) ||
        (row.error_code || '').toLowerCase().includes(keyword) ||
        (row.error_message || '').toLowerCase().includes(keyword);
      const matchesStatus =
        aiLogStatusFilter === 'all' ||
        (aiLogStatusFilter === 'success' && !row.failed) ||
        (aiLogStatusFilter === 'failed' && row.failed) ||
        (aiLogStatusFilter === 'reviewed' && row.reviewed) ||
        (aiLogStatusFilter === 'unreviewed' && !row.reviewed);

      return matchesKeyword && matchesStatus;
    });
  }, [aiLogRows, aiLogSearch, aiLogStatusFilter]);

  const aiLogMetrics = useMemo(() => {
    const durations = aiLogRows
      .map((row) => row.processingTimeMs)
      .filter((duration): duration is number => Number.isFinite(duration) && duration > 0);

    return {
      total: aiLogRows.length,
      averageConfidence: getAverageConfidence(aiLogRows.map((row) => row.confidencePercent)),
      averageProcessingMs: durations.length > 0 ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0,
      unreviewedErrors: aiLogRows.filter((row) => row.failed && !row.reviewed).length,
    };
  }, [aiLogRows]);

  const selectedAiLog = useMemo(
    () => aiLogRows.find((row) => row.scan_log_id === selectedScanLogId) ?? null,
    [aiLogRows, selectedScanLogId]
  );

  const feedbackRows = useMemo(() => dashboardData.feedbacks
    .map((feedback) => {
      const profile = profileByUserId.get(feedback.user_id);
      const authUser = authUserById.get(feedback.user_id);
      const status = normalizeFeedbackStatus(feedback.status);
      const feedbackType = getFeedbackType(feedback);
      const userEmail = feedback.user_email || authUser?.email || '';

      return {
        ...feedback,
        status,
        feedbackType,
        categoryLabel: getFeedbackCategoryLabel(feedback.category),
        displayCode: getFeedbackDisplayCode(feedback.feedback_id),
        userEmail,
        userName: profile?.full_name || authUser?.display_name || 'Chưa cập nhật',
        hasAttachment: Boolean(feedback.attachment_url),
      };
    })
    .sort((a, b) => (parseTimestampMs(b.created_at) ?? 0) - (parseTimestampMs(a.created_at) ?? 0)), [authUserById, dashboardData.feedbacks, profileByUserId]);

  const filteredFeedbackRows = useMemo(() => {
    const keyword = feedbackSearch.trim().toLowerCase();

    return feedbackRows.filter((row) => {
      const matchesKeyword = !keyword ||
        row.displayCode.toLowerCase().includes(keyword) ||
        row.subject.toLowerCase().includes(keyword) ||
        row.content.toLowerCase().includes(keyword) ||
        row.category.toLowerCase().includes(keyword) ||
        row.userEmail.toLowerCase().includes(keyword) ||
        row.user_id.toLowerCase().includes(keyword);
      const matchesStatus = feedbackStatusFilter === 'all' || row.status === feedbackStatusFilter;
      const matchesType = feedbackTypeFilter === 'all' || row.feedbackType === feedbackTypeFilter;

      return matchesKeyword && matchesStatus && matchesType;
    });
  }, [feedbackRows, feedbackSearch, feedbackStatusFilter, feedbackTypeFilter]);

  const feedbackMetrics = useMemo(() => ({
    pending: feedbackRows.filter((row) => row.status === 'pending').length,
    inProgress: feedbackRows.filter((row) => row.status === 'in_progress').length,
    resolved: feedbackRows.filter((row) => row.status === 'resolved' || row.status === 'closed').length,
    critical: feedbackRows.filter((row) => (row.priority || '').toLowerCase() === 'critical').length,
  }), [feedbackRows]);

  const selectedFeedback = useMemo(
    () => feedbackRows.find((row) => row.feedback_id === selectedFeedbackId) ?? null,
    [feedbackRows, selectedFeedbackId]
  );

  const navigateAdminSection = useCallback((section: AdminSection) => {
    setActiveSection(section);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = section === 'users'
        ? '/admin/users'
        : section === 'notifications'
          ? '/admin/notifications'
          : section === 'ai_logs'
            ? '/admin/ai-logs'
          : section === 'feedback'
            ? '/admin/feedback'
          : '/admin';
      window.history.pushState({}, '', path);
    }
  }, []);

  const openAiLogDetail = useCallback((row: any) => {
    setAiLogError('');
    setSelectedScanLogId(row.scan_log_id);
    setRelabelCategoryId(row.final_category_id || row.suggested_category_id || '');
    setRelabelNotes(row.relabel_notes || '');
  }, []);

  const handleSaveAiLogReview = useCallback(async () => {
    if (!selectedAiLog || !adminProfile) return;

    setIsSavingAiLog(true);
    setAiLogError('');
    try {
      const nowIso = new Date().toISOString();
      const updatePayload: Database['public']['Tables']['scan_logs']['Update'] = {
        is_reviewed: true,
        reviewed_at: nowIso,
        reviewed_by: adminProfile.user_id,
        relabeled_category_id: relabelCategoryId || null,
        relabel_notes: relabelNotes.trim() || null,
        final_category_id: relabelCategoryId || selectedAiLog.final_category_id,
        status: selectedAiLog.failed ? 'resolved' : selectedAiLog.status,
      };

      const { error: updateError } = await supabase
        .from('scan_logs')
        .update(updatePayload)
        .eq('scan_log_id', selectedAiLog.scan_log_id);

      if (updateError) throw updateError;

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: adminProfile.user_id,
          action: 'REVIEW_AI_SCAN_LOG',
          target_type: 'scan_log',
          target_id: selectedAiLog.scan_log_id,
          metadata: {
            user_id: selectedAiLog.user_id,
            previous_status: selectedAiLog.status,
            relabeled_category_id: relabelCategoryId || null,
            relabel_notes: relabelNotes.trim() || null,
            error_code: selectedAiLog.error_code,
          },
        });

      if (auditError) throw auditError;

      setSelectedScanLogId(null);
      setRelabelCategoryId('');
      setRelabelNotes('');
      await loadDashboardData();
    } catch (error: any) {
      setAiLogError(error?.message || 'Không thể cập nhật nhật ký AI.');
    } finally {
      setIsSavingAiLog(false);
    }
  }, [adminProfile, loadDashboardData, relabelCategoryId, relabelNotes, selectedAiLog]);

  const resetForwardDevForm = useCallback(() => {
    setForwardPriority('high');
    setForwardRelatedModule('Other');
    setForwardTechnicalNotes('');
  }, []);

  const openFeedbackDetail = useCallback((row: any) => {
    setFeedbackError('');
    setSelectedFeedbackId(row.feedback_id);
    setFeedbackResponse(row.admin_response || '');
    setFeedbackInternalNotes(row.internal_notes || '');
    setFeedbackDetailStatus(row.status === 'closed' ? 'closed' : row.status === 'in_progress' ? 'in_progress' : 'resolved');
    setForwardPriority((row.priority || 'high') as FeedbackPriority);
    setForwardRelatedModule(row.related_module || 'Other');
    setForwardTechnicalNotes(row.technical_notes || '');
  }, []);

  const handleSubmitFeedbackResponse = useCallback(async () => {
    if (!selectedFeedback || !adminProfile) return;

    const response = feedbackResponse.trim();
    const hasResponse = response.length > 0;

    setIsSavingFeedback(true);
    setFeedbackError('');
    try {
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('feedbacks')
        .update({
          status: feedbackDetailStatus,
          admin_response: hasResponse ? response : null,
          internal_notes: feedbackInternalNotes.trim() || null,
          responded_at: nowIso,
          responded_by: adminProfile.user_id,
        })
        .eq('feedback_id', selectedFeedback.feedback_id);

      if (updateError) throw updateError;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedFeedback.user_id,
          type: 'feedback_response',
          title: 'Phản hồi của bạn đã được xử lý',
          body: hasResponse
            ? `Đội ngũ hỗ trợ phản hồi góp ý "${selectedFeedback.subject}": ${response}`
            : `Trạng thái góp ý "${selectedFeedback.subject}" đã được cập nhật thành "${getFeedbackStatusLabel(feedbackDetailStatus)}".`,
          data: {
            feedback_id: selectedFeedback.feedback_id,
            status: feedbackDetailStatus,
            admin_response: hasResponse ? response : null,
          },
          campaign_id: null,
        });

      if (notificationError) throw notificationError;

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: adminProfile.user_id,
          action: 'RESPOND_FEEDBACK',
          target_type: 'feedback',
          target_id: selectedFeedback.feedback_id,
          metadata: {
            status: feedbackDetailStatus,
            user_id: selectedFeedback.user_id,
          },
        });

      if (auditError) throw auditError;

      setSelectedFeedbackId(null);
      await loadDashboardData();
    } catch (error: any) {
      setFeedbackError(error?.message || 'Không thể cập nhật phản hồi do lỗi kết nối.');
    } finally {
      setIsSavingFeedback(false);
    }
  }, [adminProfile, feedbackDetailStatus, feedbackInternalNotes, feedbackResponse, loadDashboardData, selectedFeedback]);

  const handleForwardFeedbackToDev = useCallback(async () => {
    if (!selectedFeedback) return;

    const notes = forwardTechnicalNotes.trim();
    if (!notes) {
      setFeedbackError('Vui lòng nhập ghi chú kỹ thuật trước khi chuyển cho Dev Team.');
      return;
    }

    setIsForwardingFeedback(true);
    setFeedbackError('');
    try {
      const { data, error } = await supabase.functions.invoke('forward-feedback-dev', {
        body: {
          feedbackId: selectedFeedback.feedback_id,
          priority: forwardPriority,
          relatedModule: forwardRelatedModule,
          technicalNotes: notes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setShowForwardDevModal(false);
      setSelectedFeedbackId(null);
      resetForwardDevForm();
      await loadDashboardData();
    } catch (error: any) {
      setFeedbackError(error?.message || 'Không thể chuyển phản hồi cho Dev Team.');
    } finally {
      setIsForwardingFeedback(false);
    }
  }, [forwardPriority, forwardRelatedModule, forwardTechnicalNotes, loadDashboardData, resetForwardDevForm, selectedFeedback]);

  const openUserDetail = useCallback((row: UserManagementRow) => {
    setUserActionError('');
    setSelectedUserId(row.id);
  }, []);

  const openEditUser = useCallback((row: UserManagementRow) => {
    setUserActionError('');
    setEditProfileError('');
    setSelectedUserId(row.id);
    setEditProfileForm({
      fullName: row.profile?.full_name || row.authUser?.display_name || '',
      dateOfBirth: row.profile?.date_of_birth || '',
      job: row.profile?.job || '',
      income: row.profile?.initial_income != null ? String(row.profile.initial_income) : '',
    });
    setIsEditUserVisible(true);
  }, []);

  const validateEditProfile = useCallback(() => {
    const fullName = editProfileForm.fullName.trim();
    if (!fullName) return 'Vui lòng nhập họ tên.';
    if (fullName.length > 120) return 'Họ tên không được vượt quá 120 ký tự.';

    const dateOfBirth = editProfileForm.dateOfBirth.trim();
    if (dateOfBirth) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return 'Ngày sinh phải có định dạng YYYY-MM-DD.';
      const birthDate = parseIsoDateInput(dateOfBirth);
      if (!birthDate) return 'Ngày sinh không hợp lệ.';
      if (birthDate > new Date()) return 'Ngày sinh không được ở tương lai.';
      if (birthDate.getFullYear() < 1900) return 'Ngày sinh không hợp lý.';
    }

    const incomeRaw = editProfileForm.income.trim();
    const incomeDigits = incomeRaw.replace(/[^\d]/g, '');
    if (incomeRaw && !incomeDigits) return 'Thu nhập hàng tháng không hợp lệ.';
    if (incomeDigits && Number(incomeDigits) < 0) return 'Thu nhập hàng tháng phải là số không âm.';

    return null;
  }, [editProfileForm]);

  const handleSaveUserProfile = useCallback(async () => {
    if (!selectedUser) return;

    const validationError = validateEditProfile();
    if (validationError) {
      setEditProfileError(validationError);
      return;
    }

    const incomeDigits = editProfileForm.income.trim().replace(/[^\d]/g, '');

    setIsSavingUser(true);
    setEditProfileError('');
    try {
      const { error } = await supabase.rpc('admin_update_user_profile', {
        target_user_id: selectedUser.id,
        profile_full_name: editProfileForm.fullName.trim(),
        profile_date_of_birth: editProfileForm.dateOfBirth.trim() || null,
        profile_job: editProfileForm.job.trim() || null,
        profile_initial_income: incomeDigits ? Number(incomeDigits) : null,
      });

      if (error) throw error;

      setIsEditUserVisible(false);
      await loadDashboardData();
    } catch (error: any) {
      setEditProfileError(error?.message || 'Không thể cập nhật thông tin người dùng.');
    } finally {
      setIsSavingUser(false);
    }
  }, [editProfileForm, loadDashboardData, selectedUser, validateEditProfile]);

  const handleUpdateUserStatus = useCallback(async (row: UserManagementRow) => {
    const currentStatus = getCanonicalStatus(row.status);
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    setUserActionError('');

    if (row.id === adminProfile?.user_id && nextStatus === 'inactive') {
      setUserActionError('Admin không thể khóa chính tài khoản đang đăng nhập.');
      return;
    }

    if (nextStatus === 'inactive') {
      const confirmed = Platform.OS === 'web'
        ? ((globalThis as any).confirm?.('Bạn chắc chắn muốn khóa tài khoản này? Người dùng sẽ bị chặn đăng nhập ngay lập tức.') ?? true)
        : true;
      if (!confirmed) return;
    }

    setIsSavingUser(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_account_status', {
        target_user_id: row.id,
        new_status: nextStatus,
      });

      if (error) throw error;
      await loadDashboardData();
    } catch (error: any) {
      setUserActionError(error?.message || 'Không thể cập nhật trạng thái tài khoản.');
    } finally {
      setIsSavingUser(false);
    }
  }, [adminProfile?.user_id, loadDashboardData]);

  const exportUsersCsv = useCallback(() => {
    setUserActionError('');

    if (Platform.OS !== 'web') {
      setUserActionError('Tính năng xuất file chỉ hỗ trợ trên trình duyệt web.');
      return;
    }

    const headers = [
      'UID',
      'Họ tên',
      'Email',
      'Số điện thoại',
      'Trạng thái',
      'Vai trò',
      'Ngày đăng ký',
      'Lần hoạt động cuối',
      'Tổng giao dịch',
      'Giao dịch thủ công',
      'Giao dịch AI',
      'Lượt scan log',
      'Feedback',
    ];

    const csvRows = filteredUserRows.map((row) => [
      row.id,
      row.fullName,
      row.email,
      row.phone,
      getStatusLabel(row.status),
      getRoleLabel(row.isAdmin),
      formatDateTime(row.joinDate),
      formatDateTime(row.lastActive),
      row.totalTransactions,
      row.manualTransactions,
      row.aiTransactions,
      row.scanLogs,
      row.feedbacks,
    ]);
    const csv = [headers, ...csvRows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const filename = `usermanagement_${formatExportTimestamp()}.csv`;
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredUserRows]);

  const sendExpoPushForCampaign = useCallback(async (recipientIds: string[], title: string, body: string) => {
    if (Platform.OS === 'web') {
      console.info('Bỏ qua Expo remote push trên web; in-app notifications vẫn được tạo qua Supabase.');
      return;
    }

    if (recipientIds.length === 0) return;

    const pushMessages = dashboardData.notificationSettings
      .filter((setting) =>
        recipientIds.includes(setting.user_id) &&
        setting.push_enabled &&
        isValidExpoPushToken(setting.expo_push_token)
      )
      .map((setting) => ({
        to: setting.expo_push_token,
        title,
        body,
        sound: 'default',
        data: { source: 'admin_campaign' },
      }));

    if (pushMessages.length === 0) return;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessages),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(errorBody || `Không thể gửi thông báo đẩy qua Expo. HTTP ${response.status}`);
    }
  }, [dashboardData.notificationSettings]);

  const resetCampaignForm = useCallback(() => {
    setNotificationTitle('');
    setNotificationBody('');
    setCampaignAudience('all_users');
    setCampaignDelivery('now');
    setCampaignSchedule('');
    setCampaignSearch('');
    setSelectedCampaignUserIds([]);
    setCampaignError('');
    setEditingCampaignId(null);
  }, []);

  const closeCampaignModal = useCallback(() => {
    setShowCreateNotification(false);
    resetCampaignForm();
  }, [resetCampaignForm]);

  const openCreateNotification = useCallback(() => {
    resetCampaignForm();
    setShowCreateNotification(true);
  }, [resetCampaignForm]);

  const openEditCampaign = useCallback((campaign: NotificationCampaignRow) => {
    const targetIds = dashboardData.notificationTargets
      .filter((target) => target.campaign_id === campaign.campaign_id)
      .map((target) => target.user_id);

    setCampaignError('');
    setEditingCampaignId(campaign.campaign_id);
    setNotificationTitle(campaign.title || '');
    setNotificationBody(campaign.body || '');
    setCampaignAudience(campaign.target_audience === 'specific_users' ? 'specific_users' : 'all_users');
    setCampaignDelivery('scheduled');
    setCampaignSchedule(campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : '');
    setSelectedCampaignUserIds(targetIds);
    setCampaignSearch('');
    setShowCreateNotification(true);
  }, [dashboardData.notificationTargets]);

  const handleCreateCampaign = useCallback(async () => {
    const title = notificationTitle.trim();
    const body = notificationBody.trim();
    const isEditingCampaign = Boolean(editingCampaignId);
    const effectiveDelivery: CampaignDelivery = isEditingCampaign ? 'scheduled' : campaignDelivery;

    if (!title || !body) {
      setCampaignError('Vui lòng nhập tiêu đề và nội dung thông báo.');
      return;
    }

    if (title.length > 80) {
      setCampaignError('Tiêu đề không được vượt quá 80 ký tự.');
      return;
    }

    if (body.length > 240) {
      setCampaignError('Nội dung không được vượt quá 240 ký tự.');
      return;
    }

    if (campaignAudience === 'specific_users' && campaignRecipientRows.length === 0) {
      setCampaignError('Vui lòng chọn ít nhất một người dùng cụ thể.');
      return;
    }

    const scheduledAt = effectiveDelivery === 'scheduled' ? new Date(campaignSchedule) : null;
    if (effectiveDelivery === 'scheduled' && (!campaignSchedule || !scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date())) {
      setCampaignError('Thời gian lên lịch phải ở tương lai.');
      return;
    }

    setIsSavingCampaign(true);
    setCampaignError('');
    try {
      let pushWarning = '';
      const recipientIds = campaignRecipientRows.map((row) => row.id);

      if (isEditingCampaign && editingCampaignId && scheduledAt) {
        const { error: campaignUpdateError } = await supabase
          .from('notification_campaigns')
          .update({
            title,
            body,
            target_audience: campaignAudience,
            status: 'scheduled',
            scheduled_at: scheduledAt.toISOString(),
            sent_at: null,
          })
          .eq('campaign_id', editingCampaignId)
          .eq('status', 'scheduled');

        if (campaignUpdateError) throw campaignUpdateError;

        const { error: notificationDeleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('campaign_id', editingCampaignId);

        if (notificationDeleteError) throw notificationDeleteError;

        const { error: targetDeleteError } = await supabase
          .from('notification_campaign_targets')
          .delete()
          .eq('campaign_id', editingCampaignId);

        if (targetDeleteError) throw targetDeleteError;

        if (campaignAudience === 'specific_users' && recipientIds.length > 0) {
          const { error: targetInsertError } = await supabase
            .from('notification_campaign_targets')
            .insert(recipientIds.map((userId) => ({
              campaign_id: editingCampaignId,
              user_id: userId,
            })));

          if (targetInsertError) throw targetInsertError;
        }

        if (recipientIds.length > 0) {
          const { error: notificationInsertError } = await supabase
            .from('notifications')
            .insert(recipientIds.map((userId) => ({
              user_id: userId,
              type: 'admin_campaign',
              title,
              body,
              data: { source: 'admin_campaign', campaign_id: editingCampaignId },
              campaign_id: editingCampaignId,
              created_at: scheduledAt.toISOString(),
            })));

          if (notificationInsertError) throw notificationInsertError;
        }

        setShowCreateNotification(false);
        resetCampaignForm();
        await loadDashboardData();
        return;
      }

      const { data: campaignId, error } = await withRequestLabel(
        'admin_create_notification_campaign',
        supabase.rpc('admin_create_notification_campaign', {
          campaign_title: title,
          campaign_body: body,
          campaign_audience: campaignAudience,
          scheduled_for: scheduledAt ? scheduledAt.toISOString() : null,
          target_user_ids: campaignAudience === 'specific_users' ? selectedCampaignUserIds : [],
        })
      );

      if (error) throw new Error(formatRequestError('admin_create_notification_campaign', error));

      if (effectiveDelivery === 'now') {
        try {
          await sendExpoPushForCampaign(recipientIds, title, body);
        } catch (pushError: any) {
          pushWarning = formatRequestError('expo_push_send', pushError);
          console.warn('Expo push send failed:', pushError);
          if (campaignId) {
            try {
              const { error: updateError } = await withRequestLabel(
                'notification_campaigns.mark_failed',
                supabase
                  .from('notification_campaigns')
                  .update({ status: 'failed' })
                  .eq('campaign_id', campaignId)
              );
              if (updateError) {
                console.warn(formatRequestError('notification_campaigns.mark_failed', updateError));
              }
            } catch (updateError) {
              console.warn('Không thể cập nhật trạng thái failed cho campaign:', updateError);
            }
          }
        }
      }

      setShowCreateNotification(false);
      resetCampaignForm();
      await loadDashboardData();
      if (pushWarning) {
        setCampaignError(`Thông báo in-app đã được tạo, nhưng push notification chưa gửi được: ${pushWarning}`);
      }
    } catch (error: any) {
      console.error('Save notification campaign failed:', error);
      setCampaignError(error?.message || 'Không thể lưu chiến dịch thông báo.');
    } finally {
      setIsSavingCampaign(false);
    }
  }, [campaignAudience, campaignDelivery, campaignRecipientRows, campaignSchedule, editingCampaignId, loadDashboardData, notificationBody, notificationTitle, resetCampaignForm, selectedCampaignUserIds, sendExpoPushForCampaign]);

  const handleCancelCampaign = useCallback(async (campaignId: string) => {
    setCampaignError('');
    try {
      const { error } = await supabase.rpc('admin_cancel_notification_campaign', {
        target_campaign_id: campaignId,
      });
      if (error) throw error;
      await loadDashboardData();
    } catch (error: any) {
      setCampaignError(error?.message || 'Không thể hủy lịch chiến dịch.');
    }
  }, [loadDashboardData]);

  const handleDeleteCampaign = useCallback(async (campaignId: string) => {
    const confirmed = Platform.OS === 'web'
      ? ((globalThis as any).confirm?.('Xóa vĩnh viễn campaign này và toàn bộ thông báo/người nhận liên quan khỏi database?') ?? true)
      : true;
    if (!confirmed) return;

    setCampaignError('');
    try {
      const { error: notificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('campaign_id', campaignId);

      if (notificationError) throw notificationError;

      const { error: targetError } = await supabase
        .from('notification_campaign_targets')
        .delete()
        .eq('campaign_id', campaignId);

      if (targetError) throw targetError;

      const { error: campaignDeleteError } = await supabase
        .from('notification_campaigns')
        .delete()
        .eq('campaign_id', campaignId);

      if (campaignDeleteError) throw campaignDeleteError;

      await loadDashboardData();
    } catch (error: any) {
      setCampaignError(error?.message || 'Không thể xóa campaign.');
    }
  }, [loadDashboardData]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    const confirmed = Platform.OS === 'web'
      ? ((globalThis as any).confirm?.('Xóa thông báo này khỏi trung tâm thông báo của người dùng?') ?? true)
      : true;
    if (!confirmed) return;

    setCampaignError('');
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', notificationId);

      if (error) throw error;
      await loadDashboardData();
    } catch (error: any) {
      setCampaignError(error?.message || 'Không thể xóa thông báo.');
    }
  }, [loadDashboardData]);

  const handleLogin = async () => {
    setLoginError('');

    if (!email.trim() || !password) {
      setLoginError('Vui lòng nhập email và mật khẩu quản trị.');
      return;
    }

    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Không tìm thấy tài khoản đăng nhập.');

      const profile = await verifyAdminProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        setAuthState('denied');
        setLoginError('Tài khoản này không có quyền quản trị.');
        return;
      }

      setAdminProfile(profile);
      setAuthState('authenticated');
      await loadDashboardData();
    } catch (error: any) {
      setLoginError(error?.message || 'Đăng nhập Admin thất bại.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setIsSigningIn(true);

    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/admin`
        : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) throw error;
    } catch (error: any) {
      setLoginError(error?.message || 'Đăng nhập Google Admin thất bại.');
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    setShowAdminMenu(false);
    await supabase.auth.signOut();
    setAdminProfile(null);
    setDashboardData(EMPTY_DATA);
    setAuthState('unauthenticated');
  };

  const changeMonth = (direction: -1 | 1) => {
    const next = new Date(selectedYear, selectedMonth + direction, 1);
    setSelectedMonth(next.getMonth());
    setSelectedYear(next.getFullYear());
  };

  if (authState === 'loading') {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={ADMIN_COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Đang kiểm tra quyền quản trị...</Text>
      </View>
    );
  }

  if (authState === 'unauthenticated' || authState === 'denied') {
    return (
      <View style={styles.loginPage}>
        <View style={styles.loginCard}>
          <Image source={require('../../img/smartspend-logo.png')} style={styles.loginLogo} resizeMode="contain" />
          <Text style={styles.loginTitle}>Đăng nhập Quản trị</Text>
          <Text style={styles.loginSubtitle}>Chỉ tài khoản có quyền Admin mới được truy cập Dashboard.</Text>

          {loginError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={ADMIN_COLORS.error} />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Email Admin</Text>
          <TextInput
            style={styles.loginInput}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@smartspend.ai"
            placeholderTextColor={ADMIN_COLORS.muted}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>Mật khẩu</Text>
          <TextInput
            style={styles.loginInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={ADMIN_COLORS.muted}
            secureTextEntry
          />

          <TouchableOpacity style={[styles.loginButton, isSigningIn && styles.disabledButton]} onPress={handleLogin} disabled={isSigningIn}>
            {isSigningIn ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Đăng nhập Admin</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.loginButton, isSigningIn && styles.disabledButton]} onPress={handleGoogleLogin} disabled={isSigningIn}>
            <Text style={styles.loginButtonText}>Đăng nhập Admin với Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const adminName = adminProfile?.full_name || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <View style={styles.shell}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Text style={styles.appTitle}>SmartSpend AI Admin</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={ADMIN_COLORS.muted} />
            <Text style={styles.searchPlaceholder}>Tìm người dùng / lượt quét / góp ý...</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={20} color={ADMIN_COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminChip} onPress={() => setShowAdminMenu((prev) => !prev)}>
            <View style={styles.avatar}>
              {adminProfile?.avatar_url ? (
                <Image source={{ uri: adminProfile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{adminInitial}</Text>
              )}
            </View>
            <Text style={styles.adminName}>{adminName}</Text>
            <Ionicons name="chevron-down" size={16} color={ADMIN_COLORS.muted} />
          </TouchableOpacity>

          {showAdminMenu ? (
            <View style={styles.adminDropdown}>
              <Text style={styles.dropdownEmail}>ID: {adminProfile?.user_id.slice(0, 8)}...</Text>
              <TouchableOpacity style={styles.dropdownAction} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color={ADMIN_COLORS.error} />
                <Text style={styles.dropdownLogout}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.sidebar}>
          <SidebarItem icon="home" label="Tổng quan" active={activeSection === 'dashboard'} onPress={() => navigateAdminSection('dashboard')} />
          <SidebarItem icon="people-outline" label="Người dùng" active={activeSection === 'users'} onPress={() => navigateAdminSection('users')} />
          <SidebarItem icon="megaphone-outline" label="Thông báo" active={activeSection === 'notifications'} onPress={() => navigateAdminSection('notifications')} />
          <SidebarItem icon="scan-outline" label="Nhật ký AI" active={activeSection === 'ai_logs'} onPress={() => navigateAdminSection('ai_logs')} />
          <SidebarItem icon="chatbubble-ellipses-outline" label="Góp ý" active={activeSection === 'feedback'} onPress={() => navigateAdminSection('feedback')} />
          <SidebarItem icon="document-text-outline" label="Kiểm toán" />
          <SidebarItem icon="pulse-outline" label="Sức khỏe" />
          <SidebarItem icon="settings-outline" label="Cài đặt" />
        </View>

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          {activeSection === 'notifications' ? (
            <NotificationsPage
              styles={styles}
              ADMIN_COLORS={ADMIN_COLORS}
              campaignError={campaignError}
              dashboardData={dashboardData}
              activeNotificationRows={activeNotificationRows}
              profileByUserId={profileByUserId}
              openCreateNotification={openCreateNotification}
              openEditCampaign={openEditCampaign}
              setSelectedNotificationId={setSelectedNotificationId}
              handleCancelCampaign={handleCancelCampaign}
              handleDeleteCampaign={handleDeleteCampaign}
              handleDeleteNotification={handleDeleteNotification}
              MetricCard={MetricCard}
              formatNumber={formatNumber}
              formatDateTime={formatDateTime}
              getEffectiveCampaignStatus={getEffectiveCampaignStatus}
              isCampaignScheduledForFuture={isCampaignScheduledForFuture}
              isCampaignFailed={isCampaignFailed}
              getCampaignStatusLabel={getCampaignStatusLabel}
              getCampaignSentAt={getCampaignSentAt}
              getNotificationTypeLabel={getNotificationTypeLabel}
            />
          ) : activeSection === 'ai_logs' ? (
            <AILogsPage
              styles={styles}
              ADMIN_COLORS={ADMIN_COLORS}
              aiLogError={aiLogError}
              aiLogSearch={aiLogSearch}
              setAiLogSearch={setAiLogSearch}
              aiLogStatusFilter={aiLogStatusFilter}
              setAiLogStatusFilter={setAiLogStatusFilter}
              aiLogRows={aiLogRows}
              filteredAiLogRows={filteredAiLogRows}
              aiLogMetrics={aiLogMetrics}
              openAiLogDetail={openAiLogDetail}
              loadDashboardData={loadDashboardData}
              MetricCard={MetricCard}
              formatNumber={formatNumber}
              formatDateTime={formatDateTime}
              formatDuration={formatDuration}
              maskEmail={maskEmail}
            />
          ) : activeSection === 'feedback' ? (
            <FeedbackPage
              styles={styles}
              ADMIN_COLORS={ADMIN_COLORS}
              feedbackError={feedbackError}
              feedbackSearch={feedbackSearch}
              setFeedbackSearch={setFeedbackSearch}
              feedbackStatusFilter={feedbackStatusFilter}
              setFeedbackStatusFilter={setFeedbackStatusFilter}
              feedbackTypeFilter={feedbackTypeFilter}
              setFeedbackTypeFilter={setFeedbackTypeFilter}
              feedbackRows={feedbackRows}
              filteredFeedbackRows={filteredFeedbackRows}
              feedbackMetrics={feedbackMetrics}
              openFeedbackDetail={openFeedbackDetail}
              MetricCard={MetricCard}
              formatNumber={formatNumber}
              formatDateTime={formatDateTime}
              maskEmail={maskEmail}
              getFeedbackStatusLabel={getFeedbackStatusLabel}
              getFeedbackTypeLabel={getFeedbackTypeLabel}
              getFeedbackPriorityLabel={getFeedbackPriorityLabel}
            />
          ) : activeSection === 'users' ? (
            <UsersPage
              styles={styles}
              ADMIN_COLORS={ADMIN_COLORS}
              userActionError={userActionError}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              userStatusFilter={userStatusFilter}
              setUserStatusFilter={setUserStatusFilter}
              userRows={userRows}
              filteredUserRows={filteredUserRows}
              isSavingUser={isSavingUser}
              exportUsersCsv={exportUsersCsv}
              loadDashboardData={loadDashboardData}
              openUserDetail={openUserDetail}
              openEditUser={openEditUser}
              handleUpdateUserStatus={handleUpdateUserStatus}
              MetricCard={MetricCard}
              formatNumber={formatNumber}
              maskEmail={maskEmail}
              getCanonicalStatus={getCanonicalStatus}
              getStatusLabel={getStatusLabel}
              getRoleLabel={getRoleLabel}
              formatDate={formatDate}
            />
          ) : (
            <DashboardPage
              styles={styles}
              ADMIN_COLORS={ADMIN_COLORS}
              monthNames={monthNames}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              dashboardTimeRange={dashboardTimeRange}
              setDashboardTimeRange={setDashboardTimeRange}
              dashboardTimeRangeOptions={DASHBOARD_TIME_RANGE_OPTIONS}
              adminName={adminName}
              dashboardError={dashboardError}
              isDashboardLoading={isDashboardLoading}
              metrics={metrics}
              changeMonth={changeMonth}
              loadDashboardData={loadDashboardData}
              MetricCard={MetricCard}
              LineChart={LineChart}
              DonutChart={DonutChart}
              FailureReasonChart={FailureReasonChart}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
              formatDuration={formatDuration}
            />
          )}
        </ScrollView>

        <Modal visible={showCreateNotification} transparent animationType="fade" onRequestClose={closeCampaignModal}>
          <View style={styles.modalBackdrop}>
            <View style={styles.notificationModal}>
              <View style={styles.editUserHeader}>
                <Text style={styles.editUserTitle}>{editingCampaignId ? 'Chỉnh sửa thông báo đã lên lịch' : 'Tạo thông báo mới'}</Text>
                <TouchableOpacity onPress={closeCampaignModal}>
                  <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.notificationModalScroll} contentContainerStyle={styles.notificationModalContent}>
                {campaignError ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
                    <Text style={styles.errorText}>{campaignError}</Text>
                  </View>
                ) : null}

                <Text style={styles.inputLabel}>Tiêu đề *</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={notificationTitle}
                  onChangeText={setNotificationTitle}
                  placeholder="Nhập tiêu đề thông báo"
                  placeholderTextColor={ADMIN_COLORS.muted}
                  maxLength={80}
                />

                <Text style={styles.inputLabel}>Nội dung *</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.notificationBodyInput]}
                  value={notificationBody}
                  onChangeText={setNotificationBody}
                  placeholder="Nhập nội dung tối đa 240 ký tự"
                  placeholderTextColor={ADMIN_COLORS.muted}
                  maxLength={240}
                  multiline
                />

                <Text style={styles.inputLabel}>Đối tượng nhận</Text>
                <View style={styles.frequencyRow}>
                  <TouchableOpacity
                    style={[styles.statusFilterButton, campaignAudience === 'all_users' && styles.statusFilterButtonActive]}
                    onPress={() => setCampaignAudience('all_users')}
                  >
                    <Text style={[styles.statusFilterText, campaignAudience === 'all_users' && styles.statusFilterTextActive]}>Tất cả người dùng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusFilterButton, campaignAudience === 'specific_users' && styles.statusFilterButtonActive]}
                    onPress={() => setCampaignAudience('specific_users')}
                  >
                    <Text style={[styles.statusFilterText, campaignAudience === 'specific_users' && styles.statusFilterTextActive]}>Chọn người dùng cụ thể</Text>
                  </TouchableOpacity>
                </View>

                {campaignAudience === 'specific_users' ? (
                  <View style={styles.specificUserPicker}>
                    <View style={styles.userSearchBox}>
                      <Ionicons name="search" size={16} color={ADMIN_COLORS.muted} />
                      <TextInput
                        style={styles.userSearchInput}
                        value={campaignSearch}
                        onChangeText={setCampaignSearch}
                        placeholder="Tìm theo tên, email hoặc UID..."
                        placeholderTextColor={ADMIN_COLORS.muted}
                      />
                    </View>
                    <Text style={styles.selectedUserHint}>
                      Sẽ gửi tới {formatNumber(campaignRecipientRows.length)} người dùng hợp lệ.
                    </Text>
                    <ScrollView style={styles.specificUserList} nestedScrollEnabled>
                      {filteredCampaignUsers.map((row) => {
                        const checked = selectedCampaignUserIds.includes(row.id);
                        return (
                          <TouchableOpacity
                            key={row.id}
                            style={styles.specificUserRow}
                            onPress={() => setSelectedCampaignUserIds((prev) =>
                              checked ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                            )}
                          >
                            <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
                              {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.userNameText}>{row.fullName}</Text>
                              <Text style={styles.userIdText}>{row.email || row.id}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                <Text style={styles.inputLabel}>Lịch gửi</Text>
                {editingCampaignId ? (
                  <Text style={styles.detailHint}>Đang chỉnh sửa campaign đã lên lịch. Nếu cần gửi ngay, hãy tạo campaign mới.</Text>
                ) : (
                  <View style={styles.frequencyRow}>
                    <TouchableOpacity
                      style={[styles.statusFilterButton, campaignDelivery === 'now' && styles.statusFilterButtonActive]}
                      onPress={() => setCampaignDelivery('now')}
                    >
                      <Text style={[styles.statusFilterText, campaignDelivery === 'now' && styles.statusFilterTextActive]}>Gửi ngay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusFilterButton, campaignDelivery === 'scheduled' && styles.statusFilterButtonActive]}
                      onPress={() => setCampaignDelivery('scheduled')}
                    >
                      <Text style={[styles.statusFilterText, campaignDelivery === 'scheduled' && styles.statusFilterTextActive]}>Lên lịch</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(editingCampaignId || campaignDelivery === 'scheduled') ? (
                  <>
                    <Text style={styles.inputLabel}>Thời gian lên lịch</Text>
                    <TextInput
                      style={styles.adminFormInput}
                      value={campaignSchedule}
                      onChangeText={setCampaignSchedule}
                      placeholder="2026-08-04T21:00"
                      placeholderTextColor={ADMIN_COLORS.muted}
                    />
                  </>
                ) : null}

                <View style={styles.pushPreview}>
                  <Text style={styles.pushPreviewLabel}>Xem trước thông báo</Text>
                  <Text style={styles.pushPreviewTitle}>{notificationTitle || 'Tiêu đề thông báo'}</Text>
                  <Text style={styles.pushPreviewBody}>{notificationBody || 'Nội dung thông báo sẽ hiển thị tại đây.'}</Text>
                  <Text style={styles.pushPreviewMeta}>Ước tính người nhận: {formatNumber(campaignRecipientRows.length)}</Text>
                </View>

                <View style={styles.editUserActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeCampaignModal}>
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveAdminButton, isSavingCampaign && styles.disabledButton]} onPress={handleCreateCampaign} disabled={isSavingCampaign}>
                    {isSavingCampaign ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAdminButtonText}>{editingCampaignId ? 'Lưu thay đổi' : campaignDelivery === 'now' ? 'Gửi ngay' : 'Lên lịch'}</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(selectedNotification)} transparent animationType="fade" onRequestClose={() => setSelectedNotificationId(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.notificationDetailModal}>
              {selectedNotification ? (
                <>
                  <View style={styles.editUserHeader}>
                    <Text style={styles.editUserTitle}>Chi tiết thông báo</Text>
                    <TouchableOpacity onPress={() => setSelectedNotificationId(null)}>
                      <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView contentContainerStyle={styles.notificationDetailContent}>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Tiêu đề</Text>
                      <Text style={styles.detailValue}>{selectedNotification.title}</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Nội dung</Text>
                      <Text style={styles.detailValue}>{selectedNotification.body || 'Không có nội dung.'}</Text>
                    </View>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Người nhận</Text>
                        <Text style={styles.detailValue}>{profileByUserId.get(selectedNotification.user_id)?.full_name || selectedNotification.user_id}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Loại</Text>
                        <Text style={styles.detailValue}>{getNotificationTypeLabel(selectedNotification.type)}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Trạng thái đọc</Text>
                        <Text style={styles.detailValue}>{selectedNotification.is_read || selectedNotification.read_at ? 'Đã đọc' : 'Chưa đọc'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Ngày tạo</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedNotification.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Campaign ID</Text>
                      <Text style={styles.detailValue}>{selectedNotification.campaign_id || 'Không thuộc campaign'}</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Dữ liệu bổ sung</Text>
                      <Text style={styles.detailValue}>{selectedNotification.data ? JSON.stringify(selectedNotification.data, null, 2) : 'Không có'}</Text>
                    </View>
                  </ScrollView>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(selectedAiLog)} transparent animationType="fade" onRequestClose={() => setSelectedScanLogId(null)}>
          <View style={styles.drawerBackdrop}>
            <View style={styles.aiLogDrawer}>
              {selectedAiLog ? (
                <>
                  <View style={styles.drawerHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.drawerTitle}>Chi tiết nhật ký AI: {selectedAiLog.displayCode}</Text>
                      <Text style={styles.drawerSubtitle}>{selectedAiLog.userName} • {selectedAiLog.userEmail || selectedAiLog.user_id}</Text>
                      <View style={styles.drawerStatusRow}>
                        <View style={[styles.statusPill, selectedAiLog.failed ? styles.statusPillInactive : styles.statusPillActive]}>
                          <Text style={[styles.statusPillText, selectedAiLog.failed ? styles.statusTextInactive : styles.statusTextActive]}>
                            {selectedAiLog.statusLabel}
                          </Text>
                        </View>
                        <Text style={styles.drawerRole}>{selectedAiLog.reviewLabel}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setSelectedScanLogId(null)}>
                      <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent}>
                    {aiLogError ? (
                      <View style={styles.errorBanner}>
                        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
                        <Text style={styles.errorText}>{aiLogError}</Text>
                      </View>
                    ) : null}

                    <View style={styles.drawerMetricsGrid}>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{selectedAiLog.confidenceLabel}</Text>
                        <Text style={styles.drawerMetricLabel}>Độ chính xác</Text>
                      </View>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{formatDuration(selectedAiLog.processingTimeMs)}</Text>
                        <Text style={styles.drawerMetricLabel}>Thời gian xử lý</Text>
                      </View>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{selectedAiLog.reviewed ? 'Có' : 'Chưa'}</Text>
                        <Text style={styles.drawerMetricLabel}>Đã kiểm tra</Text>
                      </View>
                    </View>

                    <View style={styles.detailGrid}>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Scan log ID</Text>
                        <Text style={styles.detailValue}>{selectedAiLog.scan_log_id}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Transaction ID</Text>
                        <Text style={styles.detailValue}>{selectedAiLog.transactionId || 'Chưa liên kết giao dịch'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Receipt ID</Text>
                        <Text style={styles.detailValue}>{selectedAiLog.receipt_id || 'Chưa có receipt'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Ngày quét</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedAiLog.created_at)}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Danh mục AI đề xuất</Text>
                        <Text style={styles.detailValue}>{selectedAiLog.suggestedCategoryLabel}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Danh mục sau kiểm tra</Text>
                        <Text style={styles.detailValue}>{selectedAiLog.finalCategoryLabel || 'Chưa relabel'}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailCard, styles.feedbackDetailFullCard]}>
                      <Text style={styles.detailLabel}>Ảnh biên lai gốc</Text>
                      {selectedAiLog.receiptImageUrl ? (
                        <TouchableOpacity style={styles.aiLogReceiptPreview} onPress={() => setPreviewAttachmentUrl(selectedAiLog.receiptImageUrl)}>
                          <Image source={{ uri: selectedAiLog.receiptImageUrl }} style={styles.aiLogReceiptImage} resizeMode="contain" />
                          <Text style={styles.feedbackAttachmentLink}>Nhấn để xem phóng to</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.detailValue}>Chưa có URL ảnh biên lai. Hãy chạy migration UC17 và quét lại để log lưu ảnh.</Text>
                      )}
                    </View>

                    <View style={[styles.detailCard, styles.feedbackDetailFullCard]}>
                      <Text style={styles.detailLabel}>OCR text / Chuỗi nhận dạng</Text>
                      <Text style={styles.detailValue}>{selectedAiLog.rawOcrText || 'Chưa có raw OCR text.'}</Text>
                    </View>

                    <View style={[styles.detailCard, styles.feedbackDetailFullCard]}>
                      <Text style={styles.detailLabel}>Dữ liệu AI trích xuất</Text>
                      <Text style={styles.detailValue}>
                        {selectedAiLog.extractedFields ? JSON.stringify(selectedAiLog.extractedFields, null, 2) : 'Chưa có extracted_fields.'}
                      </Text>
                    </View>

                    {selectedAiLog.error_code || selectedAiLog.error_message ? (
                      <View style={[styles.detailCard, styles.feedbackDetailFullCard]}>
                        <Text style={styles.detailLabel}>Mã lỗi / Nội dung lỗi</Text>
                        <Text style={styles.detailValue}>{selectedAiLog.error_code || 'NO_CODE'}</Text>
                        <Text style={styles.detailHint}>{selectedAiLog.error_message || 'Không có mô tả lỗi.'}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.drawerSectionTitle}>Relabel Data</Text>
                    <Text style={styles.detailHint}>Nếu AI phân loại sai, chọn danh mục đúng rồi lưu. Hành động sẽ đánh dấu log là đã kiểm tra và ghi audit log theo UC17.</Text>
                    <View style={styles.statusFilterGroup}>
                      {relabelCategoryOptions.map((category) => (
                        <TouchableOpacity
                          key={category.category_id}
                          style={[styles.statusFilterButton, relabelCategoryId === category.category_id && styles.statusFilterButtonActive]}
                          onPress={() => setRelabelCategoryId(category.category_id)}
                        >
                          <Text style={[styles.statusFilterText, relabelCategoryId === category.category_id && styles.statusFilterTextActive]}>{category.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Ghi chú kiểm tra</Text>
                    <TextInput
                      style={[styles.adminFormInput, styles.feedbackTextarea]}
                      value={relabelNotes}
                      onChangeText={setRelabelNotes}
                      placeholder="Ví dụ: AI gán sai danh mục, ảnh mờ, không đọc được tổng tiền..."
                      placeholderTextColor={ADMIN_COLORS.muted}
                      multiline
                      textAlignVertical="top"
                    />

                    <View style={styles.editUserActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedScanLogId(null)}>
                        <Text style={styles.cancelButtonText}>Đóng</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.saveAdminButton, isSavingAiLog && styles.disabledButton]} onPress={handleSaveAiLogReview} disabled={isSavingAiLog}>
                        {isSavingAiLog ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAdminButtonText}>Lưu kiểm tra</Text>}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(selectedFeedback)} transparent animationType="fade" onRequestClose={() => setSelectedFeedbackId(null)}>
          <View style={styles.drawerBackdrop}>
            <View style={styles.feedbackDrawer}>
              {selectedFeedback ? (
                <>
                  <View style={styles.drawerHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.drawerTitle}>Chi tiết phản hồi: {selectedFeedback.displayCode}</Text>
                      <Text style={styles.drawerSubtitle}>{selectedFeedback.subject}</Text>
                      <View style={styles.drawerStatusRow}>
                        <View style={[styles.statusPill, selectedFeedback.status === 'resolved' || selectedFeedback.status === 'closed' ? styles.statusPillActive : styles.statusPillInactive]}>
                          <Text style={[styles.statusPillText, selectedFeedback.status === 'resolved' || selectedFeedback.status === 'closed' ? styles.statusTextActive : styles.statusTextInactive]}>
                            {getFeedbackStatusLabel(selectedFeedback.status)}
                          </Text>
                        </View>
                        <Text style={styles.drawerRole}>{getFeedbackPriorityLabel(selectedFeedback.priority)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setSelectedFeedbackId(null)}>
                      <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent}>
                    {feedbackError ? (
                      <View style={styles.errorBanner}>
                        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
                        <Text style={styles.errorText}>{feedbackError}</Text>
                      </View>
                    ) : null}

                    <View style={styles.detailGrid}>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Mã phản hồi</Text>
                        <Text style={styles.detailValue}>{selectedFeedback.feedback_id}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>User ID</Text>
                        <Text style={styles.detailValue}>{selectedFeedback.user_id}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Email người dùng</Text>
                        <Text style={styles.detailValue}>{selectedFeedback.userEmail || 'Chưa có email'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Thời gian gửi</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedFeedback.created_at)}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Danh mục</Text>
                        <Text style={styles.detailValue}>{selectedFeedback.categoryLabel}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Loại</Text>
                        <Text style={styles.detailValue}>{getFeedbackTypeLabel(selectedFeedback.feedbackType)}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Ưu tiên</Text>
                        <Text style={styles.detailValue}>{getFeedbackPriorityLabel(selectedFeedback.priority)}</Text>
                        <Text style={styles.detailHint}>{getFeedbackPriorityReason(selectedFeedback)}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailCard, styles.feedbackDetailFullCard]}>
                      <Text style={styles.detailLabel}>Mô tả từ người dùng</Text>
                      <Text style={styles.detailValue}>{selectedFeedback.content}</Text>
                    </View>

                    <View style={[styles.detailCard, styles.feedbackDetailFullCard]}>
                      <Text style={styles.detailLabel}>Ảnh đính kèm</Text>
                      {selectedFeedback.attachment_url ? (
                        <TouchableOpacity style={styles.feedbackAttachmentPreview} onPress={() => setPreviewAttachmentUrl(selectedFeedback.attachment_url)}>
                          <View style={styles.feedbackAttachmentImageFrame}>
                            <Image source={{ uri: selectedFeedback.attachment_url }} style={styles.feedbackAttachmentImage} resizeMode="contain" />
                          </View>
                          <Text style={styles.feedbackAttachmentLink}>Nhấn để xem phóng to</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.detailValue}>Không có ảnh đính kèm.</Text>
                      )}
                    </View>

                    {selectedFeedback.dev_tracking_id || selectedFeedback.dev_status ? (
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Theo dõi Dev Team</Text>
                        <Text style={styles.detailValue}>Trạng thái: {selectedFeedback.dev_status || 'Chưa chuyển'}</Text>
                        <Text style={styles.detailValue}>Tracking: {selectedFeedback.dev_tracking_id || 'Chưa có'}</Text>
                        <Text style={styles.detailValue}>Email Dev: {selectedFeedback.dev_email || 'Chưa có'}</Text>
                        <Text style={styles.detailValue}>Module: {selectedFeedback.related_module || 'Chưa chọn'}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.drawerSectionTitle}>Ghi chú nội bộ</Text>
                    <TextInput
                      style={[styles.adminFormInput, styles.feedbackTextarea]}
                      value={feedbackInternalNotes}
                      onChangeText={setFeedbackInternalNotes}
                      placeholder="Ghi chú chỉ dành cho Admin..."
                      placeholderTextColor={ADMIN_COLORS.muted}
                      multiline
                      textAlignVertical="top"
                    />

                    <Text style={styles.drawerSectionTitle}>Phản hồi cho người dùng *</Text>
                    <TextInput
                      style={[styles.adminFormInput, styles.feedbackTextarea]}
                      value={feedbackResponse}
                      onChangeText={setFeedbackResponse}
                      placeholder="Nhập nội dung phản hồi bằng tiếng Việt..."
                      placeholderTextColor={ADMIN_COLORS.muted}
                      multiline
                      textAlignVertical="top"
                    />

                    <Text style={styles.drawerSectionTitle}>Trạng thái sau khi lưu</Text>
                    <View style={styles.statusFilterGroup}>
                      {([
                        ['in_progress', 'Đang xử lý'],
                        ['resolved', 'Đã giải quyết'],
                        ['closed', 'Đã đóng'],
                      ] as [Exclude<FeedbackStatusFilter, 'all'>, string][]).map(([value, label]) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.statusFilterButton, feedbackDetailStatus === value && styles.statusFilterButtonActive]}
                          onPress={() => setFeedbackDetailStatus(value)}
                        >
                          <Text style={[styles.statusFilterText, feedbackDetailStatus === value && styles.statusFilterTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.editUserActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForwardDevModal(true)}>
                        <Text style={styles.cancelButtonText}>Chuyển cho Dev Team</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.saveAdminButton, isSavingFeedback && styles.disabledButton]} onPress={handleSubmitFeedbackResponse} disabled={isSavingFeedback}>
                        {isSavingFeedback ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAdminButtonText}>Lưu phản hồi</Text>}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal visible={showForwardDevModal} transparent animationType="fade" onRequestClose={() => setShowForwardDevModal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.forwardDevModal}>
              <View style={styles.editUserHeader}>
                <Text style={styles.editUserTitle}>Chuyển báo cáo cho Dev Team</Text>
                <TouchableOpacity onPress={() => setShowForwardDevModal(false)}>
                  <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailValue}>Email nhận trực tiếp: nguyentrinhtuanvan@gmail.com</Text>
              {selectedFeedback ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Xác nhận phản hồi sẽ chuyển</Text>
                  <Text style={styles.detailValue}>Mã: {selectedFeedback.displayCode}</Text>
                  <Text style={styles.detailValue}>User: {selectedFeedback.user_id}</Text>
                  <Text style={styles.detailValue}>Email: {selectedFeedback.userEmail || 'Chưa có email'}</Text>
                  <Text style={styles.detailValue}>Tiêu đề: {selectedFeedback.subject}</Text>
                </View>
              ) : null}
              <Text style={styles.inputLabel}>Module liên quan</Text>
              <View style={styles.statusFilterGroup}>
                {FEEDBACK_RELATED_MODULES.map((module) => (
                  <TouchableOpacity
                    key={module}
                    style={[styles.statusFilterButton, forwardRelatedModule === module && styles.statusFilterButtonActive]}
                    onPress={() => setForwardRelatedModule(module)}
                  >
                    <Text style={[styles.statusFilterText, forwardRelatedModule === module && styles.statusFilterTextActive]}>{module}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Mức độ ưu tiên</Text>
              <View style={styles.statusFilterGroup}>
                {FEEDBACK_PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusFilterButton, forwardPriority === option.value && styles.statusFilterButtonActive]}
                    onPress={() => setForwardPriority(option.value)}
                  >
                    <Text style={[styles.statusFilterText, forwardPriority === option.value && styles.statusFilterTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Ghi chú kỹ thuật *</Text>
              <TextInput
                style={[styles.adminFormInput, styles.feedbackTextarea]}
                value={forwardTechnicalNotes}
                onChangeText={setForwardTechnicalNotes}
                placeholder="Mô tả bước tái hiện, log, module nghi ngờ, dữ liệu liên quan..."
                placeholderTextColor={ADMIN_COLORS.muted}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.editUserActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForwardDevModal(false)}>
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveAdminButton, isForwardingFeedback && styles.disabledButton]} onPress={handleForwardFeedbackToDev} disabled={isForwardingFeedback}>
                  {isForwardingFeedback ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAdminButtonText}>Chuyển Dev</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(previewAttachmentUrl)} transparent animationType="fade" onRequestClose={() => setPreviewAttachmentUrl(null)}>
          <View style={styles.attachmentLightbox}>
            <TouchableOpacity style={styles.attachmentCloseButton} onPress={() => setPreviewAttachmentUrl(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {previewAttachmentUrl ? <Image source={{ uri: previewAttachmentUrl }} style={styles.attachmentLightboxImage} resizeMode="contain" /> : null}
          </View>
        </Modal>

        <Modal visible={Boolean(selectedUser)} transparent animationType="fade" onRequestClose={() => setSelectedUserId(null)}>
          <View style={styles.drawerBackdrop}>
            <View style={styles.userDrawer}>
              {selectedUser ? (
                <>
                  <View style={styles.drawerHeader}>
                    <View style={styles.drawerUserIntro}>
                      <View style={styles.drawerAvatar}>
                        {selectedUser.avatarUrl ? (
                          <Image source={{ uri: selectedUser.avatarUrl }} style={styles.drawerAvatarImage} />
                        ) : (
                          <Text style={styles.drawerAvatarText}>{selectedUser.fullName.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <View>
                        <Text style={styles.drawerTitle}>{selectedUser.fullName}</Text>
                        <Text style={styles.drawerSubtitle}>{selectedUser.email || 'Chưa có email'}</Text>
                        <View style={styles.drawerStatusRow}>
                          <View style={[styles.statusPill, getCanonicalStatus(selectedUser.status) === 'active' ? styles.statusPillActive : styles.statusPillInactive]}>
                            <Text style={[styles.statusPillText, getCanonicalStatus(selectedUser.status) === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
                              {getStatusLabel(selectedUser.status)}
                            </Text>
                          </View>
                          <Text style={styles.drawerRole}>{getRoleLabel(selectedUser.isAdmin)}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setSelectedUserId(null)}>
                      <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent}>
                    <View style={styles.drawerMetricsGrid}>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{formatNumber(selectedUser.totalTransactions)}</Text>
                        <Text style={styles.drawerMetricLabel}>Tổng giao dịch</Text>
                      </View>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{formatNumber(selectedUser.aiTransactions)}</Text>
                        <Text style={styles.drawerMetricLabel}>Giao dịch AI</Text>
                      </View>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{formatNumber(selectedUser.scanLogs)}</Text>
                        <Text style={styles.drawerMetricLabel}>Scan log</Text>
                      </View>
                      <View style={styles.drawerMetricCard}>
                        <Text style={styles.drawerMetricValue}>{formatNumber(selectedUser.feedbacks)}</Text>
                        <Text style={styles.drawerMetricLabel}>Feedback</Text>
                      </View>
                    </View>

                    <View style={styles.drawerActions}>
                      <TouchableOpacity style={styles.drawerPrimaryButton} onPress={() => openEditUser(selectedUser)}>
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.drawerPrimaryText}>Chỉnh sửa hồ sơ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.drawerSecondaryButton,
                          getCanonicalStatus(selectedUser.status) === 'active' ? styles.drawerDangerButton : styles.drawerSuccessButton,
                        ]}
                        onPress={() => handleUpdateUserStatus(selectedUser)}
                        disabled={isSavingUser}
                      >
                        <Text style={[
                          styles.drawerSecondaryText,
                          getCanonicalStatus(selectedUser.status) === 'active' ? styles.drawerDangerText : styles.drawerSuccessText,
                        ]}>
                          {getCanonicalStatus(selectedUser.status) === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.drawerSectionTitle}>Thông tin Auth</Text>
                    <View style={styles.attributeCard}>
                      {selectedUserAttributes.authAttributes.length === 0 ? (
                        <Text style={styles.emptyText}>Chưa có dữ liệu Auth cho người dùng này.</Text>
                      ) : selectedUserAttributes.authAttributes.map((attribute) => (
                        <View key={attribute.key} style={styles.attributeRow}>
                          <Text style={styles.attributeLabel}>{attribute.label}</Text>
                          <Text style={styles.attributeValue}>{attribute.value}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.drawerSectionTitle}>Thông tin hồ sơ</Text>
                    <View style={styles.attributeCard}>
                      {selectedUserAttributes.profileAttributes.length === 0 ? (
                        <Text style={styles.emptyText}>Người dùng chưa có hồ sơ trong user_profiles.</Text>
                      ) : selectedUserAttributes.profileAttributes.map((attribute) => (
                        <View key={attribute.key} style={styles.attributeRow}>
                          <Text style={styles.attributeLabel}>{attribute.label}</Text>
                          <Text style={styles.attributeValue}>{attribute.value}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.drawerSectionTitle}>Nhật ký thao tác</Text>
                    <View style={styles.auditLogCard}>
                      {selectedUserAuditLogs.length === 0 ? (
                        <Text style={styles.emptyText}>Chưa có nhật ký thao tác cho người dùng này.</Text>
                      ) : selectedUserAuditLogs.slice(0, 12).map((log) => (
                        <View key={log.audit_log_id} style={styles.auditLogItem}>
                          <View style={styles.auditLogHeader}>
                            <Text style={styles.auditLogAction}>{log.action}</Text>
                            <Text style={styles.auditLogTime}>{formatDateTime(log.created_at)}</Text>
                          </View>
                          <Text style={styles.auditLogMeta}>{formatAttributeValue('metadata', log.metadata)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal visible={isEditUserVisible} transparent animationType="fade" onRequestClose={() => setIsEditUserVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.editUserModal}>
              <View style={styles.editUserHeader}>
                <Text style={styles.editUserTitle}>Chỉnh sửa hồ sơ người dùng</Text>
                <TouchableOpacity onPress={() => setIsEditUserVisible(false)}>
                  <Ionicons name="close" size={22} color={ADMIN_COLORS.text} />
                </TouchableOpacity>
              </View>

              {editProfileError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
                  <Text style={styles.errorText}>{editProfileError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Họ tên *</Text>
              <TextInput
                style={styles.adminFormInput}
                value={editProfileForm.fullName}
                onChangeText={(fullName) => setEditProfileForm((prev) => ({ ...prev, fullName }))}
                placeholder="Nhập họ tên"
                placeholderTextColor={ADMIN_COLORS.muted}
              />

              <Text style={styles.inputLabel}>Ngày sinh (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.adminFormInput}
                value={editProfileForm.dateOfBirth}
                onChangeText={(dateOfBirth) => setEditProfileForm((prev) => ({ ...prev, dateOfBirth }))}
                placeholder="2003-01-31"
                placeholderTextColor={ADMIN_COLORS.muted}
              />

              <Text style={styles.inputLabel}>Nghề nghiệp</Text>
              <TextInput
                style={styles.adminFormInput}
                value={editProfileForm.job}
                onChangeText={(job) => setEditProfileForm((prev) => ({ ...prev, job }))}
                placeholder="Nhập nghề nghiệp"
                placeholderTextColor={ADMIN_COLORS.muted}
              />

              <Text style={styles.inputLabel}>Thu nhập hàng tháng</Text>
              <TextInput
                style={styles.adminFormInput}
                value={editProfileForm.income}
                onChangeText={(income) => setEditProfileForm((prev) => ({ ...prev, income }))}
                keyboardType="numeric"
                placeholder="5000000"
                placeholderTextColor={ADMIN_COLORS.muted}
              />

              <View style={styles.editUserActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditUserVisible(false)}>
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveAdminButton, isSavingUser && styles.disabledButton]} onPress={handleSaveUserProfile} disabled={isSavingUser}>
                  {isSavingUser ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAdminButtonText}>Lưu thay đổi</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.background,
    gap: 12,
  },
  loadingText: {
    color: ADMIN_COLORS.muted,
    fontSize: 14,
  },
  loginPage: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.background,
    padding: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 28,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  loginLogo: {
    width: 260,
    height: 120,
    alignSelf: 'center',
    marginBottom: 6,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: ADMIN_COLORS.text,
    textAlign: 'center',
  },
  loginSubtitle: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 14,
    color: ADMIN_COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
  },
  loginInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 16,
    color: ADMIN_COLORS.text,
    backgroundColor: '#F8FAFC',
  },
  loginButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: ADMIN_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: ADMIN_COLORS.error,
    fontSize: 13,
    lineHeight: 18,
  },
  shell: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
    backgroundColor: ADMIN_COLORS.background,
  },
  topBar: {
    height: 64,
    backgroundColor: ADMIN_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: ADMIN_COLORS.primary,
  },
  searchBox: {
    width: 340,
    height: 38,
    borderRadius: 12,
    backgroundColor: ADMIN_COLORS.background,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchPlaceholder: {
    color: ADMIN_COLORS.muted,
    fontSize: 13,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.surface,
  },
  adminChip: {
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    gap: 8,
    backgroundColor: ADMIN_COLORS.surface,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ADMIN_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: ADMIN_COLORS.primary,
    fontWeight: '900',
  },
  adminName: {
    fontSize: 13,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
  },
  adminDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 220,
    borderRadius: 16,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  dropdownEmail: {
    fontSize: 12,
    color: ADMIN_COLORS.muted,
    padding: 8,
  },
  dropdownAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  dropdownLogout: {
    color: ADMIN_COLORS.error,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    backgroundColor: ADMIN_COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
    padding: 16,
    gap: 6,
  },
  sidebarItem: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  sidebarItemActive: {
    backgroundColor: ADMIN_COLORS.primaryLight,
  },
  sidebarText: {
    fontSize: 14,
    color: ADMIN_COLORS.muted,
    fontWeight: '700',
  },
  sidebarTextActive: {
    color: ADMIN_COLORS.primary,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 24,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: ADMIN_COLORS.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthPicker: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  monthButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    minWidth: 150,
    textAlign: 'center',
    color: ADMIN_COLORS.text,
    fontWeight: '800',
  },
  refreshButton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: ADMIN_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  refreshText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  exportButton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: ADMIN_COLORS.info,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  userToolbar: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  userSearchBox: {
    flex: 1,
    minWidth: 320,
    height: 44,
    borderRadius: 14,
    backgroundColor: ADMIN_COLORS.background,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  userSearchInput: {
    flex: 1,
    height: 42,
    color: ADMIN_COLORS.text,
    fontSize: 14,
  },
  statusFilterGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusFilterButton: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusFilterButtonActive: {
    backgroundColor: ADMIN_COLORS.primaryLight,
    borderColor: ADMIN_COLORS.primary,
  },
  statusFilterText: {
    color: ADMIN_COLORS.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  statusFilterTextActive: {
    color: ADMIN_COLORS.primary,
  },
  userTableCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    overflow: 'hidden',
  },
  userTableRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  userTableHeader: {
    minHeight: 48,
    backgroundColor: '#F8FAFC',
  },
  userTableHeadText: {
    color: ADMIN_COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  userTableCell: {
    color: ADMIN_COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  userColUser: {
    flex: 1.6,
    minWidth: 190,
  },
  userColEmail: {
    flex: 1.35,
    minWidth: 160,
  },
  userColStatus: {
    width: 104,
  },
  userColRole: {
    width: 92,
  },
  userColDate: {
    width: 112,
  },
  userColMetric: {
    width: 76,
    textAlign: 'center',
  },
  userColActions: {
    width: 210,
  },
  campaignColTitle: {
    flex: 1.8,
    minWidth: 260,
  },
  campaignColAudience: {
    width: 150,
  },
  campaignColStatus: {
    width: 120,
  },
  campaignColDate: {
    width: 150,
  },
  campaignColActions: {
    width: 230,
  },
  notificationColTitle: {
    flex: 1.8,
    minWidth: 240,
  },
  notificationColUser: {
    width: 160,
  },
  notificationColType: {
    width: 150,
  },
  notificationColStatus: {
    width: 110,
  },
  notificationColDate: {
    width: 150,
  },
  notificationColActions: {
    width: 150,
  },
  feedbackColId: {
    width: 110,
  },
  feedbackColSubject: {
    flex: 1.8,
    minWidth: 240,
  },
  feedbackColUser: {
    width: 170,
  },
  feedbackColCategory: {
    width: 110,
  },
  feedbackColPriority: {
    width: 110,
  },
  feedbackColStatus: {
    width: 130,
  },
  feedbackColDate: {
    width: 150,
  },
  feedbackColActions: {
    width: 150,
  },
  aiLogColId: {
    width: 110,
  },
  aiLogColUser: {
    width: 150,
  },
  aiLogColEmail: {
    width: 170,
  },
  aiLogColCategory: {
    width: 150,
  },
  aiLogColConfidence: {
    width: 120,
  },
  aiLogColStatus: {
    width: 140,
  },
  aiLogColDate: {
    width: 150,
  },
  aiLogColActions: {
    width: 120,
  },
  userIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ADMIN_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tableAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  tableAvatarText: {
    color: ADMIN_COLORS.primary,
    fontWeight: '900',
  },
  userIdentityText: {
    flex: 1,
  },
  userNameText: {
    color: ADMIN_COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  userIdText: {
    marginTop: 2,
    color: ADMIN_COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statusTextActive: {
    color: ADMIN_COLORS.primary,
  },
  statusTextInactive: {
    color: ADMIN_COLORS.error,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableActionButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.surface,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableActionText: {
    fontSize: 12,
    color: ADMIN_COLORS.text,
    fontWeight: '900',
  },
  deactivateButton: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  activateButton: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  deactivateText: {
    color: ADMIN_COLORS.error,
  },
  activateText: {
    color: ADMIN_COLORS.primary,
  },
  userEmptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  tableFooterText: {
    marginTop: -10,
    color: ADMIN_COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  welcomeText: {
    marginTop: 6,
    fontSize: 14,
    color: ADMIN_COLORS.muted,
  },
  loadingPanel: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricTitle: {
    fontSize: 13,
    color: ADMIN_COLORS.muted,
    fontWeight: '800',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  metricSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: ADMIN_COLORS.muted,
  },
  chartCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  chartSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: ADMIN_COLORS.muted,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: ADMIN_COLORS.muted,
    fontWeight: '700',
  },
  lineChartWrap: {
    marginTop: 18,
    height: 240,
    position: 'relative',
  },
  chartHoverLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 240,
  },
  chartPointHitArea: {
    position: 'absolute',
    width: 28,
    height: 28,
    marginLeft: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPointHitDot: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  chartTooltip: {
    position: 'absolute',
    width: 150,
    marginLeft: -75,
    borderRadius: 12,
    backgroundColor: ADMIN_COLORS.text,
    paddingVertical: 9,
    paddingHorizontal: 11,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  tooltipTitle: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  tooltipValue: {
    marginTop: 3,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    alignItems: 'flex-end',
  },
  userDrawer: {
    width: 560,
    maxWidth: '100%',
    height: '100%',
    backgroundColor: ADMIN_COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: ADMIN_COLORS.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: -8, height: 0 },
  },
  feedbackDrawer: {
    width: 640,
    maxWidth: '100%',
    height: '100%',
    backgroundColor: ADMIN_COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: ADMIN_COLORS.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: -8, height: 0 },
  },
  aiLogDrawer: {
    width: 760,
    maxWidth: '100%',
    height: '100%',
    backgroundColor: ADMIN_COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: ADMIN_COLORS.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: -8, height: 0 },
  },
  drawerHeader: {
    minHeight: 112,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  drawerUserIntro: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  drawerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ADMIN_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drawerAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  drawerAvatarText: {
    color: ADMIN_COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  drawerSubtitle: {
    marginTop: 4,
    color: ADMIN_COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  drawerStatusRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerRole: {
    color: ADMIN_COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.background,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 36,
  },
  drawerMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  drawerMetricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  drawerMetricValue: {
    fontSize: 22,
    color: ADMIN_COLORS.text,
    fontWeight: '900',
  },
  drawerMetricLabel: {
    marginTop: 4,
    color: ADMIN_COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  drawerActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  drawerPrimaryButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: ADMIN_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  drawerPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  drawerSecondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  drawerDangerButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  drawerSuccessButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  drawerSecondaryText: {
    fontWeight: '900',
  },
  drawerDangerText: {
    color: ADMIN_COLORS.error,
  },
  drawerSuccessText: {
    color: ADMIN_COLORS.primary,
  },
  feedbackTextarea: {
    minHeight: 118,
    paddingTop: 12,
  },
  feedbackAttachmentPreview: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    flexShrink: 1,
  },
  feedbackAttachmentImageFrame: {
    width: '100%',
    maxWidth: '100%',
    height: 220,
    maxHeight: 220,
    backgroundColor: ADMIN_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 1,
  },
  feedbackAttachmentImage: {
    width: '100%',
    height: '100%',
    maxHeight: 220,
    flexShrink: 1,
  },
  feedbackAttachmentLink: {
    padding: 12,
    color: ADMIN_COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  aiLogReceiptPreview: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.background,
    overflow: 'hidden',
  },
  aiLogReceiptImage: {
    width: '100%',
    height: 280,
    maxHeight: 280,
  },
  forwardDevModal: {
    width: 560,
    maxWidth: '94%',
    maxHeight: '86%',
    borderRadius: 24,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  attachmentLightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCloseButton: {
    position: 'absolute',
    top: 28,
    right: 28,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.56)',
  },
  attachmentLightboxImage: {
    width: '88%',
    height: '82%',
  },
  drawerSectionTitle: {
    fontSize: 15,
    color: ADMIN_COLORS.text,
    fontWeight: '900',
  },
  attributeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.surface,
    overflow: 'hidden',
  },
  attributeRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  attributeLabel: {
    width: 150,
    color: ADMIN_COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  attributeValue: {
    flex: 1,
    color: ADMIN_COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  auditLogCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.surface,
    overflow: 'hidden',
  },
  auditLogItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    gap: 6,
  },
  auditLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  auditLogAction: {
    color: ADMIN_COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  auditLogTime: {
    color: ADMIN_COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  auditLogMeta: {
    color: ADMIN_COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  editUserModal: {
    width: 520,
    maxWidth: '100%',
    borderRadius: 22,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  editUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  editUserTitle: {
    color: ADMIN_COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  adminFormInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: '#F8FAFC',
    color: ADMIN_COLORS.text,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  editUserActions: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: ADMIN_COLORS.text,
    fontWeight: '900',
  },
  saveAdminButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: ADMIN_COLORS.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAdminButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  notificationModal: {
    width: 720,
    maxWidth: '100%',
    maxHeight: '92%',
    borderRadius: 22,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
  },
  notificationModalScroll: {
    flexShrink: 1,
  },
  notificationModalContent: {
    paddingBottom: 4,
  },
  notificationBodyInput: {
    minHeight: 92,
    maxHeight: 180,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  specificUserPicker: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  specificUserList: {
    maxHeight: 180,
    marginTop: 10,
  },
  selectedUserHint: {
    marginTop: 10,
    color: ADMIN_COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  specificUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: ADMIN_COLORS.primary,
    borderColor: ADMIN_COLORS.primary,
  },
  pushPreview: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 6,
  },
  pushPreviewLabel: {
    color: ADMIN_COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  pushPreviewTitle: {
    color: ADMIN_COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  pushPreviewBody: {
    color: ADMIN_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  pushPreviewMeta: {
    color: ADMIN_COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  notificationDetailModal: {
    width: 620,
    maxWidth: '100%',
    maxHeight: '88%',
    borderRadius: 22,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
  },
  notificationDetailContent: {
    gap: 12,
    paddingBottom: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
  },
  detailCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 220,
    minWidth: 0,
    maxWidth: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: '#F8FAFC',
    padding: 12,
    overflow: 'hidden',
  },
  feedbackDetailFullCard: {
    width: '100%',
    flexBasis: '100%',
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  detailLabel: {
    color: ADMIN_COLORS.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
  },
  detailValue: {
    maxWidth: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    color: ADMIN_COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  detailHint: {
    maxWidth: '100%',
    marginTop: 6,
    color: ADMIN_COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  chartGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  panel: {
    flex: 1,
    minWidth: 320,
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 20,
  },
  panelHeader: {
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  panelSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: ADMIN_COLORS.muted,
  },
  donutContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  donutLabel: {
    fontSize: 12,
    color: ADMIN_COLORS.muted,
  },
  splitLegend: {
    marginTop: 18,
    gap: 8,
  },
  splitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  failureList: {
    gap: 14,
  },
  failureItem: {
    gap: 8,
  },
  failureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  failureLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
  },
  failureValue: {
    fontSize: 13,
    fontWeight: '900',
    color: ADMIN_COLORS.error,
  },
  failureTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  failureBar: {
    height: 9,
    borderRadius: 999,
    backgroundColor: ADMIN_COLORS.error,
  },
  emptyText: {
    color: ADMIN_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  alertPanel: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  alertSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: ADMIN_COLORS.muted,
  },
  alertValue: {
    fontSize: 22,
    fontWeight: '900',
    color: ADMIN_COLORS.text,
  },
  alertMuted: {
    color: ADMIN_COLORS.muted,
  },
});
