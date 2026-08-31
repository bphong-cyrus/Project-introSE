// SmartSpend AI - Profile Screen

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  Image,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';
import { supabase } from '../../../data/datasources/supabase/supabase';

type EditableProfile = {
  fullName: string;
  dateOfBirth: string;
  job: string;
  income: string;
};

type UserFeedbackForm = {
  category: string;
  subject: string;
  content: string;
};

type FeedbackAttachment = {
  name: string;
  uri?: string;
  file?: File;
  mimeType?: string;
};

type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

const USER_FEEDBACK_CATEGORIES = [
  { code: 'ai_scanner', label: 'Lỗi Quét Hóa Đơn (AI Scanner)' },
  { code: 'budget', label: 'Lỗi Quản Lý Ngân Sách (Budget)' },
  { code: 'transactions', label: 'Lỗi Lịch Sử Giao Dịch (Transactions)' },
  { code: 'auth', label: 'Lỗi Đăng Nhập / Tài Khoản (Auth)' },
  { code: 'suggestion', label: 'Góp Ý Tính Năng Mới (Suggestion)' },
  { code: 'other', label: 'Khác (Other)' },
] as const;

const CRITICAL_FEEDBACK_KEYWORDS = [
  'không đăng nhập',
  'khong dang nhap',
  'bị khóa',
  'bi khoa',
  'mat tien',
  'crash',
  'sập',
  'sap',
  'khẩn cấp',
  'khan cap',
];

const HIGH_PRIORITY_FEEDBACK_CATEGORIES = ['auth', 'budget', 'transactions'];
const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const SUPPORTED_AVATAR_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const getDefaultFeedbackPriority = (category: string, subject: string, content: string): FeedbackPriority => {
  const normalizedText = `${subject} ${content}`.trim().toLowerCase();

  if (CRITICAL_FEEDBACK_KEYWORDS.some((keyword) => normalizedText.includes(keyword))) {
    return 'critical';
  }

  if (HIGH_PRIORITY_FEEDBACK_CATEGORIES.includes(category)) {
    return 'high';
  }

  if (category === 'ai_scanner') {
    return 'medium';
  }

  return 'low';
};

const getFeedbackPriorityLabel = (priority: FeedbackPriority) => {
  switch (priority) {
    case 'critical':
      return 'Khẩn cấp';
    case 'high':
      return 'Cao';
    case 'medium':
      return 'Trung bình';
    default:
      return 'Thấp';
  }
};

type AvatarUploadPayload = File | Blob | ArrayBuffer;

type AvatarUploadOptions = {
  contentType: string;
  extension: string;
};

const normalizeImageContentType = (contentType?: string | null, fileNameOrUri = '') => {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase();
  if (normalized === 'image/jpg' || normalized === 'image/pjpeg') return 'image/jpeg';
  if (normalized?.startsWith('image/')) return normalized;

  const extension = fileNameOrUri.split('?')[0]?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'image/jpeg';
  }
};

const getExtensionForContentType = (contentType: string, fileNameOrUri = '') => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default: {
      const extension = fileNameOrUri.split('?')[0]?.split('.').pop()?.toLowerCase();
      return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg';
    }
  }
};

const validateAvatarFile = (contentType: string, fileSize?: number): string | null => {
  if (!contentType.startsWith('image/')) {
    return 'File avatar phải là ảnh.';
  }

  if (!SUPPORTED_AVATAR_CONTENT_TYPES.has(contentType)) {
    return 'Avatar chỉ hỗ trợ JPG, PNG, WEBP, GIF, HEIC hoặc HEIF.';
  }

  if (fileSize !== undefined && fileSize > MAX_AVATAR_BYTES) {
    return 'Ảnh avatar không được vượt quá 5MB.';
  }

  return null;
};

