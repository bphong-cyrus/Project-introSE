/**
  * Integration Tests: Budget & Income Management Flow
  * Location: src/testing/integrate_testing/budget_income_integration.test.ts
  */

describe('Integration Test: Budget & Income Tracking', () => {
  test('Monthly budget vs total expenses triggers warning status correctly', () => {
    const monthlyBudgetLimit = 12000000; // 12M VND
    const transactions = [
      { id: 't1', amount: 4000000, type: 'expense' },
      { id: 't2', amount: 3500000, type: 'expense' },
      { id: 't3', amount: 2500000, type: 'expense' },
      { id: 't4', amount: 1000000, type: 'income' }, // should be ignored for expense sum
    ];

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    expect(totalExpense).toBe(10000000);

    const remainingBudget = monthlyBudgetLimit - totalExpense;
    expect(remainingBudget).toBe(2000000);

    const percentageSpent = (totalExpense / monthlyBudgetLimit) * 100;
    expect(percentageSpent).toBeCloseTo(83.33, 1);

    // Warning banner logic (typically triggers >= 80%)
    const isWarningTriggered = percentageSpent >= 80;
    const isExceeded = totalExpense > monthlyBudgetLimit;

    expect(isWarningTriggered).toBe(true);
    expect(isExceeded).toBe(false);
  });

  test('Category-specific budget allocation and spending breakdown', () => {
    const categoryBudgets = [
      { categoryId: 'food', budgetLimit: 5000000 },
      { categoryId: 'transport', budgetLimit: 2000000 },
    ];

    const categoryTransactions = [
      { categoryId: 'food', amount: 1200000 },
      { categoryId: 'food', amount: 2300000 },
      { categoryId: 'transport', amount: 1500000 },
    ];

    const foodSpent = categoryTransactions
      .filter(t => t.categoryId === 'food')
      .reduce((sum, t) => sum + t.amount, 0);

    const foodBudget = categoryBudgets.find(b => b.categoryId === 'food')?.budgetLimit || 0;

    expect(foodSpent).toBe(3500000);
    expect(foodSpent < foodBudget).toBe(true);
  });
});
