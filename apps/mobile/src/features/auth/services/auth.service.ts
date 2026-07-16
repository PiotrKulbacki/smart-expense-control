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
      return { error: data.error ?? 'auth.errors.generic', status: response.status };
    }

    return { data, status: response.status };
  } catch {
    return { error: 'auth.errors.networkError', status: 0 };
  }
}

export async function registerUser(payload: {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
}): Promise<SafeUser | null> {
  const result = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    showError(result.error);
    return null;
  }

  if (result.data?.accessToken && result.data.refreshToken) {
    await saveTokens(result.data.accessToken, result.data.refreshToken);
  }

  showSuccess('auth.success.register');
  return result.data?.user ?? null;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<SafeUser | null> {
  const result = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    showError(result.error);
    return null;
  }

  if (result.data?.accessToken && result.data.refreshToken) {
    await saveTokens(result.data.accessToken, result.data.refreshToken);
  }

  showSuccess('auth.success.login');
  return result.data?.user ?? null;
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
