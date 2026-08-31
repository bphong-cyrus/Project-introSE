import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { Colors } from '../../../shared/constants/colors';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import PieChart from '../../../apps/mobile/components/PieChart';
import {
  ChartPoint,
  MonthlyComparisonPoint,
  ReportRangeMonths,
  useFinancialReportAnalytics,
} from '../hooks/useFinancialReportAnalytics';
import { createMonthlyExcelReport, downloadMonthlyExcelReport } from '../services/reportExportClient';
import { saveAndShareCsvReport } from '../services/csvReportClient';

type FinancialAnalytics = ReturnType<typeof useFinancialReportAnalytics>;
type InsightTone = 'success' | 'warning' | 'danger' | 'info';
type SeriesKey = 'income' | 'expense' | 'budget';

interface FinancialReportsScreenProps {
  onBack?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = Math.max(280, Math.min(390, SCREEN_WIDTH - 64));
const LINE_CHART_HEIGHT = 184;
const BAR_CHART_HEIGHT = 142;
const GROUPED_CHART_HEIGHT = 142;
const INCOME_GREEN = '#2ECC71';
const EXPENSE_RED = '#E74C3C';
const BUDGET_BLUE = '#3498DB';
const WARNING_ORANGE = '#F39C12';

const VIETNAMESE_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const formatCompactCurrency = (amount: number) => {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} tỷ`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} tr`;
  if (abs >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
};

const formatPercent = (value: number, decimals = 1) => (
  `${value.toFixed(decimals).replace('.0', '')}%`
);

const describeChange = (value: number, subject: string) => {
  if (Math.abs(value) < 0.5) return `${subject} gần như không đổi so với kỳ trước.`;
  const direction = value > 0 ? 'tăng' : 'giảm';
  return `${subject} ${direction} ${formatPercent(Math.abs(value))} so với kỳ trước.`;
};

const getLastNonZeroIndex = (data: ChartPoint[]) => {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    if (data[index].value > 0) return index;
  }
  return 0;
};

const buildReportFileName = (selectedMonth: number, selectedYear: number, extension: 'csv' | 'xlsx') => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const monthCode = `${selectedYear}${pad(selectedMonth + 1)}`;
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `BaoCaoTaiChinh_SmartSpend_${monthCode}_${timestamp}.${extension}`;
};

const csvCell = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const rowsToCsv = (rows: Array<Array<string | number | null | undefined>>) => (
  rows.map((row) => row.map(csvCell).join(',')).join('\n')
);

