import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function WelcomeScreen() {
  const { next, back, context } = useFlow<AuthContext>();

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>PARENT FLOW RESUMED</Text>
      <Text style={styles.title}>Welcome, {context.username || 'Friend'}! 🎉</Text>
      <Text style={styles.subtitle}>
        Your registration subflow finished and returned control to the main flow.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details:</Text>
        <Text style={styles.cardText}>Email: {context.email || 'None'}</Text>
        <Text style={styles.cardText}>Username: {context.username || 'None'}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={back}>
          <Text style={styles.secondaryButtonText}>&larr; Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => next()}>
          <Text style={styles.buttonText}>Finish &rarr;</Text>
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardText: {
    fontSize: 14,
    color: '#475569',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
});
