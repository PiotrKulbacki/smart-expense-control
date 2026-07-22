import { describe, expect, it } from 'vitest';
import { formatDateRangeLabel } from '@web/features/transactions/lib/format-date-range-label';

describe('formatDateRangeLabel', () => {
  it('formats a single day', () => {
    const label = formatDateRangeLabel(
      {
        from: new Date(2026, 6, 1),
        to: new Date(2026, 6, 1),
      },
      'pl'
    );

    expect(label).toMatch(/1/);
    expect(label).toMatch(/lip/i);
    expect(label).not.toContain('–');
  });

  it('formats a date range', () => {
    const label = formatDateRangeLabel(
      {
        from: new Date(2026, 6, 1),
        to: new Date(2026, 6, 21),
      },
      'pl'
    );

    expect(label).toContain('–');
    expect(label).toMatch(/1/);
    expect(label).toMatch(/21/);
  });

  it('returns null without a start date', () => {
    expect(formatDateRangeLabel(undefined, 'pl')).toBeNull();
    expect(formatDateRangeLabel({ from: undefined }, 'pl')).toBeNull();
  });
});
