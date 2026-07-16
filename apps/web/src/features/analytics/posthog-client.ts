'use client';

import posthog from 'posthog-js';
import { env } from '@web/env';

let initialized = false;

export function initPostHog(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return;
  }

  if (initialized) {
    posthog.opt_in_capturing();
    return;
  }

  posthog.init(key, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  });

  initialized = true;
}

export function disablePostHog(): void {
  if (typeof window === 'undefined' || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  if (!initialized) {
    return;
  }

  posthog.opt_out_capturing();
}

export function getPostHogClient(): typeof posthog | null {
  if (!initialized || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  return posthog;
}

export function identifyPostHogUser(userId: string, traits?: Record<string, string>): void {
  const client = getPostHogClient();
  if (!client) {
    return;
  }

  client.identify(userId, traits);
}

export function resetPostHogUser(): void {
  const client = getPostHogClient();
  if (!client) {
    return;
  }

  client.reset();
}
