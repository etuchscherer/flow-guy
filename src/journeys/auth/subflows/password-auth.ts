import { defineFlow } from '@/flows';
import type { AuthContext } from '../types';
import { EnterEmailScreen } from '../screens/EnterEmailScreen';
import { EnterPasswordScreen } from '../screens/EnterPasswordScreen';


/**
 * Subflow: Password Authentication Subflow
 * Enter Email -> Enter Password -> Submit
 */
export const passwordAuthSubflow = defineFlow<AuthContext>({
  id: 'password-auth-subflow',
  name: 'Password Authentication Subflow',
  description: 'Two-step password authentication: email input followed by password.',
  initial: 'enterEmail',
  steps: {
    enterEmail: {
      title: 'Enter Email',
      component: EnterEmailScreen,
      next: 'enterPassword',
    },
    enterPassword: {
      title: 'Enter Password',
      component: EnterPasswordScreen,
      next: null, // Completes password subflow
    },
  },
});
