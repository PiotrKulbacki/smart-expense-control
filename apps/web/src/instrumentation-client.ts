import * as Sentry from '@sentry/nextjs';
import { readConsentFromDocument } from '@web/features/cookie-consent/storage';

const isSentryAllowed = (() => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return false;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const consent = readConsentFromDocument();
  return Boolean(consent?.analytics);
})();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  enabled: isSentryAllowed,
  environment: process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
