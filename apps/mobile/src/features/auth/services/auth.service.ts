import Toast from 'react-native-toast-message';
import { DEFAULT_LOCALE, translateError, t } from '@shared/features/i18n';
import { env } from '@mobile/env';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@mobile/features/auth/lib/token-storage';

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  createdAt: string;
  hasPassword: boolean;
};

type AuthResponse = {
  user: SafeUser;
  accessToken?: string;
  refreshToken?: string;
};

type ErrorResponse = {
  error?: string;
};

const locale = DEFAULT_LOCALE;

function showError(code: string) {
  Toast.show({
    type: 'error',
    text1: translateError(code, locale),
  });
}

function showSuccess(key: string) {
  Toast.show({
    type: 'success',
    text1: t(key, locale),
  });
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-platform': 'mobile',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = (await response.json()) as T & ErrorResponse;

    if (!response.ok) {
      return {
        error: data.error ?? 'auth.errors.generic',
        status: response.status,
        data,
      };
    }

    return { data, status: response.status };
  } catch {
    return { error: 'auth.errors.networkError', status: 0 };
  }
}

export type RegisterResult = {
  user?: SafeUser;
  requiresEmailVerification?: boolean;
  email?: string;
};

export async function registerUser(payload: {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
  acceptedLegal: boolean;
}): Promise<RegisterResult | null> {
  const result = await apiRequest<
    AuthResponse & { requiresEmailVerification?: boolean; email?: string }
  >('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    showError(result.error);
    return null;
  }

  showSuccess('auth.success.register');

  if (result.data?.requiresEmailVerification) {
    return {
      requiresEmailVerification: true,
      email: result.data.email ?? payload.email,
    };
  }

  if (result.data?.accessToken && result.data.refreshToken) {
    await saveTokens(result.data.accessToken, result.data.refreshToken);
  }

  return { user: result.data?.user };
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<boolean> {
  const result = await apiRequest<{ ok?: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    showError(result.error);
    return false;
  }

  showSuccess('auth.success.passwordChanged');
  return true;
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  const result = await apiRequest<{ ok?: boolean }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (result.error) {
    showError(result.error);
    return false;
  }

  showSuccess('auth.forgot.success');
  return true;
}

export async function resetPassword(payload: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<boolean> {
  const result = await apiRequest<{ ok?: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    showError(result.error);
    return false;
  }

  showSuccess('auth.reset.success');
  return true;
}

export type LoginResult =
  { ok: true; user: SafeUser } | { ok: false; emailNotVerified?: boolean; email?: string };

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const result = await apiRequest<AuthResponse & { email?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    if (result.error === 'auth.errors.emailNotVerified') {
      showError(result.error);
      return {
        ok: false,
        emailNotVerified: true,
        email: result.data?.email ?? payload.email,
      };
    }
    showError(result.error);
    return { ok: false };
  }

  if (result.data?.accessToken && result.data.refreshToken) {
    await saveTokens(result.data.accessToken, result.data.refreshToken);
  }

  showSuccess('auth.success.login');
  if (!result.data?.user) {
    return { ok: false };
  }
  return { ok: true, user: result.data.user };
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const result = await apiRequest<{ ok?: boolean }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  if (result.error) {
    showError(result.error);
    return false;
  }

  showSuccess('auth.verify.success');
  return true;
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  const result = await apiRequest<{ ok?: boolean }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (result.error) {
    showError(result.error);
    return false;
  }

  showSuccess('auth.verify.resent');
  return true;
}

export async function logoutUser(): Promise<void> {
  const refreshToken = await getRefreshToken();

  await apiRequest('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  await clearTokens();
  showSuccess('auth.success.logout');
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const result = await apiRequest<{ user: SafeUser }>('/api/auth/me');

  if (result.status === 401) {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const refreshResult = await apiRequest<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshResult.error || !refreshResult.data?.accessToken) {
      await clearTokens();
      showError(refreshResult.error ?? 'auth.errors.sessionExpired');
      return null;
    }

    await saveTokens(
      refreshResult.data.accessToken,
      refreshResult.data.refreshToken ?? refreshToken
    );

    return refreshResult.data.user;
  }

  if (result.error) {
    showError(result.error);
    return null;
  }

  return result.data?.user ?? null;
}

export { showError, showSuccess };
