import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { useNotifications } from '../../../state/NotificationContext';
import {
  createMonthlyExcelReport,
  downloadMonthlyExcelReport,
  MonthlyReportExportResponse,
} from '../../../modules/reports';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

type SettingsScreenProps = {
  onBack: () => void;
};

type InfoModalType = 'about' | 'privacy';

type InfoSection = {
  title: string;
  bullets: string[];
};

type InfoModalContent = {
  title: string;
  intro: string;
  sections: InfoSection[];
};

const INFO_CONTENT: Record<InfoModalType, InfoModalContent> = {
  about: {
    title: 'Về SmartSpend AI',
    intro:
      'SmartSpend AI là ứng dụng quản lý chi tiêu cá nhân trên di động, giúp người dùng ghi nhận chi tiêu hằng ngày, quản lý ngân sách tháng và hiểu rõ thói quen tài chính.',
    sections: [
      {
        title: 'Mục tiêu sản phẩm',
        bullets: [
          'Giảm công sức ghi chép bằng AI Scanner, OCR hóa đơn/ảnh chuyển khoản và gợi ý danh mục chi tiêu.',
          'Cung cấp báo cáo trực quan, cảnh báo ngân sách kịp thời và xuất dữ liệu tài chính ra file Excel.',
          'Giúp hình thành thói quen theo dõi chi tiêu nhanh, đơn giản và bền vững hơn so với ghi sổ hoặc nhập bảng tính thủ công.',
        ],
      },
      {
        title: 'Người dùng hướng tới',
        bullets: [
          'Sinh viên và người mới đi làm, chủ yếu trong độ tuổi 18-27.',
          'Người có thu nhập hoặc trợ cấp cá nhân từ dưới 2 triệu đến khoảng 20 triệu VND mỗi tháng.',
          'Người dùng ngân hàng số hoặc ví điện tử nhưng vẫn cần một nơi tập trung để phân tích cả tiền mặt, chuyển khoản và chi tiêu hằng ngày.',
        ],
      },
      {
        title: 'Tính năng chính',
        bullets: [
          'Ghi giao dịch thủ công, quản lý danh mục, xem lịch sử và lọc giao dịch.',
          'Thiết lập ngân sách tháng, hạn mức theo danh mục, theo dõi tiến độ và nhận cảnh báo khi chi tiêu chạm 80-100% hạn mức.',
          'Xem dashboard, biểu đồ theo danh mục/xu hướng và xuất báo cáo Excel gồm giao dịch, ngân sách và biểu đồ tổng hợp.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Quyền riêng tư',
    intro:
      'SmartSpend AI xử lý dữ liệu tài chính cá nhân nhạy cảm, vì vậy phạm vi dữ liệu, quyền truy cập và cách dùng ảnh hóa đơn cần được minh bạch với người dùng.',
    sections: [
      {
        title: 'Dữ liệu được bảo vệ',
        bullets: [
          'Thông tin tài khoản, email, hồ sơ cá nhân, số dư, ngân sách, danh mục và lịch sử giao dịch được gắn với tài khoản người dùng.',
          'Ảnh hóa đơn hoặc ảnh chuyển khoản chỉ được dùng cho luồng OCR/AI để trích số tiền, cửa hàng, ngày giờ và gợi ý danh mục.',
          'Kết quả AI chỉ hỗ trợ điền form, người dùng vẫn xác nhận trước khi giao dịch được lưu vào hệ thống.',
        ],
      },
      {
        title: 'Cách cô lập quyền truy cập',
        bullets: [
          'Người dùng phải đăng nhập trước khi truy cập dữ liệu tài chính cá nhân.',
          'Dữ liệu theo tài khoản được cô lập bằng cơ chế user_id, Row Level Security và phân quyền vai trò trên Supabase.',
          'Quyền quản trị hệ thống được tách khỏi người dùng thường thông qua RBAC, tránh mở rộng quyền không cần thiết.',
        ],
      },
      {
        title: 'Bảo mật và tính di động dữ liệu',
        bullets: [
          'Dữ liệu nhạy cảm được truyền qua HTTPS; mật khẩu do hệ thống xác thực quản lý bằng cơ chế băm một chiều.',
          'Cơ sở dữ liệu/cloud provider chịu trách nhiệm bảo vệ dữ liệu lưu trữ theo cấu hình hạ tầng hiện tại.',
          'Chức năng xuất báo cáo giúp người dùng mang dữ liệu giao dịch ra file Excel để lưu trữ hoặc đối chiếu khi cần.',
        ],
      },
    ],
  },
};

const getCurrentMonth = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { settings, updateSettings } = useNotifications();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModalType | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<MonthlyReportExportResponse | null>(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonth().month);
  const [reportYear, setReportYear] = useState(getCurrentMonth().year);
  const [notificationForm, setNotificationForm] = useState({
    pushEnabled: true,
    dailyReminderEnabled: false,
    reminderFrequency: 'everyday' as 'everyday' | 'fixed_date',
    reminderTime: '21:00',
    reminderDate: '',
  });

  useEffect(() => {
    if (!settings) return;
    setNotificationForm({
      pushEnabled: settings.push_enabled,
      dailyReminderEnabled: settings.daily_reminder_enabled,
      reminderFrequency: settings.reminder_frequency,
      reminderTime: settings.reminder_time || '21:00',
      reminderDate: settings.reminder_date ? settings.reminder_date.slice(0, 16) : '',
    });
  }, [settings]);

  const handleSaveNotificationSettings = async () => {
    const isFixedReminder = notificationForm.reminderFrequency === 'fixed_date';
    let reminderDate: string | null = null;
    let reminderTime = notificationForm.reminderTime || '21:00';

    if (notificationForm.dailyReminderEnabled && isFixedReminder) {
      if (!notificationForm.reminderDate) {
        Alert.alert('Thiếu ngày nhắc nhở', 'Vui lòng nhập ngày giờ nhắc nhở một lần.');
        return;
      }

      const parsedReminderDate = new Date(notificationForm.reminderDate);
      if (Number.isNaN(parsedReminderDate.getTime())) {
        Alert.alert('Ngày giờ không hợp lệ', 'Vui lòng nhập ngày giờ theo định dạng YYYY-MM-DDTHH:mm.');
        return;
      }

      reminderDate = parsedReminderDate.toISOString();
      reminderTime = `${String(parsedReminderDate.getHours()).padStart(2, '0')}:${String(parsedReminderDate.getMinutes()).padStart(2, '0')}`;
    }

    const result = await updateSettings({
      pushEnabled: notificationForm.pushEnabled,
      dailyReminderEnabled: notificationForm.dailyReminderEnabled,
      reminderFrequency: notificationForm.reminderFrequency,
      reminderTime,
      reminderDate,
    });

    if (result.success) {
      setShowNotificationSettings(false);
      Alert.alert('Thành công', result.message);
    } else {
      Alert.alert('Lỗi', result.message);
    }
  };

  const changeReportMonth = (offset: number) => {
    const date = new Date(reportYear, reportMonth - 1 + offset, 1);
    setReportMonth(date.getMonth() + 1);
    setReportYear(date.getFullYear());
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    setLastExport(null);
    try {
      const exportResult = await createMonthlyExcelReport(reportMonth, reportYear);
      setLastExport(exportResult);
      await downloadMonthlyExcelReport(exportResult.exportId, exportResult.fileName);
      Alert.alert(
        'Đã xuất báo cáo Excel',
        `Báo cáo tháng ${exportResult.summary.month}/${exportResult.summary.year} gồm ${exportResult.summary.transactionCount} giao dịch, tổng chi tiêu ${formatCurrency(exportResult.summary.totalExpense)}.`
      );
    } catch (error: any) {
      Alert.alert('Không thể xuất báo cáo', error?.message || 'Vui lòng kiểm tra backend và thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const notificationStatus = settings?.daily_reminder_enabled
    ? settings.reminder_frequency === 'fixed_date'
      ? `Một lần ${settings.reminder_date ? formatDateTime(settings.reminder_date) : ''}`
      : `Hằng ngày ${settings.reminder_time || '21:00'}`
    : 'Chưa bật nhắc nhở';

  const currentInfoContent = infoModal ? INFO_CONTENT[infoModal] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.callout}>
          <Ionicons name="settings-outline" size={22} color={Colors.primary} />
          <View style={styles.calloutTextBox}>
            <Text style={styles.calloutTitle}>Cấu hình ứng dụng</Text>
            <Text style={styles.calloutText}>
              Trang này chỉ giữ các thiết lập ứng dụng, phần hồ sơ/avatar/feedback vẫn nằm ở Hồ sơ cá nhân.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Thông báo</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowNotificationSettings(true)}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.menuText}>Nhắc nhở nhập liệu</Text>
                <Text style={styles.menuSubtext}>{notificationStatus}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.menuText}>Thông báo đẩy thiết bị</Text>
                <Text style={styles.menuSubtext}>{settings?.push_enabled === false ? 'Đang tắt' : 'Đang bật'}</Text>
              </View>
            </View>
            <View style={[styles.switchMock, settings?.push_enabled !== false && styles.switchOn]}>
              <View style={[styles.switchDot, settings?.push_enabled !== false && styles.switchDotOn]} />
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Xuất báo cáo</Text>
        <View style={styles.card}>
          <View style={styles.reportHeader}>
            <TouchableOpacity style={styles.monthArrow} onPress={() => changeReportMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.reportMonth}>Tháng {reportMonth}/{reportYear}</Text>
            <TouchableOpacity style={styles.monthArrow} onPress={() => changeReportMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.reportDescription}>
            File Excel gồm sheet tổng quan, giao dịch trong tháng, giao dịch income, hạn mức ngân sách theo danh mục,
            toàn bộ transactions và sheet biểu đồ tuần/danh mục/so sánh tháng.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, isExporting && styles.disabledButton]}
            onPress={handleExportReport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Xuất Excel</Text>
              </>
            )}
          </TouchableOpacity>
          {lastExport ? (
            <View style={styles.exportSummary}>
              <Text style={styles.exportSummaryTitle}>Lần xuất gần nhất</Text>
              <Text style={styles.exportSummaryText}>File: {lastExport.fileName}</Text>
              <Text style={styles.exportSummaryText}>Tạo lúc: {formatDateTime(lastExport.summary.generatedAt)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Giới thiệu</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setInfoModal('about')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.menuText}>Về SmartSpend AI</Text>
                <Text style={styles.menuSubtext}>Mục tiêu, người dùng và tính năng chính</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setInfoModal('privacy')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.menuText}>Quyền riêng tư</Text>
                <Text style={styles.menuSubtext}>Dữ liệu tài chính, AI/OCR và phân quyền</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>SmartSpend AI 1.0.0</Text>
      </ScrollView>

      <Modal visible={showNotificationSettings} transparent animationType="slide" onRequestClose={() => setShowNotificationSettings(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cài đặt thông báo</Text>
              <TouchableOpacity onPress={() => setShowNotificationSettings(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setNotificationForm(prev => ({ ...prev, pushEnabled: !prev.pushEnabled }))}
            >
              <View style={styles.settingTextBox}>
                <Text style={styles.settingTitle}>Thông báo đẩy thiết bị</Text>
                <Text style={styles.settingDescription}>Tắt mục này vẫn lưu thông báo trong ứng dụng.</Text>
              </View>
              <View style={[styles.switchMock, notificationForm.pushEnabled && styles.switchOn]}>
                <View style={[styles.switchDot, notificationForm.pushEnabled && styles.switchDotOn]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setNotificationForm(prev => ({ ...prev, dailyReminderEnabled: !prev.dailyReminderEnabled }))}
            >
              <View style={styles.settingTextBox}>
                <Text style={styles.settingTitle}>Nhắc nhở nhập liệu</Text>
                <Text style={styles.settingDescription}>Tạo nhắc nhở để ghi lại giao dịch đúng ngày.</Text>
              </View>
              <View style={[styles.switchMock, notificationForm.dailyReminderEnabled && styles.switchOn]}>
                <View style={[styles.switchDot, notificationForm.dailyReminderEnabled && styles.switchDotOn]} />
              </View>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Tần suất</Text>
            <View style={styles.frequencyRow}>
              <TouchableOpacity
                style={[styles.frequencyButton, notificationForm.reminderFrequency === 'everyday' && styles.frequencyButtonActive]}
                onPress={() => setNotificationForm(prev => ({ ...prev, dailyReminderEnabled: true, reminderFrequency: 'everyday' }))}
              >
                <Text style={[styles.frequencyText, notificationForm.reminderFrequency === 'everyday' && styles.frequencyTextActive]}>Hằng ngày</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.frequencyButton, notificationForm.reminderFrequency === 'fixed_date' && styles.frequencyButtonActive]}
                onPress={() => setNotificationForm(prev => ({ ...prev, dailyReminderEnabled: true, reminderFrequency: 'fixed_date' }))}
              >
                <Text style={[styles.frequencyText, notificationForm.reminderFrequency === 'fixed_date' && styles.frequencyTextActive]}>Một lần</Text>
              </TouchableOpacity>
            </View>

            {notificationForm.reminderFrequency === 'everyday' ? (
              <>
                <Text style={styles.inputLabel}>Giờ nhắc hằng ngày (HH:mm)</Text>
                <TextInput
                  style={styles.input}
                  value={notificationForm.reminderTime}
                  onChangeText={(reminderTime) => setNotificationForm(prev => ({ ...prev, dailyReminderEnabled: true, reminderTime }))}
                  placeholder="21:00"
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Ngày giờ nhắc một lần</Text>
                <TextInput
                  style={styles.input}
                  value={notificationForm.reminderDate}
                  onChangeText={(reminderDate) => setNotificationForm(prev => ({ ...prev, dailyReminderEnabled: true, reminderDate }))}
                  placeholder="2026-08-04T21:00"
                />
              </>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveNotificationSettings}>
              <Text style={styles.primaryButtonText}>Lưu cài đặt thông báo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!currentInfoContent} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.infoModalCard]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentInfoContent?.title}</Text>
              <TouchableOpacity onPress={() => setInfoModal(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoScroll} contentContainerStyle={styles.infoScrollContent}>
              <Text style={styles.infoIntro}>{currentInfoContent?.intro}</Text>
              {currentInfoContent?.sections.map((section) => (
                <View key={section.title} style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>{section.title}</Text>
                  {section.bullets.map((bullet) => (
                    <View key={bullet} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setInfoModal(null)}>
              <Text style={styles.secondaryButtonText}>Đã hiểu</Text>
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    height: 58,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
  },
  content: {
    padding: 18,
    paddingBottom: 140,
  },
  callout: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#B7E4D8',
    backgroundColor: '#ECFDF5',
    padding: 14,
    marginBottom: 18,
  },
  calloutTextBox: {
    flex: 1,
  },
  calloutTitle: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  calloutText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 8,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 12,
  },
  menuLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  menuSubtext: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 48,
  },
  switchMock: {
    width: 36,
    height: 20,
    borderRadius: 10,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  switchDotOn: {
    backgroundColor: '#FFFFFF',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportMonth: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  reportDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  exportSummary: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  exportSummaryTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  exportSummaryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  infoModalCard: {
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
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
  settingTextBox: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  settingDescription: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
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
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
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
    fontWeight: '800',
  },
  frequencyTextActive: {
    color: '#FFFFFF',
  },
  infoScroll: {
    marginBottom: 14,
  },
  infoScrollContent: {
    paddingBottom: 4,
  },
  infoIntro: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontWeight: '600',
  },
  infoSection: {
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 10,
  },
  infoSectionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 7,
  },
  bulletDot: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  bulletText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
});

export default SettingsScreen;