const buildCsvReport = (
  analytics: FinancialAnalytics,
  selectedCategoryName: string,
  selectedCategoryWeeklyData: ChartPoint[],
) => {
  const rows: Array<Array<string | number | null | undefined>> = [];
  const categoryNameById = new Map(analytics.categories.all.map((category) => [category.id, category.name]));
  const addSection = (title: string) => {
    rows.push([]);
    rows.push([title]);
  };

  rows.push(['Báo cáo tài chính SmartSpend AI']);
  rows.push(['Kỳ báo cáo', `${VIETNAMESE_MONTHS[analytics.selectedMonth]} ${analytics.selectedYear}`]);
  rows.push(['Người dùng', analytics.user?.fullName || analytics.user?.email || '']);

  addSection('Tổng hợp tài chính tháng');
  rows.push(['Chỉ số', 'Giá trị']);
  rows.push(['Thu nhập cố định', analytics.monthlyIncome.fixedMonthlyIncome]);
  rows.push(['Thu nhập phát sinh', analytics.monthlyIncome.variableIncomeTotal]);
  rows.push(['Tổng thu nhập', analytics.monthlyIncome.totalIncome]);
  rows.push(['Tổng chi tiêu', analytics.monthlyIncome.totalExpense]);
  rows.push(['Tiết kiệm', analytics.monthlyIncome.savings]);
  rows.push(['Tỷ lệ tiết kiệm', formatPercent(analytics.savingsRate)]);
  rows.push(['Ngân sách tháng', analytics.totalBudget]);
  rows.push(['Tỷ lệ dùng ngân sách', formatPercent(analytics.budgetUsageRate)]);

  addSection('Phân bổ chi tiêu theo tuần');
  rows.push(['Tuần', 'Chi tiêu', 'Số giao dịch']);
  analytics.weeklyExpenseData.forEach((item) => {
    rows.push([item.label, item.value, item.count || 0]);
  });

  addSection(`Chi tiêu danh mục ${selectedCategoryName} theo tuần`);
  rows.push(['Tuần', 'Chi tiêu', 'Số giao dịch']);
  selectedCategoryWeeklyData.forEach((item) => {
    rows.push([item.label, item.value, item.count || 0]);
  });

  addSection('Tỷ trọng chi tiêu theo danh mục');
  rows.push(['Danh mục', 'Chi tiêu', 'Tỷ trọng', 'Số giao dịch']);
  analytics.categoryBreakdown.forEach((item) => {
    rows.push([item.category.name, item.amount, `${item.percentage}%`, item.transactionCount]);
  });

  addSection(`So sánh ${analytics.rangeMonths} tháng`);
  rows.push(['Tháng', 'Thu nhập', 'Chi tiêu', 'Ngân sách', 'Tiết kiệm', 'Số giao dịch']);
  analytics.monthlyComparison.forEach((item) => {
    rows.push([item.label, item.income, item.expense, item.budget, item.savings, item.transactionCount]);
  });

  addSection('Tuân thủ ngân sách theo danh mục');
  rows.push(['Danh mục', 'Hạn mức', 'Đã chi', 'Còn lại', 'Tỷ lệ sử dụng', 'Trạng thái']);
  analytics.budgetCompliance.forEach((item) => {
    rows.push([
      item.category.name,
      item.allocated,
      item.spent,
      item.remaining,
      item.allocated > 0 ? formatPercent(item.usageRate) : 'Chưa đặt hạn mức',
      item.status,
    ]);
  });

  addSection('Giao dịch trong tháng');
  rows.push(['Ngày', 'Loại', 'Tên giao dịch', 'Danh mục', 'Số tiền', 'Ghi chú', 'Nguồn']);
  analytics.currentMonthTransactions.forEach((transaction) => {
    rows.push([
      new Intl.DateTimeFormat('vi-VN').format(transaction.date),
      transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      transaction.name,
      categoryNameById.get(transaction.categoryId) || transaction.category?.name || 'Không phân loại',
      transaction.type === 'expense' ? -transaction.amount : transaction.amount,
      transaction.note || '',
      transaction.source || 'manual',
    ]);
  });

  return rowsToCsv(rows);
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = ({ label, value, caption, icon, color }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.metricCaption}>{caption}</Text>
  </View>
);

const InsightCard: React.FC<{
  title: string;
  lines: string[];
  tone?: InsightTone;
  icon?: keyof typeof Ionicons.glyphMap;
}> = ({ title, lines, tone = 'info', icon = 'analytics-outline' }) => {
  const colorMap: Record<InsightTone, string> = {
    success: INCOME_GREEN,
    warning: WARNING_ORANGE,
    danger: EXPENSE_RED,
    info: Colors.primary,
  };
  const color = colorMap[tone];

  return (
    <View style={[styles.insightCard, { borderColor: `${color}30`, backgroundColor: `${color}0F` }]}>
      <View style={styles.insightHeader}>
        <Ionicons name={icon} size={17} color={color} />
        <Text style={[styles.insightTitle, { color }]}>{title}</Text>
      </View>
      {lines.map((line) => (
        <View key={line} style={styles.insightLine}>
          <Text style={[styles.insightDot, { color }]}>•</Text>
          <Text style={styles.insightText}>{line}</Text>
        </View>
      ))}
    </View>
  );
};

const ChartCard: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, subtitle, children, action }) => (
  <View style={styles.chartCard}>
    <View style={styles.chartCardHeader}>
      <View style={styles.chartTitleBox}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
      </View>
      {action}
    </View>
    {children}
  </View>
);

