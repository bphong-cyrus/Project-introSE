import { test, expect } from '@playwright/test';

/**
 * Automated Test Suite for Function 07: Add manual transaction
 * Based on test cases in List_Use_Case_For_Auto.md
 */

test.describe('Function 07: Add manual transaction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and log in first
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    // Login steps
    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.fill('pvbdat2431@clc.fitus.edu.vn');

    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.fill('D@tadmin23');

    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();

    // Wait for home screen to load
    await expect(page.locator('text=Xin chào').first()).toBeVisible({ timeout: 15000 });

    // Click the floating Add (+) button in the bottom tab bar
    const addNavBtn = page.locator('[data-testid="add-tab-button"]');
    await addNavBtn.click();

    // Verify we are on Add Transaction screen
    await expect(page.locator('text=Thêm giao dịch')).toBeVisible({ timeout: 5000 });
  });

  test('UC07UI01 - Add manual transaction (Income)', async ({ page }) => {
    // 1. Enter transaction's name
    const nameInput = page.locator('[data-testid="transaction-name-input"]');
    await nameInput.fill('Bonus Salary');

    // 2. Select Type: Income ("Thu nhập")
    const incomeTypeBtn = page.locator('[data-testid="type-income-button"]');
    await incomeTypeBtn.click();

    // 3. Enter Amount
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill('5000000');

    // 4. Press "LƯU LẠI" (Save) button
    const saveBtn = page.locator('[data-testid="save-button"]');
    await saveBtn.click();

    // Expected Result: Transaction added successfully & reflected on UI or success screen
    const successElement = page.locator('text=/Thành công|Bonus Salary/i').first();
    await expect(successElement).toBeVisible({ timeout: 10000 });
  });

  test('UC07UI02 - Add manual transaction (Expense)', async ({ page }) => {
    // 1. Enter transaction's name
    const nameInput = page.locator('[data-testid="transaction-name-input"]');
    await nameInput.fill('Breakfast');

    // 2. Type is Expense by default ("Chi tiêu")
    const expenseTypeBtn = page.locator('[data-testid="type-expense-button"]');
    await expenseTypeBtn.click();

    // 3. Enter Amount
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill('500000');

    // 4. Press "LƯU LẠI" (Save) button
    const saveBtn = page.locator('[data-testid="save-button"]');
    await saveBtn.click();

    // Expected Result: Transaction added successfully
    const successElement = page.locator('text=/Thành công|Breakfast/i').first();
    await expect(successElement).toBeVisible({ timeout: 10000 });
  });

  test('UC07UI05 - Add manual transaction with zero amount', async ({ page }) => {
    // 1. Enter transaction's name
    const nameInput = page.locator('[data-testid="transaction-name-input"]');
    await nameInput.fill('Test Zero');

    // 2. Enter Amount: 0
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill('0');

    // 3. Press Save button
    const saveBtn = page.locator('[data-testid="save-button"]');
    await saveBtn.click();

    // Expected Result: Show validation error
    const errorMsg = page.locator('text=/lớn hơn 0|phải lớn hơn|bắt buộc/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('UC07UI06 - Add manual transaction with blank name', async ({ page }) => {
    // 1. Leave name blank, enter Amount
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill('100000');

    // 2. Press Save button
    const saveBtn = page.locator('[data-testid="save-button"]');
    await saveBtn.click();

    // Expected Result: Show validation error for name
    const errorMsg = page.locator('text=/là bắt buộc|tên giao dịch/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});
