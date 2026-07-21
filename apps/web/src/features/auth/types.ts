import type { User } from '@lyamo/database';

export type SafeUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'name'
  | 'avatarUrl'
  | 'currentPlan'
  | 'primaryCurrency'
  | 'financialMonthStartDay'
  | 'defaultMonthlyBudget'
  | 'currentMonthBudget'
  | 'stripeCustomerId'
  | 'createdAt'
> & {
  hasPassword: boolean;
};

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    currentPlan: user.currentPlan,
    primaryCurrency: user.primaryCurrency,
    financialMonthStartDay: user.financialMonthStartDay,
    defaultMonthlyBudget: user.defaultMonthlyBudget,
    currentMonthBudget: user.currentMonthBudget,
    stripeCustomerId: user.stripeCustomerId,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash),
  };
}

export type AuthResponse = {
  user: SafeUser;
  accessToken?: string;
  refreshToken?: string;
};

export type AuthErrorResponse = {
  error: string;
};

export const AUTH_COOKIE_NAME = 'sec_session';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
