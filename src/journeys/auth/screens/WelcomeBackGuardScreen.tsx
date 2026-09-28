import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function WelcomeBackGuardScreen() {
  const { next, context } = useFlow<AuthContext>();
  const [secondsRemaining, setSecondsRemaining] = useState(2);

  useEffect(() => {
    // 2-second countdown pretending to validate account requirements
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          next();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.guardBadgeContainer}>
        <Text style={styles.guardBadge}>🛡️ SECURITY & REQUIREMENTS GUARD</Text>
      </View>

      <Text style={styles.title}>
        Welcome back, {context.firstName || 'User'}! 👋
      </Text>
      <Text style={styles.subtitle}>
        Verifying account requirements and active security policies...
      </Text>

      <View style={styles.statusCard}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.statusText}>
          {secondsRemaining > 0
            ? `Checking permissions... (${secondsRemaining}s)`
            : 'Access Granted! Entering app...'}
        </Text>
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={() => next()}>
        <Text style={styles.skipButtonText}>Continue Immediately &rarr;</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  guardBadgeContainer: {
    marginBottom: 4,
  },
  guardBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    width: '100%',
    maxWidth: 340,
    marginTop: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '600',
  },
});
