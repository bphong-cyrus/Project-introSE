// SmartSpend AI - Main App Entry Point
// React Native with Expo
// Handles Authentication Flow + Main App Navigation

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Colors } from '../../shared/constants/colors';

// Providers
import { AuthProvider, useAuth } from '../../state/AuthContext';
import { TransactionProvider } from '../../state/TransactionContext';
import { CategoryProvider } from '../../state/CategoryContext';
import { NotificationProvider } from '../../state/NotificationContext';

// Auth Screens
import {
  SplashScreen,
  LoginScreen,
  RegisterScreen,
  ProfileSetupScreen,
  ForgotPasswordScreen,
  OTPScreen,
  ResetPasswordScreen,
} from './screens';

// Main App Screens & Components
import { HomeScreen, ProfileScreen, BudgetScreen, NotificationCenterScreen } from './screens';
import { BottomTabBar } from './components';
import { BOTTOM_TAB_BAR_HEIGHT } from './navigation/BottomTabBar';
import { AddTransactionScreen } from '../../modules/transactions';
import { AIScannerScreen, AIResultScreen } from '../../modules/ai-scanner';
import type { ExtractedReceiptData } from '../../modules/ai-scanner/screens/AIScannerScreen';
import { TransactionHistoryScreen, TransactionDetailScreen, EditTransactionScreen } from '../../modules/transactions';
import { Transaction } from '../../shared/types';

// Type definitions
type TabName = 'Home' | 'Transactions' | 'Add' | 'Budget' | 'Profile';
type AddFlowScreen = 'main' | 'ai-scanner' | 'ai-result';
type HistoryScreen = 'list' | 'detail' | 'edit';
type AuthScreen = 'login' | 'register' | 'forgotPassword' | 'otp' | 'resetPassword' | 'profileSetup';

