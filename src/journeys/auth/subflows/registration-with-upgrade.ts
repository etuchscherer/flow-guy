import { defineFlow } from '@/flows';
import type { AuthContext } from '../types';
import { EnterNameScreen } from '../screens/EnterNameScreen';
import { UpdateEmailScreen } from '../screens/UpdateEmailScreen';
import { UpgradeSheetScreen } from '../screens/UpgradeSheetScreen';


/**
 * Subflow: Alternate Registration Subflow (with Upgrade Sheet)
 * Enter Name -> Confirm/Update Email -> Upgrade Bottom Sheet -> Finish
 */
export const registrationWithUpgradeSubflow = defineFlow<AuthContext>({
  id: 'registration-with-upgrade-subflow',
  name: 'Registration with Upgrade Sheet Subflow',
  description:
    'Three-step registration flow: name input, email confirmation, and upgrade upsell sheet.',
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
      next: 'upgradeSheet',
    },
    upgradeSheet: {
      title: 'Upgrade Sheet (Upsell)',
      component: UpgradeSheetScreen,
      next: null, // Completes registration subflow
    },
  },
});
