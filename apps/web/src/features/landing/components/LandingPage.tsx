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
    <div className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-600">
            {t('landing.hero.eyebrow')}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">{t('landing.hero.subtitle')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={registerHref}
              className="w-full rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              {t('landing.hero.ctaPrimary')}
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-gray-300 px-6 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              {t('landing.hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-gray-200 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {t('landing.features.title')}
            </h2>
            <p className="mt-4 text-gray-600">{t('landing.features.subtitle')}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {t('landing.pricing.title')}
            </h2>
            <p className="mt-4 text-gray-600">{t('landing.pricing.subtitle')}</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-gray-700">
                {t('billing.labels.paymentCurrency')}
              </p>
              <BillingCurrencySwitcher value={billingCurrency} onChange={setBillingCurrency} />
            </div>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-gray-200 p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">FREE</p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900">
                {t(FREE_PRICE_KEYS[billingCurrency])}
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {freeFeatures.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link
                href={registerHref}
                className="mt-8 inline-flex rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {t('landing.pricing.free.cta')}
              </Link>
            </article>

            <article className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">PRO</p>
              <ProPriceDisplay currency={billingCurrency} className="mt-2" />
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {proFeatures.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link
                href={registerHref}
                className="mt-8 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {t('landing.pricing.pro.cta')}
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">{t('landing.cta.title')}</h2>
          <p className="mt-4 text-gray-300">{t('landing.cta.subtitle')}</p>
          <Link
            href={registerHref}
            className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
          >
            {t('landing.cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}
