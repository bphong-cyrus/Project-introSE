// SmartSpend AI - Header Component
// Based on Figma Frame ID: 87:125

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors } from '../../../shared/constants/colors';
import { User } from '../../../shared/types';

interface HeaderProps {
  user?: User;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onMenuPress,
  onNotificationPress,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <View style={styles.container}>
      {/* Top Row: Menu + Logo + Notification */}
      <View style={styles.topRow}>
        {/* Hamburger Menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>

        {/* App Logo & Title */}
        <View style={styles.logoContainer}>
          <Text style={styles.appTitle}>SmartSpend AI</Text>
          <Text style={styles.subtitle}>SỔ CHI TIÊU CÁ NHÂN</Text>
        </View>

        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress}
        >
          <View style={styles.bellIcon}>
            <Text style={styles.bellText}>🔔</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* User Greeting */}
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.fullName || 'Nguyễn Văn A'}
        </Text>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0) || 'A'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuButton: {
    width: 25,
    height: 20,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 25,
    height: 3,
    backgroundColor: Colors.textLight,
    borderRadius: 2,
  },
  logoContainer: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  subtitle: {
    fontSize: 10,
    color: Colors.textLight,
    letterSpacing: 1,
    opacity: 0.9,
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellText: {
    fontSize: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
});

export default Header;
