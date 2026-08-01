// SmartSpend AI - Profile Screen

import React, { useEffect, useState } from 'react';
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
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';
import { supabase } from '../../../data/datasources/supabase/supabase';

type EditableProfile = {
  fullName: string;
  dateOfBirth: string;
  job: string;
  income: string;
};

const ProfileScreen: React.FC = () => {
  const { user, logout, updateProfile, isLoading } = useAuth();
  const displayName = user?.fullName?.trim() || 'Người dùng';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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
    payload: File | Blob,
    extension = 'jpg',
    contentType = 'image/jpeg'
  ) => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, payload, {
          cacheControl: '3600',
          upsert: true,
          contentType,
        });

      if (uploadError) {
        Alert.alert(
          'Không thể cập nhật avatar',
          `${uploadError.message}\n\nHãy kiểm tra bucket Supabase Storage tên "avatars" và policy upload/select.`
        );
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const result = await updateProfile({ avatar: publicUrl });
      if (result.success) {
        Alert.alert('Thành công', 'Avatar đã được cập nhật.');
      } else {
        Alert.alert('Lỗi', result.message);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật avatar.');
    } finally {
      setIsUploadingAvatar(false);
      setShowAvatarSheet(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    const extension = file.name.split('.').pop() || 'jpg';
    await uploadAvatarPayload(file, extension, file.type || 'image/jpeg');
  };

  const uploadAvatarFromUri = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    await uploadAvatarPayload(blob, extension, blob.type || 'image/jpeg');
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
        await uploadAvatarFromUri(result.assets[0].uri);
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

  const navigatePlaceholder = (title: string) => {
    Alert.alert(title, 'Màn hình này đã được chuẩn bị route placeholder và sẽ được tích hợp ở bước tiếp theo.');
  };

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
          <TouchableOpacity style={styles.menuItem} onPress={() => navigatePlaceholder('Đổi mật khẩu')}>
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

        <Text style={styles.sectionLabel}>Cài đặt ứng dụng</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigatePlaceholder('Nhắc nhở thông báo')}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications" size={18} color={Colors.primary} />
              <Text style={styles.menuText}>Nhắc nhở ghi sổ</Text>
            </View>
            <View style={styles.switchMock}>
              <View style={styles.switchDot} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Khác</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigatePlaceholder('Đóng góp ý kiến')}>
            <View style={styles.menuLeft}>
              <Ionicons name="mail" size={18} color={Colors.primary} />
              <Text style={styles.menuText}>Đóng góp ý kiến</Text>
            </View>
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
  switchMock: {
    width: 32,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
