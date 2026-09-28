import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import { findMockUser } from '../test-users';
import type { AuthContext } from '../types';

export function EnterEmailScreen() {
  const { next, back, context, updateContext, subflowDepth } = useFlow<AuthContext>();
  const [emailInput, setEmailInput] = useState(context.email || '');

  const handleContinue = () => {
    const email = emailInput.trim() || 'jane@example.com';
    const mockUser = findMockUser(email);

    updateContext({
      email,
      isExistingUser: mockUser ? mockUser.isExisting : false,
      firstName: mockUser ? mockUser.firstName : undefined,
    });
    next();
  };

  const isOtp = context.authMethod === 'otp';

  return (
    <View style={styles.container}>
      <View style={styles.subflowHeader}>
        <Text style={styles.subflowBadge}>
          {isOtp ? 'OTP SUBFLOW' : 'PASSWORD SUBFLOW'} (Depth {subflowDepth})
        </Text>
      </View>

      <Text style={styles.title}>Please enter your email</Text>
      <Text style={styles.subtitle}>
        We will check if your account exists to route your journey.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#64748b"
        value={emailInput}
        onChangeText={setEmailInput}
        autoCapitalize="none"
        keyboardType="email-address"
        autoFocus
      />

      <View style={styles.hintCard}>
        <Text style={styles.hintTitle}>💡 Try one of our test emails:</Text>
        <Text style={styles.hintItem}>• <Text style={styles.bold}>jane@example.com</Text> (Existing with name)</Text>
        <Text style={styles.hintItem}>• <Text style={styles.bold}>noname@example.com</Text> (Existing, missing name)</Text>
        <Text style={styles.hintItem}>• <Text style={styles.bold}>newuser@example.com</Text> (New user registration)</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={back}>
          <Text style={styles.secondaryButtonText}>&larr; Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue &rarr;</Text>
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
  subflowHeader: {
    alignSelf: 'flex-start',
  },
  subflowBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
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
  hintCard: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  hintItem: {
    fontSize: 12,
    color: '#64748b',
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b',
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
