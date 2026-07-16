'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readConsentFromDocument, toPreferences, writeConsentToDocument } from './storage';
import {
  DEFAULT_ACCEPTED_PREFERENCES,
  DEFAULT_REJECTED_PREFERENCES,
  type CookieConsentDecision,
  type CookieConsentPreferences,
} from './types';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { CookiePreferencesModal } from './components/CookiePreferencesModal';

type CookieConsentContextValue = {
  /** True after client hydration from the stored cookie. */
  isReady: boolean;
  /** True when the user has already saved a consent decision. */
  hasDecided: boolean;
  /** Current preferences; defaults to necessary-only until a decision exists. */
  consent: CookieConsentPreferences;
  /** Full stored decision, or null if undecided. */
  decision: CookieConsentDecision | null;
  /** Convenience flags for gating optional scripts. */
  canUseAnalytics: boolean;
  canUseMarketing: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (preferences: Pick<CookieConsentPreferences, 'analytics' | 'marketing'>) => void;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [decision, setDecision] = useState<CookieConsentDecision | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    setDecision(readConsentFromDocument());
    setIsReady(true);
  }, []);

  const persist = useCallback((preferences: CookieConsentPreferences) => {
    const next = writeConsentToDocument(preferences);
    setDecision(next);
  }, []);

  const acceptAll = useCallback(() => {
    persist(DEFAULT_ACCEPTED_PREFERENCES);
    setIsPreferencesOpen(false);
  }, [persist]);

  const rejectOptional = useCallback(() => {
    persist(DEFAULT_REJECTED_PREFERENCES);
    setIsPreferencesOpen(false);
  }, [persist]);

  const savePreferences = useCallback(
    (preferences: Pick<CookieConsentPreferences, 'analytics' | 'marketing'>) => {
      persist({
        necessary: true,
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      });
      setIsPreferencesOpen(false);
    },
    [persist]
  );

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setIsPreferencesOpen(false), []);

  const consent = useMemo(
    (): CookieConsentPreferences =>
      decision ? toPreferences(decision) : DEFAULT_REJECTED_PREFERENCES,
    [decision]
  );

  const hasDecided = decision !== null;
  const canUseAnalytics = isReady && hasDecided && consent.analytics;
  const canUseMarketing = isReady && hasDecided && consent.marketing;

  const value = useMemo(
    (): CookieConsentContextValue => ({
      isReady,
      hasDecided,
      consent,
      decision,
      canUseAnalytics,
      canUseMarketing,
      acceptAll,
      rejectOptional,
      savePreferences,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
    }),
    [
      isReady,
      hasDecided,
      consent,
      decision,
      canUseAnalytics,
      canUseMarketing,
      acceptAll,
      rejectOptional,
      savePreferences,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
    ]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {isReady && !hasDecided && !isPreferencesOpen ? <CookieConsentBanner /> : null}
      <CookiePreferencesModal />
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}
