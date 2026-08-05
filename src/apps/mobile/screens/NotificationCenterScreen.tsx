import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { useNotifications } from '../../../state/NotificationContext';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const NotificationCenterScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { notifications, isLoading, markAsRead, deleteAll, deleteSelected } = useNotifications();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelected = (notificationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const openNotification = async (notificationId: string) => {
    setExpandedId((prev) => prev === notificationId ? null : notificationId);
    try {
      await markAsRead(notificationId);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể đánh dấu đã đọc.');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteSelected(selectedIds);
      setSelectedIds([]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể xóa thông báo đã chọn.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAll();
      setSelectedIds([]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể xóa tất cả thông báo.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Trung tâm thông báo</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDeleteSelected} disabled={selectedIds.length === 0}>
          <Text style={[styles.actionText, selectedIds.length === 0 && styles.disabledText]}>Xóa các mục đã chọn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonDanger} onPress={handleDeleteAll} disabled={notifications.length === 0}>
          <Text style={styles.actionDangerText}>Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.mutedText}>Đang tải thông báo...</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.list}>
        {notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={36} color={Colors.textSecondary} />
            <Text style={styles.mutedText}>Bạn chưa có thông báo nào.</Text>
          </View>
        ) : notifications.map((notification) => {
          const isUnread = !notification.is_read && !notification.read_at;
          const isExpanded = expandedId === notification.notification_id;
          const isSelected = selectedIds.includes(notification.notification_id);

          return (
            <View key={notification.notification_id} style={[styles.card, isUnread && styles.cardUnread]}>
              <View style={styles.cardTop}>
                <TouchableOpacity style={[styles.checkBox, isSelected && styles.checkBoxSelected]} onPress={() => toggleSelected(notification.notification_id)}>
                  {isSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardBody} onPress={() => openNotification(notification.notification_id)}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{notification.title}</Text>
                    {isUnread ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.cardPreview} numberOfLines={isExpanded ? undefined : 2}>
                    {notification.body || 'Không có nội dung.'}
                  </Text>
                  <Text style={styles.cardTime}>{formatDateTime(notification.created_at)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
  actionButton: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, alignItems: 'center' },
  actionButtonDanger: { borderRadius: 12, backgroundColor: '#FEE2E2', padding: 12, alignItems: 'center' },
  actionText: { color: Colors.primary, fontWeight: '700' },
  actionDangerText: { color: '#DC2626', fontWeight: '800' },
  disabledText: { color: '#9CA3AF' },
  loadingBox: { alignItems: 'center', gap: 8, padding: 20 },
  list: { padding: 16, paddingBottom: 140, gap: 12 },
  emptyBox: { alignItems: 'center', gap: 10, padding: 36 },
  mutedText: { color: Colors.textSecondary, fontSize: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  cardUnread: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  cardTop: { flexDirection: 'row', gap: 12 },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkBoxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444' },
  cardPreview: { marginTop: 6, color: Colors.textSecondary, lineHeight: 19 },
  cardTime: { marginTop: 8, color: '#94A3B8', fontSize: 12 },
});

export default NotificationCenterScreen;
