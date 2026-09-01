import { test, expect } from '@playwright/test';

/**
 * Automated Test Suite for Function 02: Login
 * Based on test cases in List_Use_Case_For_Auto.md
 */

test.describe('Function 02: Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the web app running locally (Expo Web)
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
  });

  test('UC02UI01 - Login with correct credentials', async ({ page }) => {
    // 1. Enter Email
    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.fill('pvbdat2431@clc.fitus.edu.vn');

    // 2. Enter Password
    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.fill('D@tadmin23');

    // 3. Press Login button
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();

    // Expected Result: Jump to Homepage screen (check for welcome text or greeting)
    const welcomeText = page.locator('text=Xin chào').first();
    await expect(welcomeText).toBeVisible({ timeout: 15000 });
  });

  test('UC02UI04 - Login with incorrect password', async ({ page }) => {
    // 1. Enter Email
    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.fill('pvbdat2431@clc.fitus.edu.vn');

    // 2. Enter Incorrect Password
    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.fill('WrongPassword123');

    // 3. Press Login button
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();

    // Expected Result: Show incorrect credentials error message
    const errorMsg = page.locator('text=/thất bại|sai|lỗi|không đúng|incorrect|invalid/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  test('UC02UI03 - Invalid email format', async ({ page }) => {
    // 1. Enter Invalid Email format
    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.fill('pvbdatclc.fitus.edu.vn');

    // 2. Enter Password
    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.fill('D@tadmin23');

    // 3. Blur email input by clicking password
    await passwordInput.click();

    // Expected Result: Show email format warning message
    const errorMsg = page.locator('text=/không hợp lệ|invalid/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('UC02UI06 - Login with blank email', async ({ page }) => {
    // 1. Leave email blank, enter Password
    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.fill('D@tadmin23');

    // 2. Press Login button
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();

    // Expected Result: Show empty email warning
    const errorMsg = page.locator('text=/không được để trống|bắt buộc|empty/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});
