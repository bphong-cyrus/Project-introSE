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
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { currentUser, userCategoryBreakdown } from '../../../data/datasources/mock/userMockData';
import PieChart from '../components/PieChart';
import { Transaction } from '../../../shared/types';
import { useTransactions } from '../../../state/TransactionContext';

// ========== HELPER FUNCTIONS ==========
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// Get emoji for category
const getCategoryEmoji = (name: string): string => {
  const emojis: { [key: string]: string } = {
    'Ăn uống': '🍜',
    'Di chuyển': '🚗',
    'Mua sắm': '🛒',
    'Học tập': '📚',
    'Khác': '📌',
    'Giải trí': '🎮',
    'Sức khỏe': '💊',
  };
  return emojis[name] || '📌';
};

// ========== CALENDAR COMPONENT ==========
interface CalendarProps {
  onDateSelect?: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDatePress = (day: number) => {
    const selected = new Date(currentYear, currentMonth, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (selected <= now) {
      setSelectedDate(selected);
      onDateSelect?.(selected);
    }
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  const isFuture = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date > now;
  };

  const days = generateCalendarDays();

  return (
    <View style={calendarStyles.container}>
      {/* Month Navigation */}
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={calendarStyles.navButton}>
          <FontAwesome name="chevron-left" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={calendarStyles.monthText}>
          {monthNames[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={calendarStyles.navButton}>
          <FontAwesome name="chevron-right" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day Names */}
      <View style={calendarStyles.weekRow}>
        {dayNames.map((day, index) => (
          <View key={index} style={calendarStyles.dayCell}>
            <Text style={calendarStyles.dayName}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={calendarStyles.daysGrid}>
        {days.map((day, index) => (
          <View key={index} style={calendarStyles.dayCell}>
            {day !== null ? (
              <TouchableOpacity
                style={[
                  calendarStyles.dayButton,
                  isToday(day) && calendarStyles.todayButton,
                  isSelected(day) && calendarStyles.selectedButton,
                  isFuture(day) && calendarStyles.futureButton,
                ]}
                onPress={() => handleDatePress(day)}
                disabled={isFuture(day)}
              >
                <Text
                  style={[
                    calendarStyles.dayText,
                    isToday(day) && !isSelected(day) && calendarStyles.todayText,
                    isSelected(day) && calendarStyles.selectedText,
                    isFuture(day) && calendarStyles.futureText,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={calendarStyles.emptyCell} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayName: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dayButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  todayButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  selectedButton: {
    backgroundColor: Colors.primary,
  },
  futureButton: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  futureText: {
    color: Colors.textMuted,
  },
  emptyCell: {
    width: '100%',
    height: '100%',
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
        <Text style={transactionStyles.emoji}>
          {getCategoryEmoji(transaction.category?.name || 'Khác')}
        </Text>
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
type TabName = 'Home' | 'Transactions' | 'Add' | 'Budget' | 'Categories';

interface HomeScreenProps {
  onTabChange?: (tab: TabName) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const { transactions } = useTransactions();

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
    onTabChange?.('Transactions');
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
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {currentUser.fullName.charAt(0)}
                </Text>
              </View>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Xin chào</Text>
                <Text style={styles.userName}>{currentUser.fullName}</Text>
              </View>
            </View>

            {/* Right: Notification & Settings */}
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton}>
                <FontAwesome name="bell" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <FontAwesome name="gear" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ========== KHUNG 2: SỐ DƯ KHẢ DỤNG ========== */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(summaryData.balance)} VND
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStats}>
            <View style={styles.balanceStatItem}>
              <Text style={styles.balanceStatLabel}>Tổng thu nhập</Text>
              <Text style={styles.incomeText}>
                +{formatCurrency(summaryData.totalIncome)} VND
              </Text>
            </View>
            <View style={styles.balanceStatItem}>
              <Text style={styles.balanceStatLabel}>Tổng chi tiêu</Text>
              <Text style={styles.expenseText}>
                -{formatCurrency(summaryData.totalExpense)} VND
              </Text>
            </View>
          </View>
        </View>

        {/* ========== KHUNG 3: TỔNG QUAN CHI TIÊU ========== */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tổng quan chi tiêu tháng</Text>
          <View style={styles.categoryCard}>
            {/* Modern Pie Chart */}
            <PieChart data={userCategoryBreakdown} size={220} />
          </View>
        </View>

        {/* ========== KHUNG 4: LỊCH ========== */}
        <View style={styles.sectionContainer}>
          <Calendar onDateSelect={handleDateSelect} />
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
});

export default HomeScreen;
