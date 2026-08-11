import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type DashboardPageProps = {
  styles: any;
  ADMIN_COLORS: any;
  monthNames: string[];
  selectedMonth: number;
  selectedYear: number;
  adminName: string;
  dashboardError: string;
  isDashboardLoading: boolean;
  metrics: any;
  changeMonth: (direction: -1 | 1) => void;
  loadDashboardData: () => void;
  MetricCard: React.ComponentType<any>;
  LineChart: React.ComponentType<any>;
  DonutChart: React.ComponentType<any>;
  FailureReasonChart: React.ComponentType<any>;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatDuration: (milliseconds: number) => string;
};

const DashboardPage: React.FC<DashboardPageProps> = ({
  styles,
  ADMIN_COLORS,
  monthNames,
  selectedMonth,
  selectedYear,
  adminName,
  dashboardError,
  isDashboardLoading,
  metrics,
  changeMonth,
  loadDashboardData,
  MetricCard,
  LineChart,
  DonutChart,
  FailureReasonChart,
  formatNumber,
  formatPercent,
  formatDuration,
}) => (
  <>
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageTitle}>Bảng điều khiển quản trị</Text>
        <Text style={styles.pageSubtitle}>Tổng quan hệ thống • {monthNames[selectedMonth]} {selectedYear}</Text>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.monthPicker}>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={18} color={ADMIN_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthNames[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={18} color={ADMIN_COLORS.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadDashboardData}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.refreshText}>Làm mới</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.welcomeCard}>
      <Text style={styles.welcomeTitle}>Xin chào, {adminName}</Text>
      <Text style={styles.welcomeText}>Dữ liệu được cập nhật tự động theo thời gian thực.</Text>
    </View>

    {dashboardError ? (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
        <Text style={styles.errorText}>
          {dashboardError}. Vui lòng kiểm tra quyền truy cập của tài khoản quản trị.
        </Text>
      </View>
    ) : null}

    {isDashboardLoading ? (
      <View style={styles.loadingPanel}>
        <ActivityIndicator color={ADMIN_COLORS.primary} />
        <Text style={styles.loadingText}>Đang đồng bộ dữ liệu realtime...</Text>
      </View>
    ) : null}

    <Text style={styles.sectionTitle}>Chỉ số người dùng</Text>
    <View style={styles.metricsGrid}>
      <MetricCard
        title="Tổng người dùng"
        value={formatNumber(metrics.totalUsers)}
        subtitle="Tất cả tài khoản đã đăng ký"
        icon="people"
        color={ADMIN_COLORS.primary}
      />
      <MetricCard
        title="Người dùng hoạt động"
        value={formatNumber(metrics.activeUsers)}
        subtitle={`Trong ${monthNames[selectedMonth].toLowerCase()}`}
        icon="person-circle"
        color={ADMIN_COLORS.info}
      />
      <MetricCard
        title="Tỷ lệ tăng trưởng"
        value={formatPercent(metrics.growthRate)}
        subtitle="So với tháng trước"
        icon={metrics.growthRate >= 0 ? 'trending-up' : 'trending-down'}
        color={metrics.growthRate >= 0 ? ADMIN_COLORS.success : ADMIN_COLORS.error}
      />
    </View>

    <LineChart data={metrics.userTrend} />

    <Text style={styles.sectionTitle}>Chỉ số AI và giao dịch</Text>
    <View style={styles.metricsGrid}>
      <MetricCard
        title="Tổng giao dịch"
        value={formatNumber(metrics.totalTransactions)}
        subtitle="Tất cả bản ghi trong transactions"
        icon="receipt"
        color={ADMIN_COLORS.primary}
      />
      <MetricCard
        title="Giao dịch từ OCR"
        value={formatNumber(metrics.aiTransactions)}
        subtitle="transactions.source = ocr"
        icon="scan"
        color={ADMIN_COLORS.info}
      />
      <MetricCard
        title="Giao dịch thủ công"
        value={formatNumber(metrics.manualTransactions)}
        subtitle="transactions.source = manual"
        icon="create"
        color={ADMIN_COLORS.purple}
      />
      <MetricCard
        title="Tỷ lệ scan log thành công"
        value={`${metrics.successRate.toFixed(1)}%`}
        subtitle={`${formatNumber(metrics.totalScanLogs)} log, ${formatNumber(metrics.failedScans)} lỗi`}
        icon="checkmark-circle"
        color={metrics.successRate >= 90 ? ADMIN_COLORS.success : ADMIN_COLORS.warning}
      />
      <MetricCard
        title="Thời gian xử lý TB"
        value={formatDuration(metrics.averageAiProcessingMs)}
        subtitle="OCR và tác vụ AI hoàn tất"
        icon="timer"
        color={ADMIN_COLORS.info}
      />
    </View>

    <View style={styles.chartGrid}>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Thủ công vs Quét AI</Text>
          <Text style={styles.panelSubtitle}>So sánh theo transactions.source trong tháng đã chọn</Text>
        </View>
        <DonutChart manual={metrics.manualTransactions} ai={metrics.aiTransactions} />
        <View style={styles.splitLegend}>
          <View style={styles.splitItem}>
            <View style={[styles.legendDot, { backgroundColor: ADMIN_COLORS.info }]} />
            <Text style={styles.legendText}>Thủ công: {formatNumber(metrics.manualTransactions)}</Text>
          </View>
          <View style={styles.splitItem}>
            <View style={[styles.legendDot, { backgroundColor: ADMIN_COLORS.primary }]} />
            <Text style={styles.legendText}>OCR: {formatNumber(metrics.aiTransactions)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Biểu đồ lỗi AI</Text>
          <Text style={styles.panelSubtitle}>Nhóm theo nguyên nhân phổ biến</Text>
        </View>
        <FailureReasonChart items={metrics.failureReasons} />
      </View>
    </View>

    <Text style={styles.sectionTitle}>Cảnh báo hệ thống</Text>
    <View style={styles.alertPanel}>
      <View style={styles.alertRow}>
        <View style={[styles.alertIcon, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="chatbubble-ellipses" size={18} color={ADMIN_COLORS.warning} />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Góp ý chờ xử lý</Text>
          <Text style={styles.alertSubtitle}>Cần phản hồi từ đội ngũ hỗ trợ</Text>
        </View>
        <Text style={styles.alertValue}>{formatNumber(metrics.pendingFeedbackQueue ?? metrics.pendingFeedbacks)}</Text>
      </View>

      <View style={styles.alertRow}>
        <View style={[styles.alertIcon, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="bug" size={18} color={ADMIN_COLORS.error} />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Báo lỗi chưa giải quyết</Text>
          <Text style={styles.alertSubtitle}>Cần kiểm tra và xử lý</Text>
        </View>
        <Text style={styles.alertValue}>{formatNumber(metrics.unresolvedBugs)}</Text>
      </View>

      <View style={styles.alertRow}>
        <View style={[styles.alertIcon, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name="cloud" size={18} color={ADMIN_COLORS.info} />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Hạn mức API/Hệ thống</Text>
          <Text style={styles.alertSubtitle}>Đang chờ kết nối nguồn đo hạn mức</Text>
        </View>
        <Text style={[styles.alertValue, styles.alertMuted]}>N/A</Text>
      </View>

      <View style={styles.alertRow}>
        <View style={[styles.alertIcon, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="receipt" size={18} color={ADMIN_COLORS.error} />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Lỗi AI chưa kiểm tra</Text>
          <Text style={styles.alertSubtitle}>Cần xem lại trong nhật ký AI</Text>
        </View>
        <Text style={styles.alertValue}>{formatNumber(metrics.unreviewedScanErrors ?? metrics.failedScans)}</Text>
      </View>
    </View>
  </>
);

export default DashboardPage;
