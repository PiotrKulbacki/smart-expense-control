import { describe, expect, it } from 'vitest';
import { BILLING_CURRENCIES } from './checkout';
import { getProPromoPrice, PRO_PROMO_DISCOUNT_PERCENT, PRO_SUBSCRIPTION_PRICES } from './pricing';

describe('PRO subscription pricing', () => {
  it('defines base prices for all billing currencies', () => {
    for (const currency of BILLING_CURRENCIES) {
      expect(PRO_SUBSCRIPTION_PRICES.regular[currency]).toBeGreaterThan(0);
    }
  });

  it('calculates 50% promo prices from base prices', () => {
    expect(getProPromoPrice('EUR')).toBe(4);
    expect(getProPromoPrice('PLN')).toBe(17);
    expect(getProPromoPrice('GBP')).toBe(3.25);
    expect(getProPromoPrice('USD')).toBe(4.5);
    expect(PRO_PROMO_DISCOUNT_PERCENT).toBe(50);
  });
});
