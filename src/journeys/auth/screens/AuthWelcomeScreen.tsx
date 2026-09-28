import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function AuthWelcomeScreen() {
  const { next, updateContext, context } = useFlow<AuthContext>();

  const selectPersona = (email: string, firstName?: string, isExisting = true) => {
    updateContext({
      email,
      firstName,
      isExistingUser: isExisting,
    });
  };

  const chooseMethod = (method: 'password' | 'otp') => {
    updateContext({ authMethod: method });
    next({ authMethod: method });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>CLASSIC AUTH FLOW</Text>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>
        Choose your authentication method to begin the flow.
      </Text>

      {/* Quick-fill test personas */}
      <View style={styles.personaBox}>
        <Text style={styles.personaTitle}>🧪 Quick Test Personas:</Text>
        <View style={styles.personaList}>
          <TouchableOpacity
            style={[
              styles.personaBtn,
              context.email === 'jane@example.com' && styles.personaBtnActive,
            ]}
            onPress={() => selectPersona('jane@example.com', 'Jane', true)}>
            <Text style={styles.personaBtnText}>👤 Jane (Complete)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.personaBtn,
              context.email === 'noname@example.com' && styles.personaBtnActive,
            ]}
            onPress={() => selectPersona('noname@example.com', '', true)}>
            <Text style={styles.personaBtnText}>👤 No-Name (Needs Name)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.personaBtn,
              context.email === 'newuser@example.com' && styles.personaBtnActive,
            ]}
            onPress={() => selectPersona('newuser@example.com', undefined, false)}>
            <Text style={styles.personaBtnText}>✨ New User (Register)</Text>
          </TouchableOpacity>
        </View>
        {context.email ? (
          <Text style={styles.selectedEmail}>Selected: {context.email}</Text>
        ) : null}
      </View>

      {/* Primary Auth Method Buttons */}
      <View style={styles.methodList}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => chooseMethod('password')}>
          <Text style={styles.buttonText}>🔑 Sign In with Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => chooseMethod('otp')}>
          <Text style={styles.secondaryButtonText}>✉️ Sign In with Email OTP</Text>
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
    color: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
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
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  personaBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  personaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  personaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  personaBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  personaBtnActive: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  personaBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  selectedEmail: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  methodList: {
    gap: 12,
    marginTop: 8,
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
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
  },
});
