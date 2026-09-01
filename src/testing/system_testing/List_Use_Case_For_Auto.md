# Danh sách Test Cases (Test Cases Report)

---

## 1. Function 02: Login

### Test Case: UC02UI01 - Login with correct credentials
- **Function/Feature ID:** Function 02: Login
- **Case ID:** UC02UI01
- **Test Step:**
  1. Enter Email: "pvbdat2431@clc.fitus.edu.vn"
  2. Enter Password: "D@tadmin23"
  3. Press "Login" button
- **Expected Result (ER):**
  1. Authenticated
  2. Jump to "Homepage" screen
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/11/2026
- **Device:** Web

---

### Test Case: UC02UI02 - Login with Google Sign-In
- **Function/Feature ID:** Function 02: Login
- **Case ID:** UC02UI02
- **Test Step:**
  1. Press "Login with Google" button
  2. Choose Email: "pvbdat2431@clc.fitus.edu.vn"
  3. Press "Continue" button
- **Expected Result (ER):**
  1. Authenticated
  2. Jump to "Homepage" screen
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/11/2026
- **Device:** Web

---

### Test Case: UC02UI03 - Invalid email
- **Function/Feature ID:** Function 02: Login
- **Case ID:** UC02UI03
- **Test Step:**
  1. Enter Email: "pvbdatclc.fitus.edu.vn"
  2. Enter Password: "D@tadmin23"
  3. Press "Login" button
- **Expected Result (ER):**
  1. Unauthenticated
  2. Show email format warning message
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/11/2026
- **Device:** Web

---

### Test Case: UC02UI04 - Login with incorrect password
- **Function/Feature ID:** Function 02: Login
- **Case ID:** UC02UI04
- **Test Step:**
  1. Enter Email: "pvbdat2431@clc.fitus.edu.vn"
  2. Enter Password: "WrongPassword123"
  3. Press "Login" button
- **Expected Result (ER):**
  1. Unauthenticated
  2. Show incorrect credentials error message
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/11/2026
- **Device:** Web

---

### Test Case: UC02UI05 - Login with unregistered email
- **Function/Feature ID:** Function 02: Login
- **Case ID:** UC02UI05
- **Test Step:**
  1. Enter Email: "unregistered@gmail.com"
  2. Enter Password: "D@tadmin23"
  3. Press "Login" button
- **Expected Result (ER):**
  1. Unauthenticated
  2. Show incorrect credentials error message
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/11/2026
- **Device:** Web

---

### Test Case: UC02UI06 - Login with blank username/password
- **Function/Feature ID:** Function 02: Login
- **Case ID:** UC02UI06
- **Test Step:**
  1. Enter Email: ""
  2. Enter Password: "D@tadmin23"
  3. Press "Login" button
- **Expected Result (ER):**
  1. Show warning (e.g: Email can not be empty)
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/11/2026
- **Device:** Web

---

## 2. Function 07: Add manual transaction

### Test Case: UC07UI01 - Add manual transaction (Income)
- **Function/Feature ID:** Function 07: Add manual transaction
- **Case ID:** UC07UI01
- **Test Step:**
  1. Press "Add Transaction" button
  2. Enter transaction's name: "Bonus Salary"
  3. Select Type: "Income"
  4. Enter Amount: "5000000"
  5. Select Category: "Salary"
  6. Select Date: "26/05/2026"
  7. Select Time: "05:26"
  8. Enter Note: "May Bonus Salary"
  9. Press "Save Transaction" button
- **Expected Result (ER):**
  1. Transaction added successfully
  2. Balance updated accordingly
  3. Reflect updated data on UI
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/12/2026
- **Device:** Web

---

### Test Case: UC07UI02 - Add manual transaction (Expense)
- **Function/Feature ID:** Function 07: Add manual transaction
- **Case ID:** UC07UI02
- **Test Step:**
  1. Press "Add Transaction" button
  2. Enter transaction's name: "Eat"
  3. Select Type: "Expense"
  4. Enter Amount: "500000"
  5. Select Category: "Food and Drink"
  6. Select Date: "26/05/2026"
  7. Select Time: "05:26"
  8. Enter Note: "Breakfast"
  9. Press "Save Transaction" button
- **Expected Result (ER):**
  1. Transaction added successfully
  2. Balance and history updated
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/12/2026
- **Device:** Web

---

### Test Case: UC07UI03 - Add manual transaction with invalid amount
- **Function/Feature ID:** Function 07: Add manual transaction
- **Case ID:** UC07UI03
- **Test Step:**
  1. Press "Add Transaction" button
  2. Enter transaction's name: "Bonus Salary"
  3. Select Type: "Income"
  4. Enter Amount: "5000000000"
  5. Select Category: "Salary"
  6. Select Date: "26/05/2026"
  7. Select Time: "05:26"
  8. Enter Note: "May Bonus Salary"
  9. Press "Save Transaction" button
- **Expected Result (ER):**
  1. Show validation error: "Transaction cannot greater than 2 Billions"
- **Actual Result:** 1. Transaction accept value larger than 2 Billions
- **Status:** **`Fail`**
- **Tester:** PVBDat
- **Tested Date:** 8/12/2026
- **Device:** Web

---

### Test Case: UC07UI04 - Add manual transaction with invalid time
- **Function/Feature ID:** Function 07: Add manual transaction
- **Case ID:** UC07UI04
- **Test Step:**
  1. Press "Add Transaction" button
  2. Enter transaction's name: "Bonus Salary"
  3. Select Type: "Income"
  4. Enter Amount: "5000000"
  5. Select Category: "Salary"
  6. Select Date: "26/05/2026"
  7. Select Time: "25:26"
  8. Enter Note: "May Bonus Salary"
  9. Press "Save Transaction" button
- **Expected Result (ER):**
  1. Show validation error: "Invalid Time"
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/12/2026
- **Device:** Web

---

### Test Case: UC07UI05 - Add manual transaction with zero amount
- **Function/Feature ID:** Function 07: Add manual transaction
- **Case ID:** UC07UI05
- **Test Step:**
  1. Press "Add Transaction" button
  2. Enter transaction's name: "Bonus Salary"
  3. Select Type: "Income"
  4. Enter Amount: "0"
  5. Select Category: "Salary"
  6. Select Date: "26/05/2026"
  7. Select Time: "05:26"
  8. Enter Note: "May Bonus Salary"
  9. Press "Save Transaction" button
- **Expected Result (ER):**
  1. Show validation error: "Amount must be greater than 0"
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/12/2026
- **Device:** Web

---

### Test Case: UC07UI06 - Add manual transaction with blank mandatory fields (Name, Amount, Date, Time)
- **Function/Feature ID:** Function 07: Add manual transaction
- **Case ID:** UC07UI06
- **Test Step:**
  1. Press "Add Transaction" button
  2. Enter transaction's name: ""
  3. Select Type: "Income"
  4. Enter Amount: "5000000"
  5. Select Category: "Salary"
  6. Select Date: "26/05/2026"
  7. Select Time: "05:26"
  8. Enter Note: "May Bonus Salary"
  9. Press "Save Transaction" button
- **Expected Result (ER):**
  1. Show warning: (e.g: Transaction name is required)
- **Actual Result:** Same as ER
- **Status:** `Pass`
- **Tester:** PVBDat
- **Tested Date:** 8/12/2026
- **Device:** Web