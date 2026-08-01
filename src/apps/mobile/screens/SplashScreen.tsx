// SmartSpend AI - Splash Screen
// Initial loading screen with app branding
// Auto-redirects based on auth state

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Optional gradient
import { Colors } from '../../../shared/constants/colors';
import { useAuth } from '../../../state/AuthContext';

interface SplashScreenProps {
  onReady: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onReady }) => {
  const { authState } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (authState !== 'loading') {
      // Small delay for splash animation
      const timer = setTimeout(() => {
        onReady();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authState, onReady]);

  return (
    <View style={styles.container}>
      {/* Background gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Animated logo container */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glow effect behind logo */}
        <Animated.View style={[styles.logoGlow, { opacity: logoOpacity }]} />

        {/* App Icon */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>💰</Text>
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>SmartSpend AI</Text>
        <Text style={styles.tagline}>Quản lý tài chính thông minh</Text>
      </Animated.View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryDark,
    opacity: 0.3,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    top: -50,
    left: -50,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconText: {
    fontSize: 56,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default SplashScreen;
