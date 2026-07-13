'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BillingCurrency } from '@shared/features/billing';
import {
  BillingCurrencySwitcher,
  readStoredBillingCurrency,
} from '@web/features/billing/components/BillingCurrencySwitcher';
import { ProPriceDisplay } from '@web/features/billing/components/ProPriceDisplay';
import { useT } from '@web/features/i18n/LocaleProvider';

const FREE_PRICE_KEYS: Record<BillingCurrency, string> = {
  PLN: 'landing.pricing.free.pricePln',
  EUR: 'landing.pricing.free.priceEur',
  GBP: 'landing.pricing.free.priceGbp',
};

export function LandingPage() {
  const t = useT();
  const [billingCurrency, setBillingCurrency] = useState<BillingCurrency>('PLN');

  useEffect(() => {
    setBillingCurrency(readStoredBillingCurrency() ?? 'PLN');
  }, []);

  const features = [
    {
      title: t('landing.features.scanner.title'),
      description: t('landing.features.scanner.description'),
    },
    {
      title: t('landing.features.chat.title'),
      description: t('landing.features.chat.description'),
    },
    {
      title: t('landing.features.currency.title'),
      description: t('landing.features.currency.description'),
    },
  ];

  const freeFeatures = [
    t('landing.pricing.free.feature1'),
    t('landing.pricing.free.feature2'),
    t('landing.pricing.free.feature3'),
  ];

  const proFeatures = [
    t('landing.pricing.pro.feature1'),
    t('landing.pricing.pro.feature2'),
    t('landing.pricing.pro.feature3'),
  ];

  const registerHref = `/register?currency=${billingCurrency}`;

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-warm mb-4 font-mono text-xs uppercase tracking-[0.25em]">
            {t('landing.hero.eyebrow')}
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
            {t('landing.hero.title')}
          </h1>
          <p className="text-muted mt-6 text-lg leading-8">{t('landing.hero.subtitle')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={registerHref} className="btn-primary w-full sm:w-auto">
              {t('landing.hero.ctaPrimary')}
            </Link>
            <Link href="/login" className="btn-ghost w-full sm:w-auto">
              {t('landing.hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[var(--border)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
              {t('landing.features.title')}
            </h2>
            <p className="text-muted mt-4">{t('landing.features.subtitle')}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="panel relative z-10 p-6">
                <h3 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
                  {feature.title}
                </h3>
                <p className="text-muted relative z-10 mt-3 text-sm leading-6">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-muted mt-4">{t('landing.pricing.subtitle')}</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-muted text-sm font-medium">
                {t('billing.labels.paymentCurrency')}
              </p>
              <BillingCurrencySwitcher value={billingCurrency} onChange={setBillingCurrency} />
            </div>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="panel relative z-10 p-8">
              <p className="text-muted relative z-10 font-mono text-xs uppercase tracking-widest">
                FREE
              </p>
              <h3 className="font-display relative z-10 mt-2 text-3xl font-bold text-[var(--text)]">
                {t(FREE_PRICE_KEYS[billingCurrency])}
              </h3>
              <ul className="text-muted relative z-10 mt-6 space-y-3 text-sm">
                {freeFeatures.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link href={registerHref} className="btn-ghost relative z-10 mt-8 inline-flex">
                {t('landing.pricing.free.cta')}
              </Link>
            </article>

            <article className="panel border-warm/30 relative z-10 p-8">
              <p className="text-warm relative z-10 font-mono text-xs uppercase tracking-widest">
                PRO
              </p>
              <ProPriceDisplay currency={billingCurrency} className="relative z-10 mt-2" />
              <ul className="relative z-10 mt-6 space-y-3 text-sm text-[var(--text)]">
                {proFeatures.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link href={registerHref} className="btn-primary relative z-10 mt-8 inline-flex">
                {t('landing.pricing.pro.cta')}
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold text-[var(--text)]">
            {t('landing.cta.title')}
          </h2>
          <p className="text-muted mt-4">{t('landing.cta.subtitle')}</p>
          <Link href={registerHref} className="btn-primary mt-8 inline-flex">
            {t('landing.cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}
