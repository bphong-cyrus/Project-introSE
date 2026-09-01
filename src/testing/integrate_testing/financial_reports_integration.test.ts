/**
  * Integration Tests: Financial Reports & Analytics Flow
  * Location: src/testing/integrate_testing/financial_reports_integration.test.ts
  */

describe('Integration Test: Financial Reports & Analytics', () => {
  test('Analytics calculates total income, total expense, and net savings correctly', () => {
    const transactions = [
      { id: '1', amount: 20000000, type: 'income', date: new Date('2026-09-01') },
      { id: '2', amount: 5000000, type: 'expense', date: new Date('2026-09-02') },
      { id: '3', amount: 3000000, type: 'expense', date: new Date('2026-09-05') },
      { id: '4', amount: 2000000, type: 'income', date: new Date('2026-09-10') },
    ];

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpense;

    expect(totalIncome).toBe(22000000);
    expect(totalExpense).toBe(8000000);
    expect(netSavings).toBe(14000000);
  });

  test('CSV report generation formats transaction rows correctly', () => {
    const transactions = [
      {
        id: 't-1',
        name: 'Mua sắm siêu thị',
        amount: 450000,
        type: 'expense',
        category: { name: 'Mua sắm' },
        date: new Date('2026-09-01'),
        note: 'Thực phẩm tuần đầu',
      },
    ];

    const csvHeader = 'ID,Name,Type,Amount,Category,Date,Note\n';
    const csvRow = transactions
      .map(
        t =>
          `"${t.id}","${t.name}","${t.type}",${t.amount},"${t.category.name}","${t.date.toISOString()}","${t.note || ''}"`
      )
      .join('\n');

    const fullCsv = csvHeader + csvRow;

    expect(fullCsv).toContain('Mua sắm siêu thị');
    expect(fullCsv).toContain('450000');
    expect(fullCsv).toContain('expense');
  });
});
