// SmartSpend AI - Semi-Circle Radial Gauge Component
// PRIORITY: Original Budget UI requirement (with radial gauge)
// Features:
// - Semi-circle arc design
// - Dynamic color: Green (<50%), Orange (50-80%), Red (>80%)
// - Center info display with total budget and income
// - Smooth SVG-based rendering

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../../shared/constants/colors';

interface RadialGaugeProps {
  spent: number;
  total: number;
  totalIncome?: number;
  size?: number;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({
  spent,
  total,
  totalIncome,
  size = 260
}) => {
  const progress = total > 0 ? Math.min(spent / total, 1) : 0;
  const percentage = Math.round(progress * 100);

  // Calculate color based on percentage (UC11 - Budget Warning)
  const getColor = (pct: number): string => {
    if (pct > 80) return Colors.danger;
    if (pct > 50) return Colors.warning;
    return Colors.primary;
  };

  const strokeColor = getColor(percentage);
  const height = size / 2 + 40;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Semi-circle arc path (180 degrees, starting from left going up over the top)
  const arcPath = (progressValue: number) => {
    if (progressValue <= 0) return '';

    const angle = progressValue * 180;
    const endAngle = (180 - angle) * (Math.PI / 180);

    const x = centerX + radius * Math.cos(endAngle);
    const y = centerY - radius * Math.sin(endAngle);

    const startX = centerX - radius;
    const startY = centerY;

    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`;
  };

  const backgroundPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <View style={[styles.container, { width: size, height: height }]}>
      <Svg width={size} height={height}>
        <Path
          d={backgroundPath}
          fill="none"
          stroke={Colors.backgroundSecondary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {progress > 0 && (
          <Path
            d={arcPath(progress)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
      </Svg>

      <View style={styles.centerContent}>
        <Text style={styles.label}>Tổng ngân sách</Text>
        <Text style={[styles.amount, { color: strokeColor }]}>
          {formatCurrency(total)}đ
        </Text>
        <Text style={[styles.percentage, { color: strokeColor }]}>
          {percentage}%
        </Text>
        {totalIncome && (
          <View style={styles.incomeRow}>
            <Text style={styles.incomeLabel}>Thu nhập: </Text>
            <Text style={styles.incomeValue}>{formatCurrency(totalIncome)}đ</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    bottom: 15,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  percentage: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  incomeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  incomeValue: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});

export default RadialGauge;