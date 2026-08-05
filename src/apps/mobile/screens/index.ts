// SmartSpend AI - Screens Index
// Re-exports screens from use cases

// Auth Screens
export { default as SplashScreen } from './SplashScreen';
export { default as LoginScreen } from './LoginScreen';
export { default as RegisterScreen } from './RegisterScreen';
export { default as ProfileSetupScreen } from './ProfileSetupScreen';
export { default as ForgotPasswordScreen } from './ForgotPasswordScreen';
export { default as OTPScreen } from './OTPScreen';
export { default as ResetPasswordScreen } from './ResetPasswordScreen';

// Main App Screens
export { default as HomeScreen } from './HomeScreen';
export { default as ProfileScreen } from './ProfileScreen';
export { default as PlaceholderScreen } from './PlaceholderScreen';
export { default as NotificationCenterScreen } from './NotificationCenterScreen';

// Budget & Categories (from use cases)
export { BudgetScreen, CategoryEditScreen } from '../../../modules/budgets';
export { TransactionHistoryScreen, AddCategorySheet, DeleteConfirmDialog } from '../../../modules/categories';
