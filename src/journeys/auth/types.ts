export interface AuthContext {
  authMethod?: 'password' | 'otp';
  email: string;
  password?: string;
  otpCode?: string;
  firstName?: string;
  lastName?: string;
  isExistingUser?: boolean;
  registrationConfirmed?: boolean;
  tier?: 'free' | 'pro';
  upgradedAtRegistration?: boolean;
  selectedPlan?: 'annual' | 'monthly';
  // Legacy fields for backwards compatibility
  isReturningUser?: boolean;
  username?: string;
}

