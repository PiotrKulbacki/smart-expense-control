'use client';

import type { BillingCurrency } from '@shared/features/billing';
import {
  FEATURE_FLAG_PRO_PROMO_PRICING,
  formatProSubscriptionPrice,
  getProDiscountPercent,
  PRO_SUBSCRIPTION_PRICES,
} from '@shared/features/billing/pricing';
import { useFeatureFlag } from '@web/features/analytics/components/PostHogProvider';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ProPriceDisplayProps = {
  currency: BillingCurrency;
  forcePromo?: boolean;
  className?: string;
};

export function ProPriceDisplay({ currency, forcePromo, className }: ProPriceDisplayProps) {
  const t = useT();
  const { locale } = useLocale();
  const isPromoFromFlag = useFeatureFlag(FEATURE_FLAG_PRO_PROMO_PRICING);
  const isPromoActive = forcePromo ?? isPromoFromFlag;

  const regularAmount = PRO_SUBSCRIPTION_PRICES.regular[currency];
  const promoAmount = PRO_SUBSCRIPTION_PRICES.promo[currency];
  const displayAmount = isPromoActive ? promoAmount : regularAmount;
  const discountPercent = getProDiscountPercent(currency);

  const formattedRegular = formatProSubscriptionPrice(regularAmount, currency, locale);
  const formattedDisplay = formatProSubscriptionPrice(displayAmount, currency, locale);

  return (
    <div className={className}>
      {isPromoActive && (
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-muted text-lg font-medium line-through">{formattedRegular}</span>
          <span className="chip chip-ready">
            {t('landing.pricing.pro.discount', { percent: discountPercent })}
          </span>
        </div>
      )}
      <p className="font-display text-3xl font-bold text-[var(--text)]">
        {formattedDisplay}
        <span className="text-muted ml-1 text-base font-medium">
          {t('landing.pricing.perMonth')}
        </span>
      </p>
    </div>
  );
}
