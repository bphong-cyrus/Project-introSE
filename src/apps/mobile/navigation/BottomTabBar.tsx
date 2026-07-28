// SmartSpend AI - Bottom Tab Bar
// Bootstrap Icons: uses Ionicons which has Bootstrap-style icons
// Primary color: #167B63
// Design: 5 tabs - home, list, + (floating), wallet, folder

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

type TabName = 'Home' | 'Transactions' | 'Add' | 'Budget' | 'Categories';

export const BOTTOM_TAB_BAR_HEIGHT = 112;

interface BottomTabBarProps {
  activeTab?: TabName;
  onTabPress?: (tab: TabName) => void;
  onAddPress?: () => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab = 'Home',
  onTabPress,
  onAddPress,
}) => {
  const isActive = (name: TabName) => activeTab === name;

  const getTabIcon = (tab: TabName, focused: boolean) => {
    const color = focused ? Colors.primary : Colors.textMuted;
    const size = 24;

    switch (tab) {
      case 'Home':
        return <Ionicons name="home" size={size} color={color} />;
      case 'Transactions':
        return <Ionicons name="list" size={size} color={color} />;
      case 'Add':
        return <Ionicons name="add-circle" size={size + 2} color="#FFFFFF" />;
      case 'Budget':
        return <Ionicons name="wallet" size={size} color={color} />;
      case 'Categories':
        return <Ionicons name="folder" size={size} color={color} />;
      default:
        return <Ionicons name="home" size={size} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Background */}
      <View style={styles.tabBackground}>
        {/* Left 2 tabs */}
        <View style={styles.leftTabs}>
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress?.('Home')}
          >
            <View style={[styles.iconWrapper, isActive('Home') && styles.iconWrapperActive]}>
              {getTabIcon('Home', isActive('Home'))}
            </View>
          </TouchableOpacity>

          {/* Transactions Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress?.('Transactions')}
          >
            <View style={[styles.iconWrapper, isActive('Transactions') && styles.iconWrapperActive]}>
              {getTabIcon('Transactions', isActive('Transactions'))}
            </View>
          </TouchableOpacity>
        </View>

        {/* Center - Floating Add Button */}
        <View style={styles.centerContainer}>
          <TouchableOpacity
            style={styles.addButtonWrapper}
            onPress={onAddPress}
            activeOpacity={0.85}
          >
            <View style={styles.addButtonFloating}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Right 2 tabs */}
        <View style={styles.rightTabs}>
          {/* Budget Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress?.('Budget')}
          >
            <View style={[styles.iconWrapper, isActive('Budget') && styles.iconWrapperActive]}>
              {getTabIcon('Budget', isActive('Budget'))}
            </View>
          </TouchableOpacity>

          {/* Categories Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress?.('Categories')}
          >
            <View style={[styles.iconWrapper, isActive('Categories') && styles.iconWrapperActive]}>
              {getTabIcon('Categories', isActive('Categories'))}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
  },
  tabBackground: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 15,
  },
  leftTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(22, 123, 99, 0.1)',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 70,
  },
  addButtonWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonFloating: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ translateY: -16 }],
  },
});

export default BottomTabBar;