const InteractiveLineChart: React.FC<{
  data: ChartPoint[];
  color?: string;
  valueFormatter?: (value: number) => string;
}> = ({ data, color = Colors.primary, valueFormatter = formatCurrency }) => {
  const [selectedIndex, setSelectedIndex] = useState(getLastNonZeroIndex(data));

  useEffect(() => {
    setSelectedIndex(getLastNonZeroIndex(data));
  }, [data]);

  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const hasData = data.some((item) => item.value > 0);
  const paddingX = 22;
  const paddingTop = 16;
  const paddingBottom = 34;
  const plotWidth = CHART_WIDTH - paddingX * 2;
  const plotHeight = LINE_CHART_HEIGHT - paddingTop - paddingBottom;
  const selected = data[selectedIndex] || data[0];
  const points = data.map((item, index) => {
    const x = paddingX + (plotWidth * index) / Math.max(1, data.length - 1);
    const y = paddingTop + plotHeight - (item.value / maxValue) * plotHeight;
    return { x, y, ...item };
  });

  return (
    <View style={styles.lineChartWrapper}>
      <View style={{ width: CHART_WIDTH, height: LINE_CHART_HEIGHT }}>
        <Svg width={CHART_WIDTH} height={LINE_CHART_HEIGHT}>
          {[0, 1, 2, 3].map((item) => {
            const y = paddingTop + (plotHeight * item) / 3;
            return (
              <Line
                key={`grid-${item}`}
                x1={paddingX}
                x2={CHART_WIDTH - paddingX}
                y1={y}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            );
          })}
          <Polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={hasData ? color : '#CBD5E1'}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <Circle
              key={`point-${point.label}`}
              cx={point.x}
              cy={point.y}
              r={selectedIndex === index ? 6 : 4}
              fill={selectedIndex === index ? color : '#FFFFFF'}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {points.map((point, index) => (
          <TouchableOpacity
            key={`line-hit-${point.label}`}
            style={[
              styles.lineHitArea,
              {
                left: point.x - 16,
                top: point.y - 16,
              },
            ]}
            onPress={() => setSelectedIndex(index)}
            activeOpacity={0.7}
          />
        ))}
      </View>

      <View style={styles.chartAxisLabels}>
        {data.map((item) => (
          <Text key={`label-${item.label}`} style={styles.axisLabel}>{item.label.replace('Tuần ', 'T')}</Text>
        ))}
      </View>

      <View style={styles.selectedValuePill}>
        <Text style={styles.selectedValueText}>
          {selected?.label || 'Tuần 1'}: {valueFormatter(selected?.value || 0)}
        </Text>
        {selected?.count != null ? (
          <Text style={styles.selectedSubValueText}>{selected.count} giao dịch</Text>
        ) : null}
      </View>
    </View>
  );
};

