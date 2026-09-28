import { defineFlow } from '@/flows';
import type { AuthContext } from '../types';
import { authControlFlow, initialAuthContext } from '../control';
import { registrationWithUpgradeSubflow } from '../subflows/registration-with-upgrade';

/**
 * Variant: Auth with Upgrade Sheet
 * Overrides the control flow by spreading it, swapping the registration subflow,
 * and initializing tier context.
 */
export const authWithUpgradeSheetFlow = defineFlow<AuthContext>({
  ...authControlFlow,
  id: 'auth-with-upgrade-sheet',
  name: 'Auth with Upgrade Sheet (Split Test)',
  description:
    'Variant of classic auth journey where new user registrations traverse the upgrade upsell bottom sheet subflow.',
  initialContext: {
    ...initialAuthContext,
    tier: 'free',
  },
  steps: {
    ...authControlFlow.steps,
    registration: {
      type: 'subflow',
      title: 'Registration with Upgrade Sheet',
      subflow: registrationWithUpgradeSubflow,
      onComplete: () => 'authenticatedHome',
    },
  },
});
