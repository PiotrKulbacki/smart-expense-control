import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  COOKIE_CONSENT_VERSION,
  type CookieConsentDecision,
  type CookieConsentPreferences,
} from './types';

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function parseConsentCookie(raw: string | undefined | null): CookieConsentDecision | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed: unknown = JSON.parse(decoded);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
      record.necessary !== true ||
      !isBoolean(record.analytics) ||
      !isBoolean(record.marketing) ||
      typeof record.decidedAt !== 'string' ||
      typeof record.version !== 'number'
    ) {
      return null;
    }

    return {
      necessary: true,
      analytics: record.analytics,
      marketing: record.marketing,
      decidedAt: record.decidedAt,
      version: record.version,
    };
  } catch {
    return null;
  }
}

export function readConsentFromDocument(): CookieConsentDecision | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_CONSENT_COOKIE_NAME}=([^;]*)`));
  return parseConsentCookie(match?.[1] ?? null);
}

export function writeConsentToDocument(
  preferences: CookieConsentPreferences
): CookieConsentDecision {
  const decision: CookieConsentDecision = {
    necessary: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };

  if (typeof document !== 'undefined') {
    const value = encodeURIComponent(JSON.stringify(decision));
    document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${value};path=/;max-age=${COOKIE_CONSENT_MAX_AGE_SECONDS};samesite=lax`;
  }

  return decision;
}

export function toPreferences(decision: CookieConsentDecision): CookieConsentPreferences {
  return {
    necessary: true,
    analytics: decision.analytics,
    marketing: decision.marketing,
  };
}