const InteractiveBarChart: React.FC<{
  data: ChartPoint[];
  barColor?: string;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}> = ({
  data,
  barColor = Colors.primary,
  valueFormatter = formatCurrency,
  emptyLabel = 'Chưa có dữ liệu',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(getLastNonZeroIndex(data));

  useEffect(() => {
    setSelectedIndex(getLastNonZeroIndex(data));
  }, [data]);

  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const selected = data[selectedIndex] || data[0];
  const hasData = data.some((item) => item.value > 0);

  return (
    <View>
      <View style={styles.barChart}>
        {data.map((item, index) => {
          const barHeight = hasData
            ? Math.max(6, Math.round((item.value / maxValue) * BAR_CHART_HEIGHT))
            : 6;
          const color = item.color || barColor;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.barColumn}
              onPress={() => setSelectedIndex(index)}
              activeOpacity={0.75}
            >
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: selectedIndex === index ? color : `${color}90`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.axisLabel, selectedIndex === index && styles.axisLabelActive]}>
                {item.label.replace('Tuần ', 'T')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.selectedValuePill}>
        {hasData ? (
          <>
            <Text style={styles.selectedValueText}>
              {selected?.label || 'Tuần 1'}: {valueFormatter(selected?.value || 0)}
            </Text>
            {selected?.count != null ? (
              <Text style={styles.selectedSubValueText}>{selected.count} giao dịch</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.selectedValueText}>{emptyLabel}</Text>
        )}
      </View>
    </View>
  );
};

const GroupedBarChart: React.FC<{
  data: MonthlyComparisonPoint[];
  includeBudget?: boolean;
}> = ({ data, includeBudget = false }) => {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, data.length - 1));
  const series: Array<{ key: SeriesKey; label: string; color: string }> = includeBudget
    ? [
        { key: 'income', label: 'Thu', color: INCOME_GREEN },
        { key: 'expense', label: 'Chi', color: EXPENSE_RED },
        { key: 'budget', label: 'Hạn mức', color: BUDGET_BLUE },
      ]
    : [
        { key: 'income', label: 'Thu', color: INCOME_GREEN },
        { key: 'expense', label: 'Chi', color: EXPENSE_RED },
      ];

  useEffect(() => {
    setSelectedIndex(Math.max(0, data.length - 1));
  }, [data]);

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => series.map((serie) => Math.max(0, Number(item[serie.key]) || 0))),
  );
  const selected = data[selectedIndex] || data[data.length - 1];

  return (
    <View>
      <View style={styles.legendRow}>
        {series.map((serie) => (
          <View key={serie.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: serie.color }]} />
            <Text style={styles.legendText}>{serie.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.groupedChart}>
        {data.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={styles.groupColumn}
            onPress={() => setSelectedIndex(index)}
            activeOpacity={0.75}
          >
            <View style={styles.groupBars}>
              {series.map((serie) => {
                const value = Math.max(0, Number(item[serie.key]) || 0);
                const barHeight = Math.max(5, Math.round((value / maxValue) * GROUPED_CHART_HEIGHT));
                return (
                  <View
                    key={serie.key}
                    style={[
                      styles.groupBar,
                      {
                        height: barHeight,
                        backgroundColor: selectedIndex === index ? serie.color : `${serie.color}80`,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={[styles.axisLabel, selectedIndex === index && styles.axisLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.selectedValuePill}>
        <Text style={styles.selectedValueText}>
          {selected?.label}: Thu {formatCompactCurrency(selected?.income || 0)} • Chi {formatCompactCurrency(selected?.expense || 0)}
        </Text>
        {includeBudget ? (
          <Text style={styles.selectedSubValueText}>
            Hạn mức {formatCompactCurrency(selected?.budget || 0)} • Tiết kiệm {formatCompactCurrency(selected?.savings || 0)}
          </Text>
        ) : (
          <Text style={styles.selectedSubValueText}>
            Tiết kiệm {formatCompactCurrency(selected?.savings || 0)}
          </Text>
        )}
      </View>
    </View>
  );
};

const BudgetComplianceList: React.FC<{
  analytics: FinancialAnalytics;
}> = ({ analytics }) => {
  const rows = analytics.budgetCompliance.slice(0, 5);

  if (rows.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="wallet-outline" size={22} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Chưa có hạn mức hoặc chi tiêu theo danh mục trong tháng này.</Text>
      </View>
    );
  }

  return (
    <View style={styles.complianceList}>
      {rows.map((row) => {
        const progress = row.allocated > 0 ? Math.min(1, row.spent / row.allocated) : row.spent > 0 ? 1 : 0;
        const color = row.status === 'over'
          ? EXPENSE_RED
          : row.status === 'warning'
            ? WARNING_ORANGE
            : row.status === 'unset'
              ? Colors.textMuted
              : Colors.primary;

        return (
          <View key={row.category.id} style={styles.complianceRow}>
            <View style={styles.complianceHeader}>
              <View style={styles.complianceCategory}>
                <View style={[styles.categoryDot, { backgroundColor: row.category.color }]} />
                <Text style={styles.complianceName}>{row.category.name}</Text>
              </View>
              <Text style={[styles.complianceAmount, { color }]}>
                {row.allocated > 0 ? formatPercent(row.usageRate, 0) : 'Chưa đặt'}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.complianceCaption}>
              Đã chi {formatCurrency(row.spent)} / Hạn mức {formatCurrency(row.allocated)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const TopSpendingDays: React.FC<{
  analytics: FinancialAnalytics;
}> = ({ analytics }) => {
  if (analytics.topSpendingDays.length === 0) {
    return (
      <Text style={styles.emptyInlineText}>Chưa có ngày chi tiêu nổi bật trong tháng này.</Text>
    );
  }

  return (
    <View style={styles.topDaysList}>
      {analytics.topSpendingDays.map((item, index) => (
        <View key={item.dateKey} style={styles.topDayRow}>
          <View style={styles.topDayRank}>
            <Text style={styles.topDayRankText}>{index + 1}</Text>
          </View>
          <View style={styles.topDayInfo}>
            <Text style={styles.topDayDate}>{item.label}</Text>
            <Text style={styles.topDayMeta}>{item.transactionCount} giao dịch chi tiêu</Text>
          </View>
          <Text style={styles.topDayAmount}>{formatCurrency(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
};

const FinancialReportsScreen: React.FC<FinancialReportsScreenProps> = ({ onBack }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [rangeMonths, setRangeMonths] = useState<ReportRangeMonths>(6);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const analytics = useFinancialReportAnalytics(selectedMonth, selectedYear, rangeMonths);
  const expenseCategories = analytics.categories.expense;

  const defaultCategoryId = useMemo(() => (
    analytics.categoryBreakdown[0]?.categoryId || expenseCategories[0]?.id || ''
  ), [analytics.categoryBreakdown, expenseCategories]);

  useEffect(() => {
    if (!selectedCategoryId || !expenseCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(defaultCategoryId);
    }
  }, [defaultCategoryId, expenseCategories, selectedCategoryId]);

  const selectedCategory = expenseCategories.find((category) => category.id === selectedCategoryId) ||
    analytics.categoryBreakdown[0]?.category ||
    expenseCategories[0];

  const selectedCategoryWeeklyData = useMemo(() => (
    selectedCategory ? analytics.getWeeklyCategoryExpenseData(selectedCategory.id) : []
  ), [analytics.getWeeklyCategoryExpenseData, selectedCategory?.id]);

  const weeklyInsight = useMemo(() => {
    const currentIndex = getLastNonZeroIndex(analytics.weeklyExpenseData);
    const current = analytics.weeklyExpenseData[currentIndex];
    const previous = analytics.weeklyExpenseData[Math.max(0, currentIndex - 1)];
    const weekVelocity = previous?.value > 0
      ? ((current.value - previous.value) / previous.value) * 100
      : current?.value > 0 ? 100 : 0;

    return [
      describeChange(weekVelocity, `${current?.label || 'Tuần gần nhất'}`),
      `Tổng chi tiêu tháng hiện tại là ${formatCurrency(analytics.monthlyIncome.totalExpense)}.`,
    ];
  }, [analytics.monthlyIncome.totalExpense, analytics.weeklyExpenseData]);

  const paretoInsight = useMemo(() => {
    const totalExpense = analytics.monthlyIncome.totalExpense;
    const topCategory = analytics.categoryBreakdown[0];
    if (!topCategory || totalExpense <= 0) {
      return ['Chưa có chi tiêu để xác định danh mục trọng yếu.'];
    }

    let cumulative = 0;
    let categoryCount = 0;
    for (const item of analytics.categoryBreakdown) {
      if (cumulative / totalExpense >= 0.8) break;
      cumulative += item.amount;
      categoryCount += 1;
    }

    return [
      `${topCategory.category.name} đang chiếm ${topCategory.percentage}% tổng chi tiêu.`,
      `${categoryCount} danh mục lớn nhất tạo ra ${formatPercent((cumulative / totalExpense) * 100, 0)} chi tiêu, phù hợp để ưu tiên tối ưu trước.`,
    ];
  }, [analytics.categoryBreakdown, analytics.monthlyIncome.totalExpense]);

  const budgetInsight = useMemo(() => {
    if (analytics.totalBudget <= 0) {
      return ['Chưa đặt hạn mức ngân sách tháng, hãy vào tab Ngân sách để thiết lập hạn mức theo danh mục.'];
    }

    const deviation = analytics.totalBudget - analytics.monthlyIncome.totalExpense;
    const status = deviation >= 0 ? 'còn dư' : 'vượt';
    return [
      `Bạn đã dùng ${formatPercent(analytics.budgetUsageRate, 0)} tổng hạn mức ngân sách.`,
      `Ngân sách hiện ${status} ${formatCurrency(Math.abs(deviation))}.`,
    ];
  }, [analytics.budgetUsageRate, analytics.monthlyIncome.totalExpense, analytics.totalBudget]);

  const savingInsight = useMemo(() => {
    const rate = analytics.savingsRate;
    const toneText = rate >= 20
      ? 'Tỷ lệ tiết kiệm tốt, tiếp tục duy trì nhịp chi tiêu hiện tại.'
      : rate >= 0
        ? 'Tỷ lệ tiết kiệm còn mỏng, nên rà soát các danh mục chi lớn.'
        : 'Chi tiêu đang vượt thu nhập, cần giảm các khoản không thiết yếu.';
    return [
      `Tỷ lệ tiết kiệm tháng này là ${formatPercent(rate)}.`,
      toneText,
      describeChange(analytics.monthlyExpenseVelocity, 'Chi tiêu tháng này'),
    ];
  }, [analytics.monthlyExpenseVelocity, analytics.savingsRate]);

  const transactionInsight = useMemo(() => {
    const peakWeek = [...analytics.weeklyTransactionCountData].sort((a, b) => b.value - a.value)[0];
    const totalTransactions = analytics.currentMonthTransactions.length;
    if (!peakWeek || totalTransactions === 0) {
      return ['Chưa có giao dịch trong tháng này để phân tích mật độ nhập liệu.'];
    }

    return [
      `${peakWeek.label} có mật độ cao nhất với ${peakWeek.value} giao dịch.`,
      `Tháng này đã ghi nhận ${totalTransactions} giao dịch, gồm thu nhập và chi tiêu.`,
    ];
  }, [analytics.currentMonthTransactions.length, analytics.weeklyTransactionCountData]);

  const categoryWeeklyInsight = useMemo(() => {
    if (!selectedCategory) return ['Chưa có danh mục để phân tích.'];
    const peak = [...selectedCategoryWeeklyData].sort((a, b) => b.value - a.value)[0];
    if (!peak || peak.value <= 0) {
      return [`${selectedCategory.name} chưa có chi tiêu trong tháng này.`];
    }
    return [
      `${selectedCategory.name} cao nhất ở ${peak.label} với ${formatCurrency(peak.value)}.`,
      `Có ${peak.count || 0} giao dịch thuộc danh mục này trong tuần cao điểm.`,
    ];
  }, [selectedCategory, selectedCategoryWeeklyData]);

  const changeMonth = (offset: number) => {
    const date = new Date(selectedYear, selectedMonth + offset, 1);
    setSelectedMonth(date.getMonth());
    setSelectedYear(date.getFullYear());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        analytics.refreshTransactions(),
        analytics.refreshCategories(),
        analytics.refreshBudgetData(),
      ]);
    } catch (error) {
      console.warn('Không thể tải lại báo cáo:', error);
      Alert.alert('Không thể tải lại báo cáo', 'Vui lòng thử lại sau.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const exportResult = await createMonthlyExcelReport(selectedMonth + 1, selectedYear);
      await downloadMonthlyExcelReport(exportResult.exportId, exportResult.fileName);
      setShowExportModal(false);
      Alert.alert(
        'Đã xuất Excel',
        `Báo cáo ${exportResult.summary.month}/${exportResult.summary.year} gồm ${exportResult.summary.transactionCount} giao dịch và ${formatCurrency(exportResult.summary.totalExpense)} chi tiêu.`,
      );
    } catch (error: any) {
      Alert.alert('Không thể xuất Excel', error?.message || 'Vui lòng kiểm tra backend và thử lại.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const fileName = buildReportFileName(selectedMonth, selectedYear, 'csv');
      const csv = buildCsvReport(
        analytics,
        selectedCategory?.name || 'Không phân loại',
        selectedCategoryWeeklyData,
      );
      await saveAndShareCsvReport(fileName, csv);
      setShowExportModal(false);
      Alert.alert('Đã xuất CSV', `File ${fileName} đã được tạo từ dữ liệu báo cáo hiện tại.`);
    } catch (error: any) {
      Alert.alert('Không thể xuất CSV', error?.message || 'Vui lòng thử lại.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const selectedMonthLabel = `${VIETNAMESE_MONTHS[selectedMonth]} ${selectedYear}`;
  const exportDisabled = isExportingExcel || isExportingCsv;
  const savingTone: InsightTone = analytics.savingsRate < 0 ? 'danger' : analytics.savingsRate < 10 ? 'warning' : 'success';
  const budgetTone: InsightTone = analytics.budgetUsageRate > 100 ? 'danger' : analytics.budgetUsageRate >= 80 ? 'warning' : 'success';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.headerBackButton} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={21} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerEyebrow}>SmartSpend AI</Text>
          <Text style={styles.headerTitle}>Báo Cáo & Phân Tích</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportModal(true)} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Xuất</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.periodCard}>
          <View style={styles.periodHeader}>
            <TouchableOpacity style={styles.periodArrow} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.periodCenter}>
              <Text style={styles.periodLabel}>Kỳ báo cáo</Text>
              <Text style={styles.periodValue}>{selectedMonthLabel}</Text>
            </View>
            <TouchableOpacity style={styles.periodArrow} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.rangeToggle}>
            {[3, 6].map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.rangeButton, rangeMonths === value && styles.rangeButtonActive]}
                onPress={() => setRangeMonths(value as ReportRangeMonths)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rangeButtonText, rangeMonths === value && styles.rangeButtonTextActive]}>
                  {value} tháng
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.calloutCard}>
          <Ionicons name="pulse-outline" size={22} color={Colors.primary} />
          <Text style={styles.calloutText}>
            Báo cáo được tính realtime từ giao dịch, thu nhập cố định, ngân sách tháng và hạn mức danh mục hiện có.
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Tổng thu nhập"
            value={formatCurrency(analytics.monthlyIncome.totalIncome)}
            caption="Cố định + phát sinh"
            icon="trending-up"
            color={INCOME_GREEN}
          />
          <MetricCard
            label="Tổng chi tiêu"
            value={formatCurrency(analytics.monthlyIncome.totalExpense)}
            caption={`${analytics.expenseTransactions.length} giao dịch chi`}
            icon="trending-down"
            color={EXPENSE_RED}
          />
          <MetricCard
            label="Tiết kiệm"
            value={formatCurrency(analytics.monthlyIncome.savings)}
            caption={`Tỷ lệ ${formatPercent(analytics.savingsRate)}`}
            icon={analytics.monthlyIncome.savings >= 0 ? 'wallet' : 'alert-circle'}
            color={analytics.monthlyIncome.savings >= 0 ? Colors.primary : EXPENSE_RED}
          />
          <MetricCard
            label="Ngân sách"
            value={formatCurrency(analytics.totalBudget)}
            caption={analytics.totalBudget > 0 ? `Đã dùng ${formatPercent(analytics.budgetUsageRate, 0)}` : 'Chưa đặt hạn mức'}
            icon="speedometer-outline"
            color={BUDGET_BLUE}
          />
        </View>

        <ChartCard
          title="Xu hướng chi tiêu theo tuần"
          subtitle="Chạm vào điểm để xem số tiền từng tuần"
        >
          <InteractiveLineChart data={analytics.weeklyExpenseData} color={EXPENSE_RED} />
          <InsightCard title="Tốc độ xu hướng" lines={weeklyInsight} tone="info" icon="analytics-outline" />
        </ChartCard>

        <ChartCard
          title="Chi tiêu theo danh mục và tuần"
          subtitle="Chọn một danh mục để xem phân bổ chi tiêu"
          action={
            <TouchableOpacity style={styles.categoryPickerButton} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.categoryPickerText} numberOfLines={1}>
                {selectedCategory?.name || 'Danh mục'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </TouchableOpacity>
          }
        >
          <InteractiveBarChart
            data={selectedCategoryWeeklyData}
            barColor={selectedCategory?.color || Colors.primary}
            emptyLabel={`${selectedCategory?.name || 'Danh mục'} chưa có chi tiêu`}
          />
          <InsightCard title="Điểm nóng danh mục" lines={categoryWeeklyInsight} tone="warning" icon="flame-outline" />
        </ChartCard>

        <ChartCard
          title={`So sánh thu nhập và chi tiêu ${rangeMonths} tháng`}
          subtitle="Biểu đồ cột nhóm theo tháng"
        >
          <GroupedBarChart data={analytics.monthlyComparison} />
          <InsightCard title="Tỷ lệ tiết kiệm" lines={savingInsight} tone={savingTone} icon="leaf-outline" />
        </ChartCard>

        <ChartCard
          title="Chi tiêu, thu nhập và ngân sách"
          subtitle="Đối chiếu hạn mức với dòng tiền thực tế"
        >
          <GroupedBarChart data={analytics.monthlyComparison} includeBudget />
          <InsightCard title="Độ lệch ngân sách" lines={budgetInsight} tone={budgetTone} icon="speedometer-outline" />
        </ChartCard>

        <ChartCard
          title="Mật độ giao dịch theo tuần"
          subtitle="Theo dõi thói quen ghi nhận giao dịch"
        >
          <InteractiveBarChart
            data={analytics.weeklyTransactionCountData}
            barColor={Colors.primary}
            valueFormatter={(value) => `${Math.round(value)} giao dịch`}
            emptyLabel="Chưa có giao dịch trong tháng"
          />
          <InsightCard title="Tần suất nhập liệu" lines={transactionInsight} tone="info" icon="calendar-outline" />
        </ChartCard>

        <ChartCard
          title="Cơ cấu chi tiêu theo danh mục"
          subtitle="Donut chart tương tác, chạm vào lát cắt để xem chi tiết"
        >
          <View style={styles.pieWrapper}>
            <PieChart
              data={analytics.categoryBreakdown}
              size={220}
              centerLabel="Tổng chi tiêu"
              selectedAmountColor={EXPENSE_RED}
              totalAmountColor={EXPENSE_RED}
            />
          </View>
          <InsightCard title="Pareto danh mục" lines={paretoInsight} tone="warning" icon="pie-chart-outline" />
        </ChartCard>

        <ChartCard
          title="Tuân thủ ngân sách"
          subtitle="Danh mục vượt hoặc gần chạm hạn mức sẽ được ưu tiên"
        >
          {analytics.isBudgetLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Đang tải hạn mức ngân sách...</Text>
            </View>
          ) : (
            <BudgetComplianceList analytics={analytics} />
          )}
        </ChartCard>

        <ChartCard
          title="Ngày chi tiêu cao nhất"
          subtitle="Top ngày có tổng chi tiêu lớn nhất trong tháng"
        >
          <TopSpendingDays analytics={analytics} />
        </ChartCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>Chọn danh mục phân tích</Text>
            {expenseCategories.map((category) => {
              const isSelected = category.id === selectedCategory?.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedCategoryId(category.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={styles.pickerItemLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>{category.name}</Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showExportModal} transparent animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.exportModalBackdrop}>
          <View style={styles.exportModalCard}>
            <View style={styles.exportModalHeader}>
              <Text style={styles.modalTitle}>Xuất báo cáo</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)} disabled={exportDisabled}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.exportDescription}>
              Kỳ {selectedMonthLabel}. Excel được tạo qua backend với nhiều sheet phân tích; CSV được tạo nhanh trên thiết bị từ dữ liệu realtime đang hiển thị.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, exportDisabled && styles.disabledButton]}
              onPress={handleExportExcel}
              disabled={exportDisabled}
            >
              {isExportingExcel ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="document-attach-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Xuất Excel (.xlsx)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, exportDisabled && styles.disabledOutlineButton]}
              onPress={handleExportCsv}
              disabled={exportDisabled}
            >
              {isExportingCsv ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="grid-outline" size={18} color={Colors.primary} />
                  <Text style={styles.secondaryButtonText}>Xuất CSV (.csv)</Text>
                </>
              )}
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
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerEyebrow: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  exportButton: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCenter: {
    flex: 1,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  periodValue: {
    marginTop: 2,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  rangeToggle: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    flexDirection: 'row',
    padding: 4,
  },
  rangeButton: {
    flex: 1,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  rangeButtonText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  rangeButtonTextActive: {
    color: '#FFFFFF',
  },
  calloutCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#B7E4D8',
    backgroundColor: '#ECFDF5',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  calloutText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    minHeight: 138,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
  },
  metricCaption: {
    marginTop: 6,
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  chartCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  chartTitleBox: {
    flex: 1,
  },
  chartTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  chartSubtitle: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  lineChartWrapper: {
    alignItems: 'center',
  },
  lineHitArea: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chartAxisLabels: {
    width: CHART_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -18,
    marginBottom: 8,
  },
  axisLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  axisLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedValuePill: {
    minHeight: 38,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  selectedValueText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedSubValueText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  barChart: {
    height: BAR_CHART_HEIGHT + 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: BAR_CHART_HEIGHT + 22,
  },
  barTrack: {
    height: BAR_CHART_HEIGHT,
    width: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  groupedChart: {
    height: GROUPED_CHART_HEIGHT + 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  groupColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: GROUPED_CHART_HEIGHT + 24,
  },
  groupBars: {
    height: GROUPED_CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  groupBar: {
    width: 9,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  insightLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 5,
  },
  insightDot: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  insightText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  categoryPickerButton: {
    maxWidth: 124,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  categoryPickerText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 92,
  },
  pieWrapper: {
    alignItems: 'center',
  },
  complianceList: {
    gap: 12,
  },
  complianceRow: {
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  complianceCategory: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  complianceName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  complianceAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  complianceCaption: {
    marginTop: 7,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  loadingBox: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  emptyInlineText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  topDaysList: {
    gap: 10,
  },
  topDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    padding: 12,
    gap: 10,
  },
  topDayRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topDayRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topDayInfo: {
    flex: 1,
  },
  topDayDate: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  topDayMeta: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  topDayAmount: {
    color: EXPENSE_RED,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  pickerItem: {
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerItemActive: {
    backgroundColor: '#E8F5E9',
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  pickerItemText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  exportModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  exportModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledOutlineButton: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 18,
  },
});

export default FinancialReportsScreen;
