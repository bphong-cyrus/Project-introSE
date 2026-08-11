import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FeedbackStatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type FeedbackTypeFilter = 'all' | 'bug' | 'suggestion' | 'question';

type FeedbackPageProps = {
  styles: any;
  ADMIN_COLORS: any;
  feedbackError: string;
  feedbackSearch: string;
  setFeedbackSearch: (value: string) => void;
  feedbackStatusFilter: FeedbackStatusFilter;
  setFeedbackStatusFilter: (value: FeedbackStatusFilter) => void;
  feedbackTypeFilter: FeedbackTypeFilter;
  setFeedbackTypeFilter: (value: FeedbackTypeFilter) => void;
  feedbackRows: any[];
  filteredFeedbackRows: any[];
  feedbackMetrics: {
    pending: number;
    inProgress: number;
    resolved: number;
    critical: number;
  };
  openFeedbackDetail: (row: any) => void;
  MetricCard: React.ComponentType<any>;
  formatNumber: (value: number) => string;
  formatDateTime: (value?: string | null) => string;
  maskEmail: (email?: string | null) => string;
  getFeedbackStatusLabel: (status?: string | null) => string;
  getFeedbackTypeLabel: (type?: string | null) => string;
  getFeedbackPriorityLabel: (priority?: string | null) => string;
};

