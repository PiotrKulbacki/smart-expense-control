'use client';

import type { BillingCurrency, PaidPlanType } from '@shared/features/billing';
import {
  formatProSubscriptionPrice,
  getPlanPromoPrice,
  getPlanRegularPrice,
  PRO_PROMO_CODE,
  PRO_PROMO_DISCOUNT_PERCENT,
} from '@shared/features/billing/pricing';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type PlanPriceDisplayProps = {
  plan: PaidPlanType;
  currency: BillingCurrency;
  className?: string;
};

export function PlanPriceDisplay({ plan, currency, className }: PlanPriceDisplayProps) {
  const t = useT();
  const { locale } = useLocale();

  const regularAmount = getPlanRegularPrice(plan, currency);
  const promoAmount = getPlanPromoPrice(plan, currency);

  const formattedRegular = formatProSubscriptionPrice(regularAmount, currency, locale);
  const formattedPromo = formatProSubscriptionPrice(promoAmount, currency, locale);
  const pricingKey = plan === 'PREMIUM' ? 'landing.pricing.premium' : 'landing.pricing.pro';

  return (
    <div className={className}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-muted text-lg font-medium line-through">{formattedRegular}</span>
        <span className="chip chip-ready">
          {t(`${pricingKey}.discount`, { percent: PRO_PROMO_DISCOUNT_PERCENT })}
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
        {t(`${pricingKey}.promoCodeBadge`, {
          code: PRO_PROMO_CODE,
          percent: PRO_PROMO_DISCOUNT_PERCENT,
        })}
      </p>
    </div>
  );
}

/** @deprecated Prefer PlanPriceDisplay with plan="PRO" */
export function ProPriceDisplay({
  currency,
  className,
}: {
  currency: BillingCurrency;
  className?: string;
}) {
  return <PlanPriceDisplay plan="PRO" currency={currency} className={className} />;
}
