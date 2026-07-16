import { describe, expect, it } from 'vitest';
import { BILLING_CURRENCIES } from './checkout';
import {
  getPlanPromoPrice,
  getProPromoPrice,
  PREMIUM_SUBSCRIPTION_PRICES,
  PRO_PROMO_DISCOUNT_PERCENT,
  PRO_SUBSCRIPTION_PRICES,
} from './pricing';

describe('subscription pricing', () => {
  it('defines base prices for all billing currencies', () => {
    for (const currency of BILLING_CURRENCIES) {
      expect(PRO_SUBSCRIPTION_PRICES.regular[currency]).toBeGreaterThan(0);
      expect(PREMIUM_SUBSCRIPTION_PRICES.regular[currency]).toBeGreaterThan(0);
    }
  });

  it('calculates 50% promo prices from base PRO prices', () => {
    expect(getProPromoPrice('EUR')).toBe(4);
    expect(getProPromoPrice('PLN')).toBe(17);
    expect(getProPromoPrice('GBP')).toBe(3.25);
    expect(getProPromoPrice('USD')).toBe(4.5);
    expect(PRO_PROMO_DISCOUNT_PERCENT).toBe(50);
  });

  it('calculates 50% promo prices for Premium', () => {
    expect(getPlanPromoPrice('PREMIUM', 'EUR')).toBe(5.5);
    expect(getPlanPromoPrice('PREMIUM', 'PLN')).toBe(23);
    expect(getPlanPromoPrice('PREMIUM', 'GBP')).toBe(4.25);
    expect(getPlanPromoPrice('PREMIUM', 'USD')).toBe(6);
  });
});