const FeedbackPage: React.FC<FeedbackPageProps> = ({
  styles,
  ADMIN_COLORS,
  feedbackError,
  feedbackSearch,
  setFeedbackSearch,
  feedbackStatusFilter,
  setFeedbackStatusFilter,
  feedbackTypeFilter,
  setFeedbackTypeFilter,
  feedbackRows,
  filteredFeedbackRows,
  feedbackMetrics,
  openFeedbackDetail,
  MetricCard,
  formatNumber,
  formatDateTime,
  maskEmail,
  getFeedbackStatusLabel,
  getFeedbackTypeLabel,
  getFeedbackPriorityLabel,
}) => (
  <>
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageTitle}>Quản lý phản hồi</Text>
        <Text style={styles.pageSubtitle}>Xem, lọc, phản hồi, giải quyết hoặc chuyển phản hồi cho Dev Team.</Text>
      </View>
    </View>

    {feedbackError ? (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
        <Text style={styles.errorText}>{feedbackError}</Text>
      </View>
    ) : null}

    <View style={styles.metricsGrid}>
      <MetricCard
        title="Chờ xử lý"
        value={formatNumber(feedbackMetrics.pending)}
        subtitle="Phản hồi mới cần Admin xem"
        icon="chatbubble-ellipses"
        color={ADMIN_COLORS.warning}
      />
      <MetricCard
        title="Đang xử lý"
        value={formatNumber(feedbackMetrics.inProgress)}
        subtitle="Đã xem hoặc đã chuyển Dev"
        icon="construct"
        color={ADMIN_COLORS.info}
      />
      <MetricCard
        title="Đã giải quyết"
        value={formatNumber(feedbackMetrics.resolved)}
        subtitle="Đã phản hồi người dùng"
        icon="checkmark-circle"
        color={ADMIN_COLORS.success}
      />
      <MetricCard
        title="Khẩn cấp"
        value={formatNumber(feedbackMetrics.critical)}
        subtitle="Ưu tiên Critical/P0"
        icon="alert-circle"
        color={ADMIN_COLORS.error}
      />
    </View>

    <View style={styles.userToolbar}>
      <View style={styles.userSearchBox}>
        <Ionicons name="search" size={16} color={ADMIN_COLORS.muted} />
        <TextInput
          style={styles.userSearchInput}
          value={feedbackSearch}
          onChangeText={setFeedbackSearch}
          placeholder="Tìm theo tiêu đề, nội dung hoặc email..."
          placeholderTextColor={ADMIN_COLORS.muted}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.statusFilterGroup}>
        {([
          ['all', 'Tất cả'],
          ['pending', 'Chờ xử lý'],
          ['in_progress', 'Đang xử lý'],
          ['resolved', 'Đã giải quyết'],
          ['closed', 'Đã đóng'],
        ] as [FeedbackStatusFilter, string][]).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.statusFilterButton, feedbackStatusFilter === value && styles.statusFilterButtonActive]}
            onPress={() => setFeedbackStatusFilter(value)}
          >
            <Text style={[styles.statusFilterText, feedbackStatusFilter === value && styles.statusFilterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.statusFilterGroup}>
      {([
        ['all', 'Tất cả loại'],
        ['bug', 'Báo lỗi'],
        ['suggestion', 'Gợi ý'],
        ['question', 'Câu hỏi'],
      ] as [FeedbackTypeFilter, string][]).map(([value, label]) => (
        <TouchableOpacity
          key={value}
          style={[styles.statusFilterButton, feedbackTypeFilter === value && styles.statusFilterButtonActive]}
          onPress={() => setFeedbackTypeFilter(value)}
        >
          <Text style={[styles.statusFilterText, feedbackTypeFilter === value && styles.statusFilterTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.userTableCard}>
      <View style={[styles.userTableRow, styles.userTableHeader]}>
        <Text style={[styles.userTableHeadText, styles.feedbackColId]}>Mã</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColSubject]}>Tiêu đề</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColUser]}>Người gửi</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColCategory]}>Danh mục</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColPriority]}>Ưu tiên</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColStatus]}>Trạng thái</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColDate]}>Ngày gửi</Text>
        <Text style={[styles.userTableHeadText, styles.feedbackColActions]}>Thao tác</Text>
      </View>

      {filteredFeedbackRows.length === 0 ? (
        <View style={styles.userEmptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color={ADMIN_COLORS.muted} />
          <Text style={styles.emptyText}>
            {feedbackRows.length === 0
              ? 'Chưa có phản hồi người dùng nào.'
              : 'Không có phản hồi khớp với điều kiện tìm kiếm.'}
          </Text>
        </View>
      ) : filteredFeedbackRows.map((row) => (
        <TouchableOpacity key={row.feedback_id} style={styles.userTableRow} activeOpacity={0.82} onPress={() => openFeedbackDetail(row)}>
          <Text style={[styles.userTableCell, styles.feedbackColId]}>{row.displayCode}</Text>
          <View style={styles.feedbackColSubject}>
            <Text style={styles.userNameText} numberOfLines={1}>{row.subject}</Text>
            <Text style={styles.userIdText} numberOfLines={1}>
              {row.hasAttachment ? 'Có ảnh đính kèm' : 'Không có ảnh đính kèm'}
            </Text>
          </View>
          <Text style={[styles.userTableCell, styles.feedbackColUser]}>{maskEmail(row.userEmail)}</Text>
          <Text style={[styles.userTableCell, styles.feedbackColCategory]} numberOfLines={2}>{row.categoryLabel || getFeedbackTypeLabel(row.feedbackType)}</Text>
          <Text style={[styles.userTableCell, styles.feedbackColPriority]}>{getFeedbackPriorityLabel(row.priority)}</Text>
          <View style={styles.feedbackColStatus}>
            <View style={[styles.statusPill, row.status === 'resolved' || row.status === 'closed' ? styles.statusPillActive : styles.statusPillInactive]}>
              <Text style={[styles.statusPillText, row.status === 'resolved' || row.status === 'closed' ? styles.statusTextActive : styles.statusTextInactive]}>
                {getFeedbackStatusLabel(row.status)}
              </Text>
            </View>
          </View>
          <Text style={[styles.userTableCell, styles.feedbackColDate]}>{formatDateTime(row.created_at)}</Text>
          <View style={[styles.feedbackColActions, styles.rowActions]}>
            <TouchableOpacity style={styles.tableActionButton} onPress={() => openFeedbackDetail(row)}>
              <Text style={styles.tableActionText}>Chi tiết</Text>
            </TouchableOpacity>
            {row.status !== 'resolved' && row.status !== 'closed' ? (
              <TouchableOpacity style={[styles.tableActionButton, styles.activateButton]} onPress={() => openFeedbackDetail(row)}>
                <Text style={[styles.tableActionText, styles.activateText]}>Xử lý</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.tableFooterText}>Đang hiển thị {formatNumber(filteredFeedbackRows.length)} / {formatNumber(feedbackRows.length)} phản hồi.</Text>
  </>
);

export default FeedbackPage;
