// SmartSpend AI - Bottom Tab Bar
// Bootstrap Icons: uses Ionicons which has Bootstrap-style icons
// Primary color: #167B63
// Design: 5 tabs - home, transactions, add, budget, profile

import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

export type TabName = 'Home' | 'Transactions' | 'Add' | 'Budget' | 'Profile';
type RegularTabName = Exclude<TabName, 'Add'>;

export const BOTTOM_TAB_BAR_HEIGHT = 112;

const LEFT_TABS: RegularTabName[] = ['Home', 'Transactions'];
const RIGHT_TABS: RegularTabName[] = ['Budget', 'Profile'];

const TAB_CONFIG: Record<RegularTabName, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = {
  Home: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  Transactions: { label: 'Giao dịch', icon: 'list-outline', activeIcon: 'list' },
  Budget: { label: 'Ngân sách', icon: 'wallet-outline', activeIcon: 'wallet' },
  Profile: { label: 'Hồ sơ', icon: 'person-circle-outline', activeIcon: 'person-circle' },
};

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

  const renderTab = (tab: RegularTabName) => {
    const focused = isActive(tab);
    const config = TAB_CONFIG[tab];
    const color = focused ? Colors.primary : Colors.textMuted;

    return (
      <TouchableOpacity
        key={tab}
        style={styles.tabItem}
        onPress={() => onTabPress?.(tab)}
        activeOpacity={0.78}
      >
        <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
          <Ionicons name={focused ? config.activeIcon : config.icon} size={21} color={color} />
        </View>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
          {config.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Background */}
      <View style={styles.tabBackground}>
        {/* Left 2 tabs */}
        <View style={styles.leftTabs}>
          {LEFT_TABS.map(renderTab)}
        </View>

        {/* Center - Floating Add Button */}
        <View style={styles.centerContainer}>
          <TouchableOpacity
            style={[styles.addButtonWrapper, isActive('Add') && styles.addButtonWrapperActive]}
            onPress={onAddPress || (() => onTabPress?.('Add'))}
            activeOpacity={0.85}
          >
            <View style={styles.addButtonFloating}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.tabLabel, isActive('Add') && styles.tabLabelActive]}>Thêm</Text>
        </View>

        {/* Right 2 tabs */}
        <View style={styles.rightTabs}>
          {RIGHT_TABS.map(renderTab)}
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
    paddingTop: 14,
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
    paddingVertical: 6,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(22, 123, 99, 0.1)',
  },
  tabLabel: {
    marginTop: 2,
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  addButtonWrapper: {
    alignItems: 'center',
  },
  addButtonWrapperActive: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
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