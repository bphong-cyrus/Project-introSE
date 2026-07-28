// SmartSpend AI - Modern Pie Chart Component
// Features:
// - Starts at 12 o'clock (top), rotates clockwise
// - Gap between slices
// - Info displayed inside donut center
// - Selected slice highlighted (no movement)
// - Press detection is precise per slice

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Colors } from '../../../shared/constants/colors';
import { CategoryBreakdown } from '../../../shared/types';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

interface PieChartProps {
  data: CategoryBreakdown[];
  size?: number;
}

const DEFAULT_SIZE = 220;
const INNER_RADIUS_RATIO = 0.55; // Donut hole size
const GAP_DEGREES = 2; // Gap between slices (degrees)

const PieChart: React.FC<PieChartProps> = ({ data, size = DEFAULT_SIZE }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const outerRadius = size / 2;
  const innerRadius = outerRadius * INNER_RADIUS_RATIO;
  const center = size / 2;

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (total === 0 || data.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
      </View>
    );
  }

  // Calculate slices - start from 12 o'clock (top), rotate clockwise
  const slices = (() => {
    let cumulativeAngle = 0;
    return data.map((item) => {
      const percentage = item.amount / total;
      const fullAngle = percentage * 360;
      // Reduce angle by gap
      const sweepAngle = fullAngle - GAP_DEGREES;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sweepAngle;
      cumulativeAngle += fullAngle;

      return {
        ...item,
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2,
      };
    });
  })();

  const polarToCartesian = (radius: number, angleInDegrees: number) => {
    // 0° = 12 o'clock (top), clockwise
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: center + radius * Math.cos(angleInRadians),
      y: center + radius * Math.sin(angleInRadians),
    };
  };

  const createDonutSlicePath = (startAngle: number, endAngle: number) => {
    const outerStart = polarToCartesian(outerRadius, startAngle);
    const outerEnd = polarToCartesian(outerRadius, endAngle);
    const innerStart = polarToCartesian(innerRadius, startAngle);
    const innerEnd = polarToCartesian(innerRadius, endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  };

  const handleSlicePress = (sliceId: string) => {
    setSelectedId(prev => prev === sliceId ? null : sliceId);
  };

  const selectedSlice = slices.find(s => s.categoryId === selectedId);

  return (
    <View style={styles.wrapper}>
      {/* SVG Pie Chart with info in center */}
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice) => {
              const isSelected = selectedId === slice.categoryId;
              const hasSelection = selectedId !== null;
              const opacity = !hasSelection || isSelected ? 1 : 0.25;
              const scale = isSelected ? 1.03 : 1;

              return (
                <G key={slice.categoryId} transform={`translate(${center}, ${center}) scale(${scale}) translate(${-center}, ${-center})`}>
                  <Path
                    d={createDonutSlicePath(slice.startAngle, slice.endAngle)}
                    fill={slice.category.color}
                    opacity={opacity}
                    stroke="#FFFFFF"
                    strokeWidth={3}
                  />
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Center info display */}
        <View style={styles.centerInfo}>
          {selectedSlice ? (
            <>
              <Text style={styles.centerCategoryName}>{selectedSlice.category.name}</Text>
              <Text style={styles.centerAmount}>{formatCurrency(selectedSlice.amount)}</Text>
              <Text style={styles.centerPercent}>{selectedSlice.percentage}%</Text>
            </>
          ) : (
            <>
              <Text style={styles.centerLabel}>Tổng chi tiêu</Text>
              <Text style={styles.centerTotalAmount}>{formatCurrency(total)}</Text>
              <Text style={styles.centerCurrency}>VND</Text>
            </>
          )}
        </View>

        {/* Press overlay for each slice */}
        {slices.map((slice) => {
          const mid = polarToCartesian((outerRadius + innerRadius) / 2, slice.midAngle);
          const sliceWidth = outerRadius - innerRadius + 30;
          return (
            <TouchableOpacity
              key={`btn-${slice.categoryId}`}
              style={[
                styles.slicePressArea,
                {
                  left: mid.x - sliceWidth / 2,
                  top: mid.y - sliceWidth / 2,
                  width: sliceWidth,
                  height: sliceWidth,
                  borderRadius: sliceWidth / 2,
                }
              ]}
              onPress={() => handleSlicePress(slice.categoryId)}
              activeOpacity={0.7}
            />
          );
        })}
      </View>

      {/* Legend - pill style chips below chart */}
      <View style={styles.legendContainer}>
        {slices.map((slice) => {
          const isSelected = selectedId === slice.categoryId;
          return (
            <TouchableOpacity
              key={`label-${slice.categoryId}`}
              style={[styles.legendChip, isSelected && styles.legendChipSelected]}
              onPress={() => handleSlicePress(slice.categoryId)}
              activeOpacity={0.7}
            >
              <View style={[styles.legendDot, { backgroundColor: slice.category.color }]} />
              <Text style={[styles.legendText, isSelected && styles.legendTextSelected]} numberOfLines={1}>
                {slice.category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 100,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInfo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  centerTotalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  centerCurrency: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  centerCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  centerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  centerPercent: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  slicePressArea: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
    gap: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  legendChipSelected: {
    backgroundColor: 'rgba(22, 123, 99, 0.1)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  legendTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default PieChart;
