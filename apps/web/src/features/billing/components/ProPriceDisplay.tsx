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
          <span className="text-lg font-medium text-gray-500 line-through">{formattedRegular}</span>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
            {t('landing.pricing.pro.discount', { percent: discountPercent })}
          </span>
        </div>
      )}
      <p className="text-3xl font-bold text-gray-900">
        {formattedDisplay}
        <span className="ml-1 text-base font-medium text-gray-600">
          {t('landing.pricing.perMonth')}
        </span>
      </p>
    </div>
  );
}
