import { defineFlow } from '@/flows';
import type { AuthContext } from '../types';
import { EnterFirstNameScreen } from '../screens/EnterFirstNameScreen';
import { WelcomeBackGuardScreen } from '../screens/WelcomeBackGuardScreen';


/**
 * Subflow: Existing User Validation Flow
 * Choice point: Has first_name? -> 2s Guard Screen
 * Missing first_name? -> EnterFirstNameScreen -> 2s Guard Screen
 */
export const existingUserSubflow = defineFlow<AuthContext>({
  id: 'existing-user-subflow',
  name: 'Existing User Validation Flow',
  description:
    'Verifies profile completeness (prompting for first name if missing) followed by a 2-second security guard check.',
  initial: 'checkProfile',
  steps: {
    checkProfile: {
      type: 'action',
      title: 'Validate Profile Requirements',
      next: (context) => (context.firstName ? 'welcomeBackGuard' : 'enterFirstName'),
    },
    enterFirstName: {
      title: 'Add Missing First Name',
      component: EnterFirstNameScreen,
      next: 'welcomeBackGuard',
    },
    welcomeBackGuard: {
      title: 'Security & Requirements Guard (2s)',
      component: WelcomeBackGuardScreen,
      next: null, // Completes existing user subflow
    },
  },
});
