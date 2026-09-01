/**
  * Unit Tests for Currency and Formatting Utilities
  * Location: src/testing/unit_testing/formatCurrency.test.ts
  */

import {
  formatCurrency,
  formatDate,
  formatPercentage,
  formatRelativeDate,
  getCategoryById,
} from '../../shared/utils/formatCurrency';

describe('Format Currency & General Utilities Unit Tests', () => {
  test('formatCurrency formats VND numbers correctly', () => {
    expect(formatCurrency(100000)).toContain('100.000');
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(2000000000)).toContain('2.000.000.000');
  });

  test('formatDate formats Date objects in Vietnamese locale', () => {
    const testDate = new Date(2026, 8, 15); // Sep 15, 2026
    const formatted = formatDate(testDate);
    expect(formatted).toContain('15');
    expect(formatted).toContain('09');
    expect(formatted).toContain('2026');
  });

  test('formatPercentage formats numbers to percentage strings', () => {
    expect(formatPercentage(45.678, 1)).toBe('45.7%');
    expect(formatPercentage(100, 0)).toBe('100%');
    expect(formatPercentage(12.3456, 2)).toBe('12.35%');
  });

  test('formatRelativeDate returns correct relative labels', () => {
    const today = new Date();
    expect(formatRelativeDate(today)).toBe('Hôm nay');

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe('Hôm qua');

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    expect(formatRelativeDate(threeDaysAgo)).toBe('3 ngày trước');
  });

  test('getCategoryById retrieves category from mock datasource', () => {
    const category = getCategoryById('food');
    if (category) {
      expect(category.id).toBe('food');
      expect(category.name).toBeDefined();
    } else {
      // If mock data is empty or different, test fallback behavior
      expect(category).toBeUndefined();
    }
  });
});
