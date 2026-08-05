import React from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type UserStatusFilter = 'all' | 'active' | 'inactive';

type UsersPageProps = {
  styles: any;
  ADMIN_COLORS: any;
  userActionError: string;
  userSearch: string;
  setUserSearch: (value: string) => void;
  userStatusFilter: UserStatusFilter;
  setUserStatusFilter: (value: UserStatusFilter) => void;
  userRows: any[];
  filteredUserRows: any[];
  isSavingUser: boolean;
  exportUsersCsv: () => void;
  loadDashboardData: () => void;
  openUserDetail: (row: any) => void;
  openEditUser: (row: any) => void;
  handleUpdateUserStatus: (row: any) => void;
  MetricCard: React.ComponentType<any>;
  formatNumber: (value: number) => string;
  maskEmail: (email?: string | null) => string;
  getCanonicalStatus: (status?: string | null) => 'active' | 'inactive';
  getStatusLabel: (status?: string | null) => string;
  getRoleLabel: (isAdmin: boolean) => string;
  formatDate: (value?: string | null) => string;
};

const UsersPage: React.FC<UsersPageProps> = ({
  styles,
  ADMIN_COLORS,
  userActionError,
  userSearch,
  setUserSearch,
  userStatusFilter,
  setUserStatusFilter,
  userRows,
  filteredUserRows,
  isSavingUser,
  exportUsersCsv,
  loadDashboardData,
  openUserDetail,
  openEditUser,
  handleUpdateUserStatus,
  MetricCard,
  formatNumber,
  maskEmail,
  getCanonicalStatus,
  getStatusLabel,
  getRoleLabel,
  formatDate,
}) => (
  <>
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageTitle}>Quản lý người dùng</Text>
        <Text style={styles.pageSubtitle}>Tìm kiếm, lọc, xem chi tiết, chỉnh sửa hồ sơ và khóa/mở khóa tài khoản.</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.exportButton} onPress={exportUsersCsv}>
          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Xuất file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={loadDashboardData}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.refreshText}>Làm mới</Text>
        </TouchableOpacity>
      </View>
    </View>

    {userActionError ? (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={18} color={ADMIN_COLORS.error} />
        <Text style={styles.errorText}>{userActionError}</Text>
      </View>
    ) : null}

    <View style={styles.userToolbar}>
      <View style={styles.userSearchBox}>
        <Ionicons name="search" size={16} color={ADMIN_COLORS.muted} />
        <TextInput
          style={styles.userSearchInput}
          value={userSearch}
          onChangeText={setUserSearch}
          placeholder="Tìm theo họ tên hoặc email..."
          placeholderTextColor={ADMIN_COLORS.muted}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.statusFilterGroup}>
        {([
          ['all', 'Tất cả'],
          ['active', 'Hoạt động'],
          ['inactive', 'Đã khóa'],
        ] as [UserStatusFilter, string][]).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.statusFilterButton, userStatusFilter === value && styles.statusFilterButtonActive]}
            onPress={() => setUserStatusFilter(value)}
          >
            <Text style={[styles.statusFilterText, userStatusFilter === value && styles.statusFilterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.metricsGrid}>
      <MetricCard
        title="Tài khoản auth"
        value={formatNumber(userRows.length)}
        subtitle="Tổng tài khoản từ Supabase Auth"
        icon="people"
        color={ADMIN_COLORS.primary}
      />
      <MetricCard
        title="Đang hoạt động"
        value={formatNumber(userRows.filter((row) => getCanonicalStatus(row.status) === 'active').length)}
        subtitle="Tài khoản có trạng thái hoạt động"
        icon="checkmark-circle"
        color={ADMIN_COLORS.success}
      />
      <MetricCard
        title="Đã khóa"
        value={formatNumber(userRows.filter((row) => getCanonicalStatus(row.status) === 'inactive').length)}
        subtitle="Tài khoản đã bị khóa"
        icon="ban"
        color={ADMIN_COLORS.error}
      />
    </View>

    <View style={styles.userTableCard}>
      <View style={[styles.userTableRow, styles.userTableHeader]}>
        <Text style={[styles.userTableHeadText, styles.userColUser]}>Người dùng</Text>
        <Text style={[styles.userTableHeadText, styles.userColEmail]}>Email</Text>
        <Text style={[styles.userTableHeadText, styles.userColStatus]}>Trạng thái</Text>
        <Text style={[styles.userTableHeadText, styles.userColRole]}>Vai trò</Text>
        <Text style={[styles.userTableHeadText, styles.userColDate]}>Ngày đăng ký</Text>
        <Text style={[styles.userTableHeadText, styles.userColMetric]}>Giao dịch</Text>
        <Text style={[styles.userTableHeadText, styles.userColMetric]}>AI</Text>
        <Text style={[styles.userTableHeadText, styles.userColMetric]}>Góp ý</Text>
        <Text style={[styles.userTableHeadText, styles.userColActions]}>Thao tác</Text>
      </View>

      {filteredUserRows.length === 0 ? (
        <View style={styles.userEmptyState}>
          <Ionicons name="people-outline" size={28} color={ADMIN_COLORS.muted} />
          <Text style={styles.emptyText}>
            {userSearch.trim() || userStatusFilter !== 'all'
              ? 'Không có người dùng khớp với điều kiện tìm kiếm.'
              : 'Chưa có người dùng trong hệ thống.'}
          </Text>
        </View>
      ) : (
        filteredUserRows.map((row) => (
          <TouchableOpacity key={row.id} style={styles.userTableRow} activeOpacity={0.82} onPress={() => openUserDetail(row)}>
            <View style={[styles.userColUser, styles.userIdentity]}>
              <View style={styles.tableAvatar}>
                {row.avatarUrl ? (
                  <Image source={{ uri: row.avatarUrl }} style={styles.tableAvatarImage} />
                ) : (
                  <Text style={styles.tableAvatarText}>{row.fullName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.userIdentityText}>
                <Text style={styles.userNameText}>{row.fullName}</Text>
                <Text style={styles.userIdText}>{row.id.slice(0, 8)}...</Text>
              </View>
            </View>
            <Text style={[styles.userTableCell, styles.userColEmail]}>{maskEmail(row.email)}</Text>
            <View style={styles.userColStatus}>
              <View style={[styles.statusPill, getCanonicalStatus(row.status) === 'active' ? styles.statusPillActive : styles.statusPillInactive]}>
                <Text style={[styles.statusPillText, getCanonicalStatus(row.status) === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
                  {getStatusLabel(row.status)}
                </Text>
              </View>
            </View>
            <Text style={[styles.userTableCell, styles.userColRole]}>{getRoleLabel(row.isAdmin)}</Text>
            <Text style={[styles.userTableCell, styles.userColDate]}>{formatDate(row.joinDate)}</Text>
            <Text style={[styles.userTableCell, styles.userColMetric]}>{formatNumber(row.totalTransactions)}</Text>
            <Text style={[styles.userTableCell, styles.userColMetric]}>{formatNumber(row.aiTransactions)}</Text>
            <Text style={[styles.userTableCell, styles.userColMetric]}>{formatNumber(row.feedbacks)}</Text>
            <View style={[styles.userColActions, styles.rowActions]}>
              <TouchableOpacity style={styles.tableActionButton} onPress={() => openUserDetail(row)}>
                <Text style={styles.tableActionText}>Chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tableActionButton} onPress={() => openEditUser(row)}>
                <Text style={styles.tableActionText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tableActionButton,
                  getCanonicalStatus(row.status) === 'active' ? styles.deactivateButton : styles.activateButton,
                  isSavingUser && styles.disabledButton,
                ]}
                onPress={() => handleUpdateUserStatus(row)}
                disabled={isSavingUser}
              >
                <Text style={[
                  styles.tableActionText,
                  getCanonicalStatus(row.status) === 'active' ? styles.deactivateText : styles.activateText,
                ]}>
                  {getCanonicalStatus(row.status) === 'active' ? 'Khóa' : 'Mở khóa'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>

    <Text style={styles.tableFooterText}>Đang hiển thị {formatNumber(filteredUserRows.length)} / {formatNumber(userRows.length)} người dùng.</Text>
  </>
);

export default UsersPage;
