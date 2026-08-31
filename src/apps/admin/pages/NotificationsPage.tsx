import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NotificationsPageProps = {
  styles: any;
  ADMIN_COLORS: any;
  campaignError: string;
  dashboardData: any;
  activeNotificationRows: any[];
  profileByUserId: Map<string, any>;
  openCreateNotification: () => void;
  openEditCampaign: (campaign: any) => void;
  setSelectedNotificationId: (value: string | null) => void;
  handleCancelCampaign: (campaignId: string) => void;
  handleDeleteCampaign: (campaignId: string) => void;
  handleDeleteNotification: (notificationId: string) => void;
  MetricCard: React.ComponentType<any>;
  formatNumber: (value: number) => string;
  formatDateTime: (value?: string | null) => string;
  getEffectiveCampaignStatus: (campaign: any) => string;
  isCampaignScheduledForFuture: (campaign: any) => boolean;
  isCampaignFailed: (status?: string | null) => boolean;
  getCampaignStatusLabel: (status?: string | null) => string;
  getCampaignSentAt: (campaign: any) => string | null;
  getNotificationTypeLabel: (type?: string | null) => string;
};

const NotificationsPage: React.FC<NotificationsPageProps> = ({
  styles,
  ADMIN_COLORS,
  campaignError,
  dashboardData,
  activeNotificationRows,
  profileByUserId,
  openCreateNotification,
  openEditCampaign,
  setSelectedNotificationId,
  handleCancelCampaign,
  handleDeleteCampaign,
  handleDeleteNotification,
  MetricCard,
  formatNumber,
  formatDateTime,
  getEffectiveCampaignStatus,
  isCampaignScheduledForFuture,
  isCampaignFailed,
  getCampaignStatusLabel,
  getCampaignSentAt,
  getNotificationTypeLabel,
}) => (
  <>
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageTitle}>Trung tâm thông báo</Text>
        <Text style={styles.pageSubtitle}>Quản lý chiến dịch thông báo do Admin tạo, gửi ngay hoặc lên lịch.</Text>
      </View>
      <TouchableOpacity style={styles.exportButton} onPress={openCreateNotification}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
        <Text style={styles.exportButtonText}>Tạo thông báo</Text>
      </TouchableOpacity>
    </View>

    {campaignError ? (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
        <Text style={styles.errorText}>{campaignError}</Text>
      </View>
    ) : null}

    <View style={styles.metricsGrid}>
      <MetricCard
        title="Chiến dịch Admin"
        value={formatNumber(dashboardData.notificationCampaigns.length)}
        subtitle="Không bao gồm cảnh báo hệ thống tự động"
        icon="megaphone"
        color={ADMIN_COLORS.primary}
      />
      <MetricCard
        title="Đã gửi"
        value={formatNumber(dashboardData.notificationCampaigns.filter((campaign: any) => getEffectiveCampaignStatus(campaign) === 'sent').length)}
        subtitle="Campaign gửi ngay thành công"
        icon="send"
        color={ADMIN_COLORS.success}
      />
      <MetricCard
        title="Đang lên lịch"
        value={formatNumber(dashboardData.notificationCampaigns.filter(isCampaignScheduledForFuture).length)}
        subtitle="Chờ tới thời điểm gửi"
        icon="time"
        color={ADMIN_COLORS.info}
      />
      <MetricCard
        title="Thông báo đã phát"
        value={formatNumber(activeNotificationRows.length)}
        subtitle={`${formatNumber(activeNotificationRows.filter((notification) => notification.type !== 'admin_campaign').length)} thông báo mặc định/hệ thống`}
        icon="notifications"
        color={ADMIN_COLORS.purple}
      />
    </View>

    <View style={styles.userTableCard}>
      <View style={[styles.userTableRow, styles.userTableHeader]}>
        <Text style={[styles.userTableHeadText, styles.campaignColTitle]}>Chiến dịch</Text>
        <Text style={[styles.userTableHeadText, styles.campaignColAudience]}>Đối tượng</Text>
        <Text style={[styles.userTableHeadText, styles.campaignColStatus]}>Trạng thái</Text>
        <Text style={[styles.userTableHeadText, styles.campaignColDate]}>Lên lịch</Text>
        <Text style={[styles.userTableHeadText, styles.campaignColDate]}>Đã gửi</Text>
        <Text style={[styles.userTableHeadText, styles.campaignColActions]}>Thao tác</Text>
      </View>

      {dashboardData.notificationCampaigns.length === 0 ? (
        <View style={styles.userEmptyState}>
          <Ionicons name="notifications-outline" size={28} color={ADMIN_COLORS.muted} />
          <Text style={styles.emptyText}>Chưa có chiến dịch thông báo nào.</Text>
        </View>
      ) : dashboardData.notificationCampaigns.map((campaign: any) => {
        const targetCount = dashboardData.notificationTargets.filter((target: any) => target.campaign_id === campaign.campaign_id).length;
        return (
          <View key={campaign.campaign_id} style={styles.userTableRow}>
            <View style={styles.campaignColTitle}>
              <Text style={styles.userNameText}>{campaign.title}</Text>
              <Text style={styles.userIdText} numberOfLines={1}>{campaign.body}</Text>
            </View>
            <Text style={[styles.userTableCell, styles.campaignColAudience]}>
              {campaign.target_audience === 'specific_users' ? `Cụ thể (${formatNumber(targetCount)})` : 'Tất cả người dùng'}
            </Text>
            <View style={styles.campaignColStatus}>
              <View style={[styles.statusPill, isCampaignFailed(campaign.status) ? styles.statusPillInactive : styles.statusPillActive]}>
                <Text style={[styles.statusPillText, isCampaignFailed(campaign.status) ? styles.statusTextInactive : styles.statusTextActive]}>
                  {getCampaignStatusLabel(getEffectiveCampaignStatus(campaign))}
                </Text>
              </View>
            </View>
            <Text style={[styles.userTableCell, styles.campaignColDate]}>{formatDateTime(campaign.scheduled_at)}</Text>
            <Text style={[styles.userTableCell, styles.campaignColDate]}>{formatDateTime(getCampaignSentAt(campaign))}</Text>
            <View style={[styles.campaignColActions, styles.rowActions]}>
              {isCampaignScheduledForFuture(campaign) ? (
                <>
                  <TouchableOpacity style={styles.tableActionButton} onPress={() => openEditCampaign(campaign)}>
                    <Text style={styles.tableActionText}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tableActionButton, styles.deactivateButton]} onPress={() => handleCancelCampaign(campaign.campaign_id)}>
                    <Text style={[styles.tableActionText, styles.deactivateText]}>Hủy lịch</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity style={[styles.tableActionButton, styles.deactivateButton]} onPress={() => handleDeleteCampaign(campaign.campaign_id)}>
                <Text style={[styles.tableActionText, styles.deactivateText]}>Xóa campaign</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>

    <Text style={styles.sectionTitle}>Thông báo đã phát tới người dùng</Text>
    <View style={styles.userTableCard}>
      <View style={[styles.userTableRow, styles.userTableHeader]}>
        <Text style={[styles.userTableHeadText, styles.notificationColTitle]}>Thông báo</Text>
        <Text style={[styles.userTableHeadText, styles.notificationColUser]}>Người nhận</Text>
        <Text style={[styles.userTableHeadText, styles.notificationColType]}>Loại</Text>
        <Text style={[styles.userTableHeadText, styles.notificationColStatus]}>Đọc</Text>
        <Text style={[styles.userTableHeadText, styles.notificationColDate]}>Ngày tạo</Text>
        <Text style={[styles.userTableHeadText, styles.notificationColActions]}>Thao tác</Text>
      </View>

      {activeNotificationRows.length === 0 ? (
        <View style={styles.userEmptyState}>
          <Ionicons name="notifications-off-outline" size={28} color={ADMIN_COLORS.muted} />
          <Text style={styles.emptyText}>Chưa có thông báo nào được phát tới người dùng.</Text>
        </View>
      ) : activeNotificationRows.slice(0, 80).map((notification) => {
        const recipient = profileByUserId.get(notification.user_id);
        const isRead = notification.is_read || Boolean(notification.read_at);
        return (
          <View key={notification.notification_id} style={styles.userTableRow}>
            <View style={styles.notificationColTitle}>
              <Text style={styles.userNameText}>{notification.title}</Text>
              <Text style={styles.userIdText} numberOfLines={1}>{notification.body || 'Không có nội dung.'}</Text>
            </View>
            <View style={styles.notificationColUser}>
              <Text style={styles.userTableCell}>{recipient?.full_name || notification.user_id.slice(0, 8)}</Text>
              <Text style={styles.userIdText}>{recipient?.user_id.slice(0, 8) || notification.user_id.slice(0, 8)}...</Text>
            </View>
            <Text style={[styles.userTableCell, styles.notificationColType]}>{getNotificationTypeLabel(notification.type)}</Text>
            <View style={styles.notificationColStatus}>
              <View style={[styles.statusPill, isRead ? styles.statusPillActive : styles.statusPillInactive]}>
                <Text style={[styles.statusPillText, isRead ? styles.statusTextActive : styles.statusTextInactive]}>
                  {isRead ? 'Đã đọc' : 'Chưa đọc'}
                </Text>
              </View>
            </View>
            <Text style={[styles.userTableCell, styles.notificationColDate]}>{formatDateTime(notification.created_at)}</Text>
            <View style={[styles.notificationColActions, styles.rowActions]}>
              <TouchableOpacity style={styles.tableActionButton} onPress={() => setSelectedNotificationId(notification.notification_id)}>
                <Text style={styles.tableActionText}>Chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tableActionButton, styles.deactivateButton]} onPress={() => handleDeleteNotification(notification.notification_id)}>
                <Text style={[styles.tableActionText, styles.deactivateText]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
    {activeNotificationRows.length > 80 ? (
      <Text style={styles.tableFooterText}>Đang hiển thị 80 / {formatNumber(activeNotificationRows.length)} thông báo mới nhất.</Text>
    ) : null}
  </>
);

export default NotificationsPage;
