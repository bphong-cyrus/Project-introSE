// SmartSpend AI - Main App Entry Point
// React Native with Expo

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen, PlaceholderScreen, BudgetScreen, CategoryEditScreen } from './screens';
import { Colors } from '../../shared/constants/colors';
import { BottomTabBar } from './components';
import { BOTTOM_TAB_BAR_HEIGHT } from './navigation/BottomTabBar';
import { TransactionProvider } from '../../state/TransactionContext';
import { CategoryProvider } from '../../state/CategoryContext';
import { AddTransactionScreen } from '../../modules/transactions';
import { AIScannerScreen, AIResultScreen } from '../../modules/ai-scanner';
import type { ExtractedReceiptData } from '../../modules/ai-scanner/screens/AIScannerScreen';
import { TransactionHistoryScreen } from '../../modules/transactions';
import { TransactionDetailScreen } from '../../modules/transactions';
import { EditTransactionScreen } from '../../modules/transactions';
import { Transaction } from '../../shared/types';

type TabName = 'Home' | 'Transactions' | 'Add' | 'Budget' | 'Categories';

// Sub-screen state for AddTransaction flow
type AddFlowScreen = 'main' | 'ai-scanner' | 'ai-result';

// History screen flow
type HistoryScreen = 'list' | 'detail' | 'edit';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [addFlowScreen, setAddFlowScreen] = useState<AddFlowScreen>('main');
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);

  // History/Detail/Edit flow state
  const [historyScreen, setHistoryScreen] = useState<HistoryScreen>('list');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    setAddFlowScreen('main');
    // Reset history flow when leaving Transactions tab
    if (activeTab === 'Transactions' && tab !== 'Transactions') {
      setHistoryScreen('list');
      setSelectedTransactionId(null);
      setSelectedTransaction(null);
    }
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

  // Transaction History handlers
  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSelectedTransactionId(transaction.id);
    setHistoryScreen('detail');
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

  // Render Transactions tab content
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
        onTransactionPress={handleTransactionPress}
        showTopBar={true}
      />
    );
  };

  // Render content based on active tab and add-flow screen
  const renderContent = () => {
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
        return <HomeScreen onTabChange={handleTabPress} />;
      case 'Transactions':
        return renderTransactionsContent();
      case 'Budget':
        return <BudgetScreen />;
      case 'Categories':
        return <PlaceholderScreen title="Danh mục" />;
      default:
        return <HomeScreen onTabChange={handleTabPress} />;
    }
  };

  return (
    <SafeAreaProvider>
      <CategoryProvider>
        <TransactionProvider>
          <NavigationContainer>
            <View style={styles.container}>
              <View style={styles.content}>
                {renderContent()}
              </View>
              <BottomTabBar
                activeTab={activeTab}
                onTabPress={handleTabPress}
                onAddPress={handleAddPress}
              />
            </View>
            <StatusBar style="auto" />
          </NavigationContainer>
        </TransactionProvider>
      </CategoryProvider>
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