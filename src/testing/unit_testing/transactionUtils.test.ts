/**
  * Unit Tests for Transaction Utilities, Search & Filters (UC08)
  * Location: src/testing/unit_testing/transactionUtils.test.ts
  */

import {
  removeAccents,
  normalize,
  matchesQuery,
  formatVND,
  formatDateISO,
  parseLocalISODate,
  formatTime,
  formatDateDMY,
  parseVNDInput,
  formatVNDInput,
  MAX_TRANSACTION_AMOUNT,
} from '../../modules/transactions/utils';

describe('Transaction Utilities & Search Unit Tests', () => {
  test('removeAccents strips Vietnamese diacritics correctly', () => {
    expect(removeAccents('Cà phê sáng')).toBe('Ca phe sang');
    expect(removeAccents('Điện thoại thông minh')).toBe('Dien thoai thong minh');
    expect(removeAccents('Đà Nẵng')).toBe('Da Nang');
  });

  test('normalize converts string to lowercase and removes accents', () => {
    expect(normalize('  Ăn Uống  ')).toBe('an uong');
    expect(normalize('Lương THÁNG 9')).toBe('luong thang 9');
  });

  test('matchesQuery performs accent-insensitive search', () => {
    expect(matchesQuery('ca phe', 'Cà Phê Sữa Đá')).toBe(true);
    expect(matchesQuery('phê', 'Cà Phê Sữa Đá')).toBe(true);
    expect(matchesQuery('mua sắm', 'Đi ăn uống')).toBe(false);
    expect(matchesQuery('', 'Bất kỳ')).toBe(true);
  });

  test('formatVND formats currency with VND suffix', () => {
    expect(formatVND(500000)).toBe('500.000 VND');
    expect(formatVND(0)).toBe('0 VND');
    expect(formatVND(NaN)).toBe('0 VND');
  });

  test('parseVNDInput extracts digits correctly', () => {
    expect(parseVNDInput('150.000 VND')).toBe(150000);
    expect(parseVNDInput('2,000,000')).toBe(2000000);
    expect(parseVNDInput('abc')).toBe(0);
  });

  test('formatVNDInput formats number or string with thousands separators', () => {
    expect(formatVNDInput(1500000)).toBe('1.500.000');
    expect(formatVNDInput('250000')).toBe('250.000');
    expect(formatVNDInput(0)).toBe('');
  });

  test('date formatting utilities handle ISO and local dates correctly', () => {
    const testDate = new Date(2026, 8, 1, 14, 30, 0); // Sept 1, 2026, 14:30
    expect(formatDateISO(testDate)).toBe('2026-09-01');
    expect(formatDateDMY(testDate)).toBe('01/09/2026');
    expect(formatTime(testDate)).toBe('14:30');

    const parsed = parseLocalISODate('2026-09-01');
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(8); // September is 8
      expect(parsed.getDate()).toBe(1);
    }

    expect(parseLocalISODate('invalid-date')).toBeNull();
  });

  test('MAX_TRANSACTION_AMOUNT constant is defined correctly', () => {
    expect(MAX_TRANSACTION_AMOUNT).toBe(2000000000);
  });
});
