// SmartSpend AI - Home Screen
// Based on Figma Frame 42:5
// Primary color: #167B63

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { toIoniconName } from '../../../shared/utils/icons';
import PieChart from '../components/PieChart';
import { Transaction, CategoryBreakdown } from '../../../shared/types';
import { useTransactions } from '../../../state/TransactionContext';
import { useCategories } from '../../../state/CategoryContext';
import { useAuth } from '../../../state/AuthContext';
import { useNotifications } from '../../../state/NotificationContext';

// ========== HELPER FUNCTIONS ==========
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// ========== CALENDAR COMPONENT ==========
interface CalendarProps {
  onDateSelect?: (date: Date) => void;
}

const CalendarStrip: React.FC<CalendarProps> = ({ onDateSelect }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const monthTitle = `Tháng ${selectedDate.getMonth() + 1}`;
  const todayLabel = `Hôm nay, ${today.getDate()} Th${today.getMonth() + 1}`;

  const getWeekDates = () => {
    const base = new Date(selectedDate);
    const day = base.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayOffset);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  };

  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const weekDates = getWeekDates();

  const isSameDate = (a: Date, b: Date) => {
    return a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const shiftWeek = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + offset * 7);
    setSelectedDate(next);
  };

  return (
    <View style={calendarStyles.container}>
      <View style={calendarStyles.stripHeader}>
        <TouchableOpacity onPress={() => shiftWeek(-1)} style={calendarStyles.weekNavButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={calendarStyles.monthText}>{monthTitle}</Text>
        <Text style={calendarStyles.todayText}>{todayLabel}</Text>
        <TouchableOpacity onPress={() => shiftWeek(1)} style={calendarStyles.weekNavButton}>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={calendarStyles.dateRow}>
        {weekDates.map((date) => (
          <TouchableOpacity
            key={date.toISOString()}
            style={[
              calendarStyles.dateChip,
              isSameDate(date, selectedDate) && calendarStyles.dateChipSelected,
            ]}
            onPress={() => handleDatePress(date)}
            activeOpacity={0.8}
          >
            <Text style={[
              calendarStyles.dateDay,
              isSameDate(date, selectedDate) && calendarStyles.dateTextSelected,
            ]}>
              {weekDays[date.getDay()]}
            </Text>
            <Text style={[
              calendarStyles.dateNumber,
              isSameDate(date, selectedDate) && calendarStyles.dateTextSelected,
            ]}>
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const calendarStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  stripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekNavButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 'auto',
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateChip: {
    width: 42,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateDay: {
    fontSize: 11,
    color: Colors.textPrimary,
  },
  dateNumber: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
});

// ========== TRANSACTION ITEM COMPONENT ==========
interface TransactionItemProps {
  transaction: Transaction;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const isExpense = transaction.type === 'expense';

  return (
    <View style={transactionStyles.container}>
      {/* Left: Category Icon */}
      <View
        style={[
          transactionStyles.iconContainer,
          { backgroundColor: (transaction.category?.color || '#607D8B') + '20' }
        ]}
      >
        <Ionicons
          name={toIoniconName(transaction.category?.icon, transaction.category?.name) as any}
          size={20}
          color={transaction.category?.color || '#607D8B'}
        />
      </View>

      {/* Middle: Details */}
      <View style={transactionStyles.details}>
        <Text style={transactionStyles.name} numberOfLines={1}>
          {transaction.name}
        </Text>
        <Text style={transactionStyles.meta}>
          {transaction.category?.name} • {formatDate(transaction.date)}
        </Text>
      </View>

      {/* Right: Amount */}
      <Text
        style={[
          transactionStyles.amount,
          isExpense ? transactionStyles.expense : transactionStyles.income
        ]}
      >
        {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
};

const transactionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  details: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
  income: {
    color: Colors.income,
  },
  expense: {
    color: Colors.expense,
  },
});

// ========== MAIN HOME SCREEN ==========
type TabName = 'Home' | 'Transactions' | 'Add' | 'Budget' | 'Profile';

interface HomeScreenProps {
  onTabChange?: (tab: TabName) => void;
  onDateSelect?: (date: Date) => void;
  onNotificationsPress?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onTabChange, onDateSelect, onNotificationsPress }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const now = new Date();
  const [selectedChartMonth, setSelectedChartMonth] = useState(now.getMonth());
  const [selectedChartYear, setSelectedChartYear] = useState(now.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const { transactions } = useTransactions();
  const { expenseCategories } = useCategories();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const displayName = user?.fullName?.trim() || 'Người dùng';
  const monthButtonLabel = `Tháng ${selectedChartMonth + 1}, ${selectedChartYear}`;

  const chartMonthOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(base.getFullYear(), base.getMonth() - index, 1);
      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        label: `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`,
      };
    });
  }, []);

  // Calculate category breakdown for PieChart from real transactions
  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    // Filter expense transactions for current month
    const monthExpenses = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return t.type === 'expense' &&
        txnDate.getMonth() === selectedChartMonth &&
        txnDate.getFullYear() === selectedChartYear;
    });

    // Group by category
    const categoryTotals: Record<string, { amount: number; count: number }> = {};
    monthExpenses.forEach(t => {
      if (!categoryTotals[t.categoryId]) {
        categoryTotals[t.categoryId] = { amount: 0, count: 0 };
      }
      categoryTotals[t.categoryId].amount += t.amount;
      categoryTotals[t.categoryId].count += 1;
    });

    // Convert to CategoryBreakdown format
    const total = Object.values(categoryTotals).reduce((sum, item) => sum + item.amount, 0);

    return Object.entries(categoryTotals)
      .map(([categoryId, { amount, count }]) => {
        const category = expenseCategories.find(c => c.id === categoryId);
        return {
          categoryId,
          category: category || {
            id: categoryId,
            name: 'Khác',
            icon: 'ellipsis-horizontal',
            color: '#607D8B',
            type: 'expense' as const,
            isDefault: false,
            userId: '',
          },
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
          transactionCount: count,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, expenseCategories, selectedChartMonth, selectedChartYear]);

  // Calculate summary from real transactions
  const summaryData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
    });

    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    return { balance, totalIncome, totalExpense };
  }, [transactions]);

  // Recent transactions (max 5, sorted by date descending)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Handle tab press
  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Handle date selection -> Navigate to Transactions
  const handleDateSelect = (date: Date) => {
    setActiveTab('Transactions');
    onDateSelect?.(date);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========== KHUNG 1: HEADER ========== */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            {/* Left: User Info */}
            <View style={styles.userInfo}>
              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={() => handleTabPress('Profile')}
                activeOpacity={0.8}
              >
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Xin chào</Text>
                <Text style={styles.userName}>{displayName}</Text>
              </View>
            </View>

            {/* Right: Notification & Settings */}
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton} onPress={onNotificationsPress}>
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
                {unreadCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="settings" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ========== KHUNG 2: SỐ DƯ KHẢ DỤNG ========== */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(summaryData.balance)}
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStats}>
            <View style={styles.balanceStatItem}>
              <Text style={styles.balanceStatLabel}>Tổng thu nhập</Text>
              <Text style={styles.incomeText}>
                +{formatCurrency(summaryData.totalIncome)}
              </Text>
            </View>
            <View style={styles.balanceStatItem}>
              <Text style={styles.balanceStatLabel}>Tổng chi tiêu</Text>
              <Text style={styles.expenseText}>
                -{formatCurrency(summaryData.totalExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* ========== KHUNG 3: TỔNG QUAN CHI TIÊU ========== */}
        <View style={styles.sectionContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Tổng quan chi tiêu</Text>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setShowMonthPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.monthButtonText}>{monthButtonLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.categoryCard}>
            {/* Modern Pie Chart - now uses real data */}
            <PieChart data={categoryBreakdown} size={220} />
          </View>
        </View>

        {/* ========== KHUNG 4: LỊCH ========== */}
        <View style={styles.sectionContainer}>
          <CalendarStrip onDateSelect={handleDateSelect} />
        </View>

        {/* ========== KHUNG 5: GIAO DỊCH GẦN ĐÂY ========== */}
        <View style={styles.sectionContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={() => handleTabPress('Transactions')}>
              <Text style={styles.seeAllText}>Xem thêm {'>>>'}</Text>
            </TouchableOpacity>
          </View>

          {/* Transaction List */}
          <View style={styles.transactionList}>
            {recentTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </View>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.monthModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.monthModal}>
            <Text style={styles.monthModalTitle}>Chọn tháng hiển thị</Text>
            {chartMonthOptions.map((item) => {
              const isSelected = item.month === selectedChartMonth && item.year === selectedChartYear;
              return (
                <TouchableOpacity
                  key={`${item.month}-${item.year}`}
                  style={[styles.monthOption, isSelected && styles.monthOptionSelected]}
                  onPress={() => {
                    setSelectedChartMonth(item.month);
                    setSelectedChartYear(item.year);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={[styles.monthOptionText, isSelected && styles.monthOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ========== KHUNG 1: HEADER ==========
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  greetingContainer: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textLight,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ========== KHUNG 2: SỐ DƯ ==========
  balanceCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 16,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  balanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceStatItem: {
    flex: 1,
  },
  balanceStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  incomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#81C784',
  },
  expenseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF9A9A',
  },

  // ========== SECTIONS ==========
  sectionContainer: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ========== KHUNG 3: CATEGORY ==========
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // ========== KHUNG 5: TRANSACTIONS ==========
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  transactionList: {
    marginTop: 4,
  },

  // ========== BOTTOM ==========
  bottomPadding: {
    height: 120,
  },
  monthModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  monthModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  monthModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  monthOption: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthOptionSelected: {
    backgroundColor: Colors.primary + '12',
  },
  monthOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  monthOptionTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default HomeScreen;
