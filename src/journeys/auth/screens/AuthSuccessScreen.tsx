import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function AuthSuccessScreen() {
  const { next, context, reset } = useFlow<AuthContext>();

  return (
    <View style={styles.container}>
      <Text style={styles.successEmoji}>🎉</Text>
      <Text style={styles.badge}>AUTHENTICATION COMPLETE</Text>
      <Text style={styles.title}>You are in!</Text>
      <Text style={styles.subtitle}>
        Welcome to StickerSmash, <Text style={styles.bold}>{context.firstName || 'Friend'}</Text>!
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Information:</Text>
        <Text style={styles.cardText}>Email: {context.email}</Text>
        <Text style={styles.cardText}>First Name: {context.firstName || '(Not set)'}</Text>
        <Text style={styles.cardText}>
          Auth Method: {context.authMethod === 'otp' ? '✉️ Email OTP' : '🔑 Password'}
        </Text>
        <Text style={styles.cardText}>
          Status: {context.isExistingUser ? 'Existing Member' : 'Newly Registered'}
        </Text>
        <Text style={styles.cardText}>
          Plan:{' '}
          {context.tier === 'pro'
            ? `⭐ Pro Member (${context.selectedPlan === 'monthly' ? 'Monthly' : 'Annual'})`
            : '👤 Free Plan'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
          <Text style={styles.secondaryButtonText}>Restart Journey</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => next()}>
          <Text style={styles.buttonText}>Go to App &rarr;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  successEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 18,
    gap: 6,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
    maxWidth: 360,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
});
