'use client';

import type { BillingCurrency } from '@shared/features/billing';
import {
  formatProSubscriptionPrice,
  getProPromoPrice,
  PRO_PROMO_CODE,
  PRO_PROMO_DISCOUNT_PERCENT,
  PRO_SUBSCRIPTION_PRICES,
} from '@shared/features/billing/pricing';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ProPriceDisplayProps = {
  currency: BillingCurrency;
  className?: string;
};

export function ProPriceDisplay({ currency, className }: ProPriceDisplayProps) {
  const t = useT();
  const { locale } = useLocale();

  const regularAmount = PRO_SUBSCRIPTION_PRICES.regular[currency];
  const promoAmount = getProPromoPrice(currency);

  const formattedRegular = formatProSubscriptionPrice(regularAmount, currency, locale);
  const formattedPromo = formatProSubscriptionPrice(promoAmount, currency, locale);

  return (
    <div className={className}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-muted text-lg font-medium line-through">{formattedRegular}</span>
        <span className="chip chip-ready">
          {t('landing.pricing.pro.discount', { percent: PRO_PROMO_DISCOUNT_PERCENT })}
        </span>
      </div>
      <p className="font-display text-3xl font-bold text-[var(--text)]">
        {formattedPromo}
        <span className="text-muted ml-1 text-base font-medium">
          {t('landing.pricing.perMonth')}
        </span>
      </p>
      <p className="text-warm border-warm/30 bg-warm/10 mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium">
        <span aria-hidden="true">🏷️</span>
        {t('landing.pricing.pro.promoCodeBadge', {
          code: PRO_PROMO_CODE,
          percent: PRO_PROMO_DISCOUNT_PERCENT,
        })}
      </p>
    </div>
  );
}
