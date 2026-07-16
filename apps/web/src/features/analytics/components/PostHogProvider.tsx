'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCookieConsent } from '@web/features/cookie-consent';
import {
  initPostHog,
  getPostHogClient,
  disablePostHog,
} from '@web/features/analytics/posthog-client';

type FeatureFlagsContextValue = {
  isReady: boolean;
  isFeatureEnabled: (flagKey: string) => boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  isReady: false,
  isFeatureEnabled: () => false,
});

export function useFeatureFlag(flagKey: string): boolean {
  const { isFeatureEnabled } = useContext(FeatureFlagsContext);
  return isFeatureEnabled(flagKey);
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const { canUseAnalytics, isReady: consentReady } = useCookieConsent();
  const [isReady, setIsReady] = useState(false);
  const [flagsVersion, setFlagsVersion] = useState(0);

  useEffect(() => {
    if (!consentReady) {
      return;
    }

    if (!canUseAnalytics) {
      disablePostHog();
      setIsReady(true);
      return;
    }

    initPostHog();
    const client = getPostHogClient();

    if (!client) {
      setIsReady(true);
      return;
    }

    client.onFeatureFlags(() => {
      setFlagsVersion((version) => version + 1);
      setIsReady(true);
    });

    const timeout = setTimeout(() => setIsReady(true), 3000);
    return () => clearTimeout(timeout);
  }, [canUseAnalytics, consentReady]);

  const contextValue = useMemo(
    (): FeatureFlagsContextValue => ({
      isReady,
      isFeatureEnabled: (flagKey: string): boolean => {
        void flagsVersion;
        if (!canUseAnalytics) {
          return false;
        }
        const client = getPostHogClient();
        return client?.isFeatureEnabled(flagKey) ?? false;
      },
    }),
    [isReady, flagsVersion, canUseAnalytics]
  );

  return (
    <FeatureFlagsContext.Provider value={contextValue}>{children}</FeatureFlagsContext.Provider>
  );
}