const decodeBase64ToBinary = (base64: string): string => {
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of base64.replace(/=+$/g, '')) {
    const value = BASE64_CHARS.indexOf(char);
    if (value < 0) continue;

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const cleaned = base64.includes(',')
    ? base64.slice(base64.indexOf(',') + 1)
    : base64;
  const compact = cleaned.replace(/\s/g, '');
  const binary = typeof globalThis.atob === 'function'
    ? globalThis.atob(compact)
    : decodeBase64ToBinary(compact);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

interface ProfileScreenProps {
  onNavigateToChangePassword?: () => void;
  onNavigateToReports?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigateToChangePassword, onNavigateToReports }) => {
  const { user, logout, updateProfile, isLoading } = useAuth();
  const displayName = user?.fullName?.trim() || 'Người dùng';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackToast, setFeedbackToast] = useState('');
  const [feedbackAttachment, setFeedbackAttachment] = useState<FeedbackAttachment | null>(null);
  const [feedbackForm, setFeedbackForm] = useState<UserFeedbackForm>({
    category: USER_FEEDBACK_CATEGORIES[0].code,
    subject: '',
    content: '',
  });
  const [form, setForm] = useState<EditableProfile>({
    fullName: '',
    dateOfBirth: '',
    job: '',
    income: '',
  });

  useEffect(() => {
    setForm({
      fullName: user?.fullName || '',
      dateOfBirth: user?.dateOfBirth || '',
      job: user?.job || '',
      income: user?.income ? String(user.income) : '',
    });
  }, [user]);

  const showFeedbackSuccessToast = useCallback((message: string) => {
    setFeedbackToast(message);
    setTimeout(() => setFeedbackToast(''), 3500);
  }, []);

  const formatCurrency = (value?: number): string => {
    if (!value) return 'Chưa cập nhật';
    return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
  };

  const validateProfile = (): string | null => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên.';
    if (form.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) {
      return 'Ngày sinh phải có định dạng YYYY-MM-DD.';
    }
    if (form.income && Number.isNaN(Number(form.income.replace(/[^\d]/g, '')))) {
      return 'Thu nhập hàng tháng không hợp lệ.';
    }
    return null;
  };

  const handleSaveProfile = async () => {
    const validationError = validateProfile();
    if (validationError) {
      Alert.alert('Thông tin chưa hợp lệ', validationError);
      return;
    }

    const incomeValue = form.income.replace(/[^\d]/g, '');
    const result = await updateProfile({
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth.trim() || undefined,
      job: form.job.trim() || undefined,
      income: incomeValue ? Number(incomeValue) : undefined,
    });

    if (result.success) {
      setShowEditModal(false);
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
    } else {
      Alert.alert('Lỗi', result.message);
    }
  };

  const uploadAvatarPayload = async (
    payload: AvatarUploadPayload,
    options: AvatarUploadOptions
  ): Promise<boolean> => {
    if (!user) return false;

    const validationError = validateAvatarFile(options.contentType);
    if (validationError) {
      throw new Error(validationError);
    }

    const filePath = `${user.id}/avatar-${Date.now()}.${options.extension}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, payload, {
        cacheControl: '3600',
        upsert: true,
        contentType: options.contentType,
      });

    if (uploadError) {
      throw new Error(
        `${uploadError.message}\n\nHãy kiểm tra bucket Supabase Storage tên "${AVATAR_BUCKET}" và policy upload/select.`
      );
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const result = await updateProfile({ avatar: publicUrl });
    if (!result.success) {
      throw new Error(result.message);
    }

    return true;
  };

  const uploadAvatarFile = async (file: File) => {
    const contentType = normalizeImageContentType(file.type, file.name);
    const validationError = validateAvatarFile(contentType, file.size);
    if (validationError) {
      Alert.alert('Không thể cập nhật avatar', validationError);
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const extension = getExtensionForContentType(contentType, file.name);
      const uploaded = await uploadAvatarPayload(file, { contentType, extension });
      if (uploaded) {
        Alert.alert('Thành công', 'Avatar đã được cập nhật.');
      }
    } catch (error: any) {
      Alert.alert('Không thể cập nhật avatar', error?.message || 'Vui lòng thử lại sau.');
    } finally {
      setIsUploadingAvatar(false);
      setShowAvatarSheet(false);
    }
  };

  const uploadAvatarFromAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploadingAvatar(true);
    try {
      const contentType = normalizeImageContentType(asset.mimeType, asset.fileName || asset.uri);
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      const fileSize = asset.fileSize ?? (fileInfo.exists ? (fileInfo as any).size : undefined);
      const validationError = validateAvatarFile(contentType, fileSize);
      if (validationError) {
        Alert.alert('Không thể cập nhật avatar', validationError);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const extension = getExtensionForContentType(contentType, asset.fileName || asset.uri);
      const uploaded = await uploadAvatarPayload(base64ToArrayBuffer(base64), {
        contentType,
        extension,
      });

      if (uploaded) {
        Alert.alert('Thành công', 'Avatar đã được cập nhật.');
      }
    } catch (error: any) {
      Alert.alert('Không thể cập nhật avatar', error?.message || 'Vui lòng thử lại sau.');
    } finally {
      setIsUploadingAvatar(false);
      setShowAvatarSheet(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cấp quyền truy cập thư viện ảnh để cập nhật avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await uploadAvatarFromAsset(result.assets[0]);
      }
      return;
    }

    const documentRef = (globalThis as any).document;
    const input = documentRef?.createElement('input');
    if (!input) {
      Alert.alert('Lỗi', 'Không thể mở File Explorer trong môi trường hiện tại.');
      return;
    }

    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) uploadAvatarFile(file);
    };
    input.click();
  };

  const handleViewAvatar = () => {
    setShowAvatarSheet(false);
    if (!user?.avatar) {
      Alert.alert('Chưa có avatar', 'Bạn chưa cập nhật ảnh đại diện.');
      return;
    }
    setShowAvatarLightbox(true);
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = (globalThis as any).confirm?.('Bạn có chắc chắn muốn đăng xuất?') ?? true;
      if (!confirmed) return;
      await logout();
      return;
    }

    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  const resetFeedbackForm = useCallback(() => {
    setFeedbackForm({
      category: USER_FEEDBACK_CATEGORIES[0].code,
      subject: '',
      content: '',
    });
    setFeedbackAttachment(null);
    setFeedbackError('');
  }, []);

  const sanitizeFeedbackFileName = (name: string) => name
    .trim()
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    || 'feedback-attachment.jpg';

  const uploadFeedbackAttachment = useCallback(async () => {
    if (!user || !feedbackAttachment) return null;

    const isFileAttachment = Boolean(feedbackAttachment.file);
    const payload = feedbackAttachment.file || (
      feedbackAttachment.uri
        ? await fetch(feedbackAttachment.uri).then((response) => response.blob())
        : null
    );

    if (!payload) return null;

    const safeName = sanitizeFeedbackFileName(feedbackAttachment.name);
    const filePath = `${user.id}/${Date.now()}-${safeName}`;
    const contentType = feedbackAttachment.mimeType || (isFileAttachment ? feedbackAttachment.file?.type : undefined) || 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from('feedback-attachments')
      .upload(filePath, payload, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });

    if (uploadError) {
      throw new Error(`${uploadError.message}\n\nHãy kiểm tra bucket Supabase Storage tên "feedback-attachments" và policy upload/select.`);
    }

    const { data } = supabase.storage.from('feedback-attachments').getPublicUrl(filePath);
    return data.publicUrl;
  }, [feedbackAttachment, user]);

  const handlePickFeedbackAttachment = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cấp quyền truy cập thư viện ảnh để đính kèm ảnh màn hình.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        setFeedbackAttachment({
          uri: asset.uri,
          name: asset.fileName || 'feedback-screenshot.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
      return;
    }

    const documentRef = (globalThis as any).document;
    const input = documentRef?.createElement('input');
    if (!input) {
      Alert.alert('Lỗi', 'Không thể mở File Explorer trong môi trường hiện tại.');
      return;
    }

    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setFeedbackAttachment({
          file,
          name: file.name || 'feedback-screenshot.jpg',
          mimeType: file.type || 'image/jpeg',
        });
      }
    };
    input.click();
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (!user) {
      setFeedbackError('Bạn cần đăng nhập để gửi phản hồi.');
      return;
    }

    const category = feedbackForm.category.trim();
    const subject = feedbackForm.subject.trim();
    const content = feedbackForm.content.trim();

    if (!USER_FEEDBACK_CATEGORIES.some((item) => item.code === category)) {
      setFeedbackError('Vui lòng chọn danh mục phản hồi.');
      return;
    }

    if (!subject) {
      setFeedbackError('Vui lòng nhập tiêu đề phản hồi.');
      return;
    }

    if (subject.length > 100) {
      setFeedbackError('Tiêu đề phản hồi không được vượt quá 100 ký tự.');
      return;
    }

    if (!content) {
      setFeedbackError('Vui lòng nhập mô tả chi tiết.');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError('');
    try {
      const attachmentUrl = await uploadFeedbackAttachment();
      const priority = getDefaultFeedbackPriority(category, subject, content);
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          user_id: user.id,
          user_email: user.email || null,
          category,
          subject,
          content,
          attachment_url: attachmentUrl,
          status: 'pending',
          priority,
        });

      if (error) throw error;

      setShowFeedbackModal(false);
      resetFeedbackForm();
      showFeedbackSuccessToast('Cảm ơn bạn đã gửi phản hồi! Đội ngũ hỗ trợ sẽ xử lý sớm nhất.');
    } catch (error: any) {
      setFeedbackError(error?.message || 'Không thể gửi phản hồi. Vui lòng thử lại.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [feedbackForm, resetFeedbackForm, showFeedbackSuccessToast, uploadFeedbackAttachment, user]);

  const currentFeedbackPriority = getDefaultFeedbackPriority(
    feedbackForm.category,
    feedbackForm.subject,
    feedbackForm.content
  );

  const renderAvatar = (size: number) => {
    if (user?.avatar) {
      return (
        <Image
          source={{ uri: user.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      );
    }

    return <Text style={styles.avatarText}>{avatarLetter}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hồ sơ cá nhân</Text>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setShowAvatarSheet(true)}
            activeOpacity={0.85}
          >
            {isUploadingAvatar ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              renderAvatar(72)
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        <Text style={styles.sectionLabel}>Bảo mật tài khoản</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowEditModal(true)}>
            <View style={styles.menuLeft}>
              <Ionicons name="person" size={18} color={Colors.primary} />
              <Text style={styles.menuText}>Cập nhật thông tin cá nhân</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => onNavigateToChangePassword?.()}>
            <View style={styles.menuLeft}>
              <Ionicons name="key" size={18} color={Colors.primary} />
              <Text style={styles.menuText}>Thay đổi mật khẩu</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Thông tin chi tiết</Text>
          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Ngày sinh</Text>
            <Text style={styles.infoValue}>{user?.dateOfBirth || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Nghề nghiệp</Text>
            <Text style={styles.infoValue}>{user?.job || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Thu nhập hàng tháng</Text>
            <Text style={styles.infoValue}>{formatCurrency(user?.income)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={onNavigateToReports}
          activeOpacity={0.86}
        >
          <View style={styles.reportCardTop}>
            <View style={styles.reportIconCircle}>
              <Ionicons name="analytics" size={26} color={Colors.primary} />
            </View>
            <View style={styles.reportBadge}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.reportBadgeText}>Báo cáo chính</Text>
            </View>
          </View>
          <Text style={styles.reportTitle}>Báo cáo & Phân tích tài chính</Text>
          <Text style={styles.reportDescription}>
            Xem biểu đồ thu chi, cơ cấu danh mục, tuân thủ ngân sách và xuất Excel/CSV chi tiết.
          </Text>
          <View style={styles.reportFooter}>
            <View style={styles.reportFeatureRow}>
              <View style={styles.reportFeature}>
                <Ionicons name="pie-chart-outline" size={15} color="#DFF8EF" />
                <Text style={styles.reportFeatureText}>Danh mục</Text>
              </View>
              <View style={styles.reportFeature}>
                <Ionicons name="trending-up-outline" size={15} color="#DFF8EF" />
                <Text style={styles.reportFeatureText}>Xu hướng</Text>
              </View>
              <View style={styles.reportFeature}>
                <Ionicons name="download-outline" size={15} color="#DFF8EF" />
                <Text style={styles.reportFeatureText}>Export</Text>
              </View>
            </View>
            <View style={styles.reportCta}>
              <Text style={styles.reportCtaText}>Xem chi tiết</Text>
              <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Khác</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowFeedbackModal(true)}>
            <View style={styles.menuLeft}>
              <Ionicons name="mail" size={18} color={Colors.primary} />
              <Text style={styles.menuText}>Đóng góp ý kiến</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, isLoading && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>
            {isLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {feedbackToast ? (
        <View style={styles.feedbackToast}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.feedbackToastText}>{feedbackToast}</Text>
        </View>
      ) : null}

      <Modal visible={showAvatarSheet} transparent animationType="fade" onRequestClose={() => setShowAvatarSheet(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAvatarSheet(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>Avatar</Text>
            <TouchableOpacity style={styles.sheetAction} onPress={handleUpdateAvatar}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.sheetActionText}>Cập nhật Avatar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetAction} onPress={handleViewAvatar}>
              <Ionicons name="eye-outline" size={20} color={Colors.primary} />
              <Text style={styles.sheetActionText}>Xem Avatar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showAvatarLightbox} transparent animationType="fade" onRequestClose={() => setShowAvatarLightbox(false)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setShowAvatarLightbox(false)}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowAvatarLightbox(false)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {user?.avatar && <Image source={{ uri: user.avatar }} style={styles.lightboxImage} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>

      <Modal visible={showFeedbackModal} transparent animationType="slide" onRequestClose={() => setShowFeedbackModal(false)}>
        <View style={styles.editBackdrop}>
          <View style={styles.feedbackModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Đóng góp ý kiến</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.feedbackModalContent}>
              {feedbackError ? (
                <View style={styles.feedbackErrorBox}>
                  <Ionicons name="warning" size={18} color={Colors.danger} />
                  <Text style={styles.feedbackErrorText}>{feedbackError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Danh mục phản hồi *</Text>
              <View style={styles.feedbackCategoryGrid}>
                {USER_FEEDBACK_CATEGORIES.map((category) => {
                  const selected = feedbackForm.category === category.code;
                  return (
                    <TouchableOpacity
                      key={category.code}
                      style={[styles.feedbackCategoryButton, selected && styles.feedbackCategoryButtonActive]}
                      onPress={() => setFeedbackForm(prev => ({ ...prev, category: category.code }))}
                    >
                      <Text style={[styles.feedbackCategoryText, selected && styles.feedbackCategoryTextActive]}>{category.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.feedbackPriorityHint}>
                Ưu tiên tự động: {getFeedbackPriorityLabel(currentFeedbackPriority)}. Auth/Budget/Transactions mặc định cao, AI Scanner trung bình, Góp ý/Khác thấp; từ khóa nghiêm trọng như "không đăng nhập", "crash" sẽ là khẩn cấp.
              </Text>

              <Text style={styles.inputLabel}>Tiêu đề / Chủ đề *</Text>
              <TextInput
                style={styles.input}
                value={feedbackForm.subject}
                onChangeText={(subject) => setFeedbackForm(prev => ({ ...prev, subject }))}
                placeholder="Nhập tiêu đề ngắn gọn"
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Mô tả chi tiết *</Text>
              <TextInput
                style={[styles.input, styles.feedbackContentInput]}
                value={feedbackForm.content}
                onChangeText={(content) => setFeedbackForm(prev => ({ ...prev, content }))}
                placeholder="Mô tả lỗi/góp ý càng chi tiết càng tốt..."
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Ảnh màn hình đính kèm</Text>
              <TouchableOpacity style={styles.feedbackAttachmentButton} onPress={handlePickFeedbackAttachment}>
                <Ionicons name="image-outline" size={18} color={Colors.primary} />
                <Text style={styles.feedbackAttachmentText}>
                  {feedbackAttachment ? feedbackAttachment.name : 'Chọn ảnh màn hình, không bắt buộc'}
                </Text>
              </TouchableOpacity>
              {feedbackAttachment ? (
                <TouchableOpacity style={styles.feedbackRemoveAttachment} onPress={() => setFeedbackAttachment(null)}>
                  <Text style={styles.feedbackRemoveAttachmentText}>Xóa ảnh đính kèm</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.saveButton, isSubmittingFeedback && styles.logoutButtonDisabled]}
                onPress={handleSubmitFeedback}
                disabled={isSubmittingFeedback}
              >
                {isSubmittingFeedback ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Gửi phản hồi</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.editBackdrop}>
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Họ tên</Text>
            <TextInput style={styles.input} value={form.fullName} onChangeText={(fullName) => setForm(prev => ({ ...prev, fullName }))} />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={user?.email || ''} editable={false} />

            <Text style={styles.inputLabel}>Ngày sinh (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.dateOfBirth} onChangeText={(dateOfBirth) => setForm(prev => ({ ...prev, dateOfBirth }))} placeholder="2003-01-31" />

            <Text style={styles.inputLabel}>Nghề nghiệp</Text>
            <TextInput style={styles.input} value={form.job} onChangeText={(job) => setForm(prev => ({ ...prev, job }))} />

            <Text style={styles.inputLabel}>Thu nhập hàng tháng</Text>
            <TextInput style={styles.input} value={form.income} onChangeText={(income) => setForm(prev => ({ ...prev, income }))} keyboardType="numeric" />

            <TouchableOpacity style={[styles.saveButton, isLoading && styles.logoutButtonDisabled]} onPress={handleSaveProfile} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Lưu</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9E9E9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 140,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 18,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
  },
  email: {
    marginTop: 2,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuItem: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 40,
  },
  infoCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reportCard: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    padding: 18,
    shadowColor: Colors.primary,
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  reportCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reportIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBadge: {
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  reportBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  reportTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
  },
  reportDescription: {
    marginTop: 8,
    color: '#DFF8EF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  reportFooter: {
    marginTop: 16,
    gap: 12,
  },
  reportFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportFeature: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  reportFeatureText: {
    color: '#DFF8EF',
    fontSize: 11,
    fontWeight: '700',
  },
  reportCta: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  reportCtaText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  switchMock: {
    width: 32,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchOn: {
    backgroundColor: Colors.primary,
    alignItems: 'flex-end',
  },
  switchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  switchDotOn: {
    backgroundColor: '#FFFFFF',
  },
  logoutButton: {
    marginTop: 28,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  sheetActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 2,
  },
  lightboxImage: {
    width: '86%',
    height: '70%',
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  editModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  feedbackModal: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  feedbackModalContent: {
    paddingBottom: 6,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  settingRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  settingDescription: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 260,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  frequencyButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  frequencyText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  frequencyTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: Colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  feedbackContentInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  feedbackCategoryGrid: {
    gap: 8,
    marginBottom: 12,
  },
  feedbackCategoryButton: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  feedbackCategoryButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  feedbackCategoryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackCategoryTextActive: {
    color: Colors.primary,
  },
  feedbackPriorityHint: {
    marginTop: -4,
    marginBottom: 12,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  feedbackAttachmentButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  feedbackAttachmentText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackRemoveAttachment: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  feedbackRemoveAttachmentText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackErrorBox: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 10,
    marginBottom: 12,
  },
  feedbackErrorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  feedbackToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 110,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  feedbackToastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  inputDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.textSecondary,
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProfileScreen;
