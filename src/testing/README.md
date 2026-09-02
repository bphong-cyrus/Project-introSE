# SmartSpend AI - Comprehensive Testing Guide

This directory (`src/testing`) contains three testing layers covering the entire SmartSpend AI project:
1. **`unit_testing/`**: Unit tests for utility functions, helpers, search/filter algorithms, and business logic.
2. **`integrate_testing/`**: Integration tests for end-to-end component interactions, authentication flows, budget tracking, and financial report analytics.
3. **`system_testing/`**: Playwright E2E browser automation tests for key user scenarios (Login, Manual Transaction).
   - Test results, traces, and artifacts are stored in `system_testing/test_result/`.
   - Playwright HTML reports are generated in `system_testing/playwright_report/`.

---

## Prerequisites

1. Ensure Node.js is installed.
2. Change directory into `src/testing` and install dependencies:
   ```bash
   cd src/testing
   npm install
   ```

---

## 1. Running Unit Tests (`src/testing/unit_testing/`)

To run unit tests with TypeScript and `ts-jest` configured correctly, execute:

```bash
npm run test:unit
```

---

## 2. Running Integration Tests (`src/testing/integrate_testing/`)

To run integration tests across modules (Auth, Budgets, Reports, Transactions):

```bash
npm run test:integrate
```

---

## 3. Running System Tests / E2E Automation (`src/testing/system_testing/`)

Playwright automated browser tests testing complete user workflows in real browsers.

- **Step A: Start the Web App** (in a separate terminal at the project root):
  ```bash
  cd src
  npx expo start -c
  ```
- **Step B: Run Playwright Tests**:
  ```bash
  cd src/testing
  # Run test with Playwright UI
  npx playwright test --ui
  # Run test without Playwright UI
  npx playwright test
  ```