// Inner app component that uses auth context
const AppContent: React.FC = () => {
  const { authState } = useAuth();

  // Auth navigation state
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [showSplash, setShowSplash] = useState(true);

  // Main app state (same as before)
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [addFlowScreen, setAddFlowScreen] = useState<AddFlowScreen>('main');
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [historyScreen, setHistoryScreen] = useState<HistoryScreen>('list');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    if (authState === 'authenticated') {
      setAuthScreen('login');
      setActiveTab('Home');
      setAddFlowScreen('main');
      setHistoryScreen('list');
      setSelectedTransactionId(null);
      setSelectedTransaction(null);
      setSelectedHistoryDate(null);
      setShowNotificationCenter(false);
    }
  }, [authState]);

  // Handle splash screen ready
  const handleSplashReady = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Auth navigation handlers
  const navigateToLogin = useCallback(() => {
    setAuthScreen('login');
  }, []);

  const navigateToRegister = useCallback(() => {
    setAuthScreen('register');
  }, []);

  const navigateToForgotPassword = useCallback(() => {
    setAuthScreen('forgotPassword');
  }, []);

  const navigateToOTP = useCallback((email: string) => {
    setPendingEmail(email);
    setAuthScreen('otp');
  }, []);

  const navigateToResetPassword = useCallback(() => {
    setAuthScreen('resetPassword');
  }, []);

  const navigateToProfileSetup = useCallback(() => {
    setAuthScreen('profileSetup');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    // AuthContext will update authState, which will trigger re-render
    // and show the main app
  }, []);

  // Tab navigation handlers (same as before)
  const handleTabPress = (tab: TabName) => {
    setShowNotificationCenter(false);
    setActiveTab(tab);
    setAddFlowScreen('main');
    if (tab !== 'Transactions') {
      setSelectedHistoryDate(null);
    }
    if (activeTab === 'Transactions' && tab !== 'Transactions') {
      setHistoryScreen('list');
      setSelectedTransactionId(null);
      setSelectedTransaction(null);
    }
  };

  const handleHomeDateSelect = (date: Date) => {
    setSelectedHistoryDate(date);
    setHistoryScreen('list');
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
    setActiveTab('Transactions');
    setAddFlowScreen('main');
  };

  const handleAddPress = () => {
    setActiveTab('Add');
    setAddFlowScreen('main');
  };

  const handleTransactionSaved = () => {
    setActiveTab('Home');
    setAddFlowScreen('main');
    setExtractedData(null);
  };

  const handleScanReceipt = () => {
    setAddFlowScreen('ai-scanner');
  };

  const handleAICapture = (data: ExtractedReceiptData) => {
    setExtractedData(data);
    setAddFlowScreen('ai-result');
  };

  const handleAIResultBack = () => {
    setAddFlowScreen('ai-scanner');
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSelectedTransactionId(transaction.id);
    setHistoryScreen('detail');
  };

  const handleHistoryBack = () => {
    setHistoryScreen('list');
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
    setSelectedHistoryDate(null);
    setActiveTab('Home');
  };

  const handleDetailBack = () => {
    setHistoryScreen('list');
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
  };

  const handleDetailEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setHistoryScreen('edit');
  };

  const handleDetailDeleted = () => {
    setHistoryScreen('list');
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
  };

  const handleEditBack = () => {
    setHistoryScreen('detail');
    setSelectedTransaction(null);
  };

  const handleEditSaved = () => {
    setHistoryScreen('list');
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
  };

  // Render auth screens
  const renderAuthScreen = () => {
    switch (authScreen) {
      case 'login':
        return (
          <LoginScreen
            onNavigateToRegister={navigateToRegister}
            onNavigateToForgotPassword={navigateToForgotPassword}
            onLoginSuccess={handleAuthSuccess}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onNavigateToLogin={navigateToLogin}
            onNavigateToOTP={navigateToOTP}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPasswordScreen
            onBackToLogin={navigateToLogin}
            onNavigateToOTP={navigateToOTP}
          />
        );
      case 'otp':
        return (
          <OTPScreen
            email={pendingEmail}
            purpose="register"
            onVerified={navigateToProfileSetup}
            onBack={navigateToLogin}
          />
        );
      case 'resetPassword':
        return (
          <ResetPasswordScreen
            email={pendingEmail}
            otpToken=""
            onSuccess={navigateToLogin}
            onBack={navigateToLogin}
          />
        );
      case 'profileSetup':
        return (
          <ProfileSetupScreen
            onComplete={handleAuthSuccess}
            onSkip={handleAuthSuccess}
          />
        );
      default:
        return (
          <LoginScreen
            onNavigateToRegister={navigateToRegister}
            onNavigateToForgotPassword={navigateToForgotPassword}
            onLoginSuccess={handleAuthSuccess}
          />
        );
    }
  };

  // Render main app content
  const renderMainContent = () => {
    if (showNotificationCenter) {
      return <NotificationCenterScreen onBack={() => setShowNotificationCenter(false)} />;
    }

    // Transaction History content
    const renderTransactionsContent = () => {
      if (historyScreen === 'edit' && selectedTransaction) {
        return (
          <EditTransactionScreen
            transaction={selectedTransaction}
            onBack={handleEditBack}
            onSaved={handleEditSaved}
          />
        );
      }

      if (historyScreen === 'detail' && selectedTransactionId) {
        return (
          <TransactionDetailScreen
            transactionId={selectedTransactionId}
            onBack={handleDetailBack}
            onEdit={handleDetailEdit}
            onDeleted={handleDetailDeleted}
          />
        );
      }

      return (
        <TransactionHistoryScreen
          onBack={handleHistoryBack}
          onTransactionPress={handleTransactionPress}
          showTopBar={true}
          selectedDate={selectedHistoryDate}
        />
      );
    };

    // Render based on active tab
    if (activeTab === 'Add') {
      if (addFlowScreen === 'ai-scanner') {
        return (
          <AIScannerScreen
            onClose={() => setAddFlowScreen('main')}
            onCapture={handleAICapture}
          />
        );
      }
      if (addFlowScreen === 'ai-result' && extractedData) {
        return (
          <AIResultScreen
            data={extractedData}
            onBack={handleAIResultBack}
            onSaved={handleTransactionSaved}
          />
        );
      }
      return (
        <AddTransactionScreen
          onClose={() => {
            setActiveTab('Home');
            setAddFlowScreen('main');
          }}
          onSaved={handleTransactionSaved}
          onScanReceipt={handleScanReceipt}
        />
      );
    }

    switch (activeTab) {
      case 'Home':
        return (
          <HomeScreen
            onTabChange={handleTabPress}
            onDateSelect={handleHomeDateSelect}
            onNotificationsPress={() => setShowNotificationCenter(true)}
          />
        );
      case 'Transactions':
        return renderTransactionsContent();
      case 'Budget':
        return <BudgetScreen />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return (
          <HomeScreen
            onTabChange={handleTabPress}
            onDateSelect={handleHomeDateSelect}
            onNotificationsPress={() => setShowNotificationCenter(true)}
          />
        );
    }
  };

  // Show splash screen
  if (showSplash && authState === 'loading') {
    return <SplashScreen onReady={handleSplashReady} />;
  }

  // Show profile setup whenever the signed-in user has not completed onboarding
  if (authState === 'onboarding') {
    return (
      <View style={styles.container}>
        <ProfileSetupScreen
          onComplete={handleAuthSuccess}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  // Show auth screens if not authenticated
  if (authState === 'unauthenticated') {
    return (
      <View style={styles.container}>
        {renderAuthScreen()}
        <StatusBar style="dark" />
      </View>
    );
  }

  // Show main app when authenticated
  return (
    <NavigationContainer>
      <View style={styles.container}>
        <View style={styles.content}>
          {renderMainContent()}
        </View>
        <BottomTabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          onAddPress={handleAddPress}
        />
      </View>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

// Main App component with all providers
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CategoryProvider>
          <TransactionProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </TransactionProvider>
        </CategoryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    paddingBottom: BOTTOM_TAB_BAR_HEIGHT,
  },
});
