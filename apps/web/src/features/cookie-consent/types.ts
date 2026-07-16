export type CookieConsentPreferences = {
  /** Always true — session, auth, locale, core app. */
  necessary: true;
  /** Optional — PostHog, product analytics. */
  analytics: boolean;
  /** Optional — marketing pixels, non-essential payment widgets. */
  marketing: boolean;
};

export type CookieConsentDecision = CookieConsentPreferences & {
  /** ISO timestamp of the decision. */
  decidedAt: string;
  /** Consent schema version for future migrations. */
  version: number;
};

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_COOKIE_NAME = 'sec_cookie_consent';
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const DEFAULT_REJECTED_PREFERENCES: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const DEFAULT_ACCEPTED_PREFERENCES: CookieConsentPreferences = {
  necessary: true,
  analytics: true,
  marketing: true,
};
