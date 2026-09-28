import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFlow } from '@/flows';
import { MOCK_OTP_CODE } from '../test-users';
import type { AuthContext } from '../types';

export function EnterOtpScreen() {
  const { next, back, context, updateContext, subflowDepth } = useFlow<AuthContext>();
  const [code, setCode] = useState(context.otpCode || MOCK_OTP_CODE);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = () => {
    setIsValidating(true);
    // 1-second simulated asynchronous validation call
    setTimeout(() => {
      setIsValidating(false);
      updateContext({ otpCode: code });
      next();
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.subflowHeader}>
        <Text style={styles.subflowBadge}>EMAIL OTP SUBFLOW (Depth {subflowDepth})</Text>
      </View>

      <Text style={styles.title}>Enter verification number</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{' '}
        <Text style={styles.bold}>{context.email || 'your email'}</Text>.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="123456"
        placeholderTextColor="#64748b"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        editable={!isValidating}
        autoFocus
      />

      <Text style={styles.hint}>
        Hint: Any 6 digits or test code <Text style={styles.bold}>{MOCK_OTP_CODE}</Text> will validate.
      </Text>

      {isValidating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#0284c7" />
          <Text style={styles.loadingText}>Verifying code with server (1s)...</Text>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={back}>
            <Text style={styles.secondaryButtonText}>&larr; Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Verify & Continue &rarr;</Text>
          </TouchableOpacity>
        </View>
      )}
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
  bold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    color: '#0f172a',
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
  },
  loadingText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '600',
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
