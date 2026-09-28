import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function EnterFirstNameScreen() {
  const { next, back, updateContext } = useFlow<AuthContext>();
  const [firstName, setFirstName] = useState('');

  const handleSubmit = () => {
    updateContext({ firstName: firstName.trim() || 'Valued Member' });
    next();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBadge}>
        <Text style={styles.badgeText}>PROFILE COMPLETION</Text>
      </View>

      <Text style={styles.title}>What is your first name?</Text>
      <Text style={styles.subtitle}>
        Your account is recognized, but your profile is missing a first name.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your first name"
        placeholderTextColor="#64748b"
        value={firstName}
        onChangeText={setFirstName}
        autoFocus
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={back}>
          <Text style={styles.secondaryButtonText}>&larr; Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Save & Proceed &rarr;</Text>
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
  headerBadge: {
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
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
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
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
