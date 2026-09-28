import { defineFlow } from '@/flows';
import type { AuthContext } from './types';
import { AuthSuccessScreen } from './screens/AuthSuccessScreen';
import { AuthWelcomeScreen } from './screens/AuthWelcomeScreen';

import { existingUserSubflow } from './subflows/existing-user';
import { otpAuthSubflow } from './subflows/otp-auth';
import { passwordAuthSubflow } from './subflows/password-auth';
import { registrationSubflow } from './subflows/registration';

export const initialAuthContext: AuthContext = {
  email: '',
  firstName: undefined,
  isExistingUser: undefined,
  authMethod: 'password',
};

/**
 * Control Flow: Classic Auth Baseline
 */
export const authControlFlow = defineFlow<AuthContext>({
  id: 'auth-control',
  name: 'Classic Auth (Control Flow)',
  initial: 'welcome',
  initialContext: initialAuthContext,
  steps: {
    welcome: {
      type: 'screen',
      title: 'Choose Auth Method',
      component: AuthWelcomeScreen,
      next: (context, payload) => {
        const method = payload?.authMethod ?? context.authMethod;
        return method === 'otp' ? 'otpAuth' : 'passwordAuth';
      },
    },
    passwordAuth: {
      type: 'subflow',
      title: 'Password Authentication',
      subflow: passwordAuthSubflow,
      onComplete: (context) =>
        context.isExistingUser ? 'existingUser' : 'registration',
    },
    otpAuth: {
      type: 'subflow',
      title: 'Email OTP Authentication',
      subflow: otpAuthSubflow,
      onComplete: (context) =>
        context.isExistingUser ? 'existingUser' : 'registration',
    },
    registration: {
      type: 'subflow',
      title: 'Registration Subflow',
      subflow: registrationSubflow,
      onComplete: () => 'authenticatedHome',
    },
    existingUser: {
      type: 'subflow',
      title: 'Existing User Subflow',
      subflow: existingUserSubflow,
      onComplete: () => 'authenticatedHome',
    },
    authenticatedHome: {
      title: 'Home (Authenticated)',
      component: AuthSuccessScreen,
      next: null,
    },
  },
});
