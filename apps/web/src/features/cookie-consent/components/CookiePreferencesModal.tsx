'use client';

import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@web/features/i18n/LocaleProvider';
import { useCookieConsent } from '../CookieConsentProvider';
import { CookieToggle } from './CookieToggle';

type CategoryRowProps = {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  badge?: string;
  onCheckedChange: (checked: boolean) => void;
};

function CategoryRow({
  id,
  title,
  description,
  checked,
  disabled = false,
  badge,
  onCheckedChange,
}: CategoryRowProps) {
  return (
    <div className="bg-elevated/40 flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={id} className="font-display text-sm font-medium text-[var(--text)]">
            {title}
          </label>
          {badge ? (
            <span className="chip chip-ready py-0.5 text-[10px] uppercase tracking-wider">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-muted text-xs leading-relaxed">{description}</p>
      </div>
      <CookieToggle
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        label={title}
      />
    </div>
  );
}

export function CookiePreferencesModal() {
  const t = useT();
  const {
    consent,
    isPreferencesOpen,
    closePreferences,
    openPreferences,
    savePreferences,
    acceptAll,
    rejectOptional,
  } = useCookieConsent();

  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);

  useEffect(() => {
    if (isPreferencesOpen) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
  }, [consent.analytics, consent.marketing, isPreferencesOpen]);

  return (
    <DialogPrimitive.Root
      open={isPreferencesOpen}
      onOpenChange={(open) => {
        if (open) {
          openPreferences();
        } else {
          closePreferences();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-void/80 fixed inset-0 z-[70] backdrop-blur-sm" />
        <DialogPrimitive.Content className="panel data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-[70] flex max-h-[min(90vh,640px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden duration-200">
          <div className="relative z-10 flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div className="space-y-1 pr-8">
              <DialogPrimitive.Title className="font-display text-lg font-semibold text-[var(--text)]">
                {t('cookies.preferences.title')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted text-sm">
                {t('cookies.preferences.description')}
              </DialogPrimitive.Description>
              <div className="text-muted text-xs">
                <Link href="/privacy" className="hover:text-warm underline">
                  {t('layout.footer.privacy')}
                </Link>
              </div>
            </div>
            <DialogPrimitive.Close className="text-muted hover:bg-elevated focus-visible:ring-warm/30 absolute right-4 top-4 rounded-lg p-1 transition hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2">
              <X className="h-5 w-5" />
              <span className="sr-only">{t('cookies.preferences.close')}</span>
            </DialogPrimitive.Close>
          </div>

          <div className="relative z-10 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            <CategoryRow
              id="cookie-necessary"
              title={t('cookies.categories.necessary.title')}
              description={t('cookies.categories.necessary.description')}
              checked
              disabled
              badge={t('cookies.categories.necessary.badge')}
              onCheckedChange={() => undefined}
            />
            <CategoryRow
              id="cookie-analytics"
              title={t('cookies.categories.analytics.title')}
              description={t('cookies.categories.analytics.description')}
              checked={analytics}
              onCheckedChange={setAnalytics}
            />
            <CategoryRow
              id="cookie-marketing"
              title={t('cookies.categories.marketing.title')}
              description={t('cookies.categories.marketing.description')}
              checked={marketing}
              onCheckedChange={setMarketing}
            />
          </div>

          <div className="relative z-10 flex flex-col-reverse gap-2 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={rejectOptional} className="btn-ghost w-full sm:w-auto">
              {t('cookies.preferences.rejectOptional')}
            </button>
            <button type="button" onClick={acceptAll} className="btn-ghost w-full sm:w-auto">
              {t('cookies.preferences.acceptAll')}
            </button>
            <button
              type="button"
              onClick={() => savePreferences({ analytics, marketing })}
              className="btn-primary w-full sm:w-auto"
            >
              {t('cookies.preferences.save')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
