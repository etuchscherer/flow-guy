import { defineFlow } from '@/flows';
import type { AuthContext } from '../types';
import { EnterNameScreen } from '../screens/EnterNameScreen';
import { UpdateEmailScreen } from '../screens/UpdateEmailScreen';


/**
 * Subflow: User Registration Subflow (Control)
 * Enter Name -> Confirm/Update Email -> Finish
 */
export const registrationSubflow = defineFlow<AuthContext>({
  id: 'registration-subflow',
  name: 'User Registration Subflow',
  description: 'Two-step registration flow: name input and email confirmation.',
  initial: 'enterName',
  steps: {
    enterName: {
      title: 'Enter Full Name',
      component: EnterNameScreen,
      next: 'updateEmail',
    },
    updateEmail: {
      title: 'Confirm / Update Email',
      component: UpdateEmailScreen,
      next: null, // Completes registration subflow
    },
  },
});
