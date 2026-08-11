import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AiLogStatusFilter = 'all' | 'success' | 'failed' | 'reviewed' | 'unreviewed';

type AILogsPageProps = {
  styles: any;
  ADMIN_COLORS: any;
  aiLogError: string;
  aiLogSearch: string;
  setAiLogSearch: (value: string) => void;
  aiLogStatusFilter: AiLogStatusFilter;
  setAiLogStatusFilter: (value: AiLogStatusFilter) => void;
  aiLogRows: any[];
  filteredAiLogRows: any[];
  aiLogMetrics: {
    total: number;
    averageConfidence: number;
    averageProcessingMs: number;
    unreviewedErrors: number;
  };
  openAiLogDetail: (row: any) => void;
  loadDashboardData: () => void;
  MetricCard: React.ComponentType<any>;
  formatNumber: (value: number) => string;
  formatDateTime: (value?: string | null) => string;
  formatDuration: (milliseconds: number) => string;
  maskEmail: (email?: string | null) => string;
};

const AILogsPage: React.FC<AILogsPageProps> = ({
  styles,
  ADMIN_COLORS,
  aiLogError,
  aiLogSearch,
  setAiLogSearch,
  aiLogStatusFilter,
  setAiLogStatusFilter,
  aiLogRows,
  filteredAiLogRows,
  aiLogMetrics,
  openAiLogDetail,
  loadDashboardData,
  MetricCard,
  formatNumber,
  formatDateTime,
  formatDuration,
  maskEmail,
}) => (
  <>
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageTitle}>Nhật ký quét AI</Text>
        <Text style={styles.pageSubtitle}>Theo dõi độ chính xác nhận dạng biên lai, các chỉ số độ tin cậy và độ chính xác</Text>
      </View>
      <TouchableOpacity style={styles.refreshButton} onPress={loadDashboardData}>
        <Ionicons name="refresh" size={16} color="#FFFFFF" />
        <Text style={styles.refreshText}>Làm mới</Text>
      </TouchableOpacity>
    </View>

    {aiLogError ? (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
        <Text style={styles.errorText}>{aiLogError}</Text>
      </View>
    ) : null}

    <View style={styles.metricsGrid}>
      <MetricCard
        title="Tổng lượt quét"
        value={formatNumber(aiLogMetrics.total)}
        subtitle="Tất cả log AI Scanner"
        icon="scan"
        color={ADMIN_COLORS.warning}
      />
      <MetricCard
        title="Độ chính xác"
        value={`${aiLogMetrics.averageConfidence.toFixed(0)}%`}
        subtitle="Trung bình confidence_score"
        icon="checkmark-circle"
        color={ADMIN_COLORS.primary}
      />
      <MetricCard
        title="Thời gian trung bình"
        value={formatDuration(aiLogMetrics.averageProcessingMs)}
        subtitle="Thời gian OCR/AI xử lý"
        icon="time"
        color={ADMIN_COLORS.info}
      />
      <MetricCard
        title="Lỗi chưa kiểm tra"
        value={formatNumber(aiLogMetrics.unreviewedErrors)}
        subtitle="Cần Admin xem xét"
        icon="alert-circle"
        color={ADMIN_COLORS.error}
      />
    </View>

    <View style={styles.userToolbar}>
      <View style={styles.userSearchBox}>
        <Ionicons name="search" size={16} color={ADMIN_COLORS.muted} />
        <TextInput
          style={styles.userSearchInput}
          value={aiLogSearch}
          onChangeText={setAiLogSearch}
          placeholder="Tìm theo mã scan, transaction, email, danh mục hoặc lỗi..."
          placeholderTextColor={ADMIN_COLORS.muted}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.statusFilterGroup}>
        {([
          ['all', 'Tất cả'],
          ['success', 'Thành công'],
          ['failed', 'Lỗi'],
          ['reviewed', 'Đã kiểm tra'],
          ['unreviewed', 'Chưa kiểm tra'],
        ] as [AiLogStatusFilter, string][]).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.statusFilterButton, aiLogStatusFilter === value && styles.statusFilterButtonActive]}
            onPress={() => setAiLogStatusFilter(value)}
          >
            <Text style={[styles.statusFilterText, aiLogStatusFilter === value && styles.statusFilterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.userTableCard}>
      <View style={[styles.userTableRow, styles.userTableHeader]}>
        <Text style={[styles.userTableHeadText, styles.aiLogColId]}>Mã</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColUser]}>Người dùng</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColEmail]}>Email</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColCategory]}>Danh mục</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColConfidence]}>Độ chính xác</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColStatus]}>Trạng thái</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColDate]}>Ngày quét</Text>
        <Text style={[styles.userTableHeadText, styles.aiLogColActions]}>Thao tác</Text>
      </View>

      {filteredAiLogRows.length === 0 ? (
        <View style={styles.userEmptyState}>
          <Ionicons name="scan-outline" size={28} color={ADMIN_COLORS.muted} />
          <Text style={styles.emptyText}>
            {aiLogRows.length === 0
              ? 'Chưa có nhật ký quét AI nào trong hệ thống.'
              : 'Không có log AI khớp điều kiện tìm kiếm.'}
          </Text>
        </View>
      ) : filteredAiLogRows.map((row) => (
        <TouchableOpacity key={row.scan_log_id} style={styles.userTableRow} activeOpacity={0.82} onPress={() => openAiLogDetail(row)}>
          <Text style={[styles.userTableCell, styles.aiLogColId]}>{row.displayCode}</Text>
          <Text style={[styles.userTableCell, styles.aiLogColUser]} numberOfLines={1}>{row.userName}</Text>
          <Text style={[styles.userTableCell, styles.aiLogColEmail]}>{maskEmail(row.userEmail)}</Text>
          <Text style={[styles.userTableCell, styles.aiLogColCategory]} numberOfLines={2}>{row.categoryLabel}</Text>
          <Text style={[styles.userTableCell, styles.aiLogColConfidence]}>{row.confidenceLabel}</Text>
          <View style={styles.aiLogColStatus}>
            <View style={[styles.statusPill, row.reviewed ? styles.statusPillActive : styles.statusPillInactive]}>
              <Text style={[styles.statusPillText, row.reviewed ? styles.statusTextActive : styles.statusTextInactive]}>
                {row.reviewLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.userTableCell, styles.aiLogColDate]}>{formatDateTime(row.created_at)}</Text>
          <View style={[styles.aiLogColActions, styles.rowActions]}>
            <TouchableOpacity style={styles.tableActionButton} onPress={() => openAiLogDetail(row)}>
              <Text style={styles.tableActionText}>Chi tiết</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.tableFooterText}>Đang hiển thị {formatNumber(filteredAiLogRows.length)} / {formatNumber(aiLogRows.length)} lượt quét.</Text>
  </>
);

export default AILogsPage;
