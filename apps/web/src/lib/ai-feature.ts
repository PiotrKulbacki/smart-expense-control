import { env } from '@web/env';

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return defaultValue;
}

export function isAiEnabledOnServer(): boolean {
  return parseBooleanEnv(env.ENABLE_AI, true);
}

export function isAiEnabledOnClient(): boolean {
  return parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_AI, true);
}
