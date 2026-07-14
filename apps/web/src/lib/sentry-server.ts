import * as Sentry from '@sentry/nextjs';

export function captureServerException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
