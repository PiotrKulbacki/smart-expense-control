import type { SafeUser } from '@web/features/auth/types';
import {
  getUserFromBearerToken,
  getUserFromSession,
} from '@web/features/auth/services/auth.service';

export async function getAuthenticatedUser(request: Request): Promise<SafeUser | null> {
  const bearerUser = await getUserFromBearerToken(request.headers.get('authorization'));
  if (bearerUser) {
    return bearerUser;
  }

  return getUserFromSession();
}

export function requireAuth(user: SafeUser | null): asserts user is SafeUser {
  if (!user) {
    throw new AuthRequiredError();
  }
}

export class AuthRequiredError extends Error {
  readonly code = 'auth.errors.unauthorized';

  constructor() {
    super('auth.errors.unauthorized');
  }
}
