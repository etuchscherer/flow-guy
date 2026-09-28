import { defineFlow } from '@/flows';
import type { AuthContext } from '../types';
import { EnterEmailScreen } from '../screens/EnterEmailScreen';
import { EnterOtpScreen } from '../screens/EnterOtpScreen';


/**
 * Subflow: Email OTP Authentication Subflow
 * Enter Email -> Enter Verification Code (1s async validation)
 */
export const otpAuthSubflow = defineFlow<AuthContext>({
  id: 'otp-auth-subflow',
  name: 'Email OTP Authentication Subflow',
  description:
    'Two-step passwordless OTP: email input followed by 6-digit verification code with 1s async validation.',
  initial: 'enterEmail',
  steps: {
    enterEmail: {
      title: 'Enter Email',
      component: EnterEmailScreen,
      next: 'enterOtp',
    },
    enterOtp: {
      title: 'Enter OTP Code',
      component: EnterOtpScreen,
      next: null, // Completes OTP subflow
    },
  },
});
