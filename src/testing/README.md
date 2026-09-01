# Automated Testing Guide (Playwright)

This folder contains end-to-end (E2E) automated test scripts for SmartSpend AI based on the test cases defined in `List_Use_Case_For_Auto.md`.

## Prerequisites

1. Ensure Node.js is installed.
2. The project is an Expo app running on web (`npm run web`).

---

## Step 1: Install Playwright

Run the following commands in your terminal (at the project root or inside `src/`):

```bash
npm install -D @playwright/test
npx playwright install
```

---

## Step 2: Start the Web App

Before running the tests, make sure your Expo web app is running locally:

```bash
npm run web
```
*(By default, Expo Web runs on `http://localhost:8081`).*

---

## Step 3: Run the Test Automation Scripts

Open a new terminal window and run:

- **Run all automated tests:**
  ```bash
  npx playwright test
  ```

- **Run tests in UI mode (interactive runner):**
  ```bash
  npx playwright test --ui
  ```

- **Run specific test file (e.g., Login tests):**
  ```bash
  npx playwright test login.spec.ts --ui
  npx playwright test transaction.spec.ts --ui
  ```

- **Run with headed browser (see browser actions live):**
  ```bash
  npx playwright test --headed
  ```
