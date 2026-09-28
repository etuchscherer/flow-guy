import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function AuthLandingScreen() {
  const { next, context, updateContext } = useFlow<AuthContext>();

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>JOURNEY: AUTH</Text>
      <Text style={styles.title}>Welcome to StickerSmash</Text>
      <Text style={styles.subtitle}>
        Experience the router-independent Flow Orchestration Engine.
      </Text>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Are you a returning user?</Text>
          <Switch
            value={context.isReturningUser}
            onValueChange={(val) => updateContext({ isReturningUser: val })}
            trackColor={{ false: '#334155', true: '#38bdf8' }}
          />
        </View>

        <Text style={styles.hint}>
          {context.isReturningUser
            ? 'Branch: Will transition directly to Quick Login.'
            : 'Branch: Will launch the multi-step Registration Subflow!'}
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => next()}>
        <Text style={styles.buttonText}>Continue &rarr;</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
