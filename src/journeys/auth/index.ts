import { defineJourney } from '@/flows';
import type { AuthContext } from './types';
import { authControlFlow } from './control';
import { authWithUpgradeSheetFlow } from './variants/with-upgrade-sheet';

/**
 * Main Journey: Classic Authentication Journey
 */
export const authJourney = defineJourney<AuthContext>({
  id: 'auth',
  name: 'Classic Authentication Journey',
  description:
    'Multi-channel authentication orchestrator featuring Password vs Email-OTP subflows, registration, profile completion, and automated security guard validation.',
  defaultVariant: 'control',
  variants: {
    control: authControlFlow,
    'auth-with-upgrade-sheet': authWithUpgradeSheetFlow,
  },
});

export default authControlFlow;
export { authControlFlow, authWithUpgradeSheetFlow };
