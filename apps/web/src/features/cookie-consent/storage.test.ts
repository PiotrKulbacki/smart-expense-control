import { describe, expect, it } from 'vitest';
import { parseConsentCookie } from './storage';

describe('parseConsentCookie', () => {
  it('returns null for empty input', () => {
    expect(parseConsentCookie(null)).toBeNull();
    expect(parseConsentCookie('')).toBeNull();
  });

  it('parses a valid encoded decision', () => {
    const payload = {
      necessary: true,
      analytics: true,
      marketing: false,
      decidedAt: '2026-07-16T12:00:00.000Z',
      version: 1,
    };

    const result = parseConsentCookie(encodeURIComponent(JSON.stringify(payload)));
    expect(result).toEqual(payload);
  });

  it('rejects invalid payloads', () => {
    expect(parseConsentCookie(encodeURIComponent(JSON.stringify({ analytics: true })))).toBeNull();
    expect(
      parseConsentCookie(
        encodeURIComponent(
          JSON.stringify({
            necessary: false,
            analytics: true,
            marketing: false,
            decidedAt: '2026-07-16T12:00:00.000Z',
            version: 1,
          })
        )
      )
    ).toBeNull();
  });
});
