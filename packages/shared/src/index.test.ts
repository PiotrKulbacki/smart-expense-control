import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './features/i18n';

describe('i18n', () => {
  it('defines supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'de', 'pl', 'es']);
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });
});
