export interface MockUser {
  email: string;
  password?: string;
  firstName?: string;
  isExisting: boolean;
}

export const MOCK_USERS: Record<string, MockUser> = {
  'jane@example.com': {
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    isExisting: true,
  },
  'noname@example.com': {
    email: 'noname@example.com',
    password: 'password123',
    firstName: '',
    isExisting: true,
  },
};

export const MOCK_OTP_CODE = '123456';

export function findMockUser(email: string): MockUser | undefined {
  const normalized = email.trim().toLowerCase();
  return MOCK_USERS[normalized];
}
