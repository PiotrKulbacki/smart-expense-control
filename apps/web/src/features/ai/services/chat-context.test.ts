import { describe, expect, it } from 'vitest';
import {
  aggregateFinancialContext,
  buildChatSystemPrompt,
} from '@web/features/ai/services/chat-context';

describe('chat-context', () => {
  it('aggregates category totals per currency', () => {
    const context = aggregateFinancialContext(
      '2026-07',
      [
        { amount: 45.5, currency: 'PLN', category: 'Groceries' },
        { amount: 12.3, currency: 'PLN', category: 'Groceries' },
        { amount: 20, currency: 'EUR', category: 'Restaurants' },
      ],
      []
    );

    expect(context.totalSpentThisCycle).toBe(77.8);
    expect(context.categoryTotals).toEqual(
      expect.arrayContaining([
        { category: 'Groceries', total: 57.8, currency: 'PLN' },
        { category: 'Restaurants', total: 20, currency: 'EUR' },
      ])
    );
  });

  it('maps recent transactions to ISO date strings', () => {
    const context = aggregateFinancialContext(
      '2026-07',
      [],
      [
        {
          amount: 15,
          currency: 'PLN',
          category: 'Coffee',
          description: 'Cafe',
          date: new Date('2026-07-05T10:00:00.000Z'),
        },
      ]
    );

    expect(context.recentTransactions).toEqual([
      {
        date: '2026-07-05',
        amount: 15,
        currency: 'PLN',
        category: 'Coffee',
        description: 'Cafe',
      },
    ]);
  });

  it('returns empty-state labels when user has no transactions', () => {
    const context = aggregateFinancialContext('2026-07', [], []);
    const prompt = buildChatSystemPrompt(context, 'pl', {
      todayIso: '2026-07-13',
      financialMonthStartDay: 12,
      cycleStartIso: '2026-07-12',
      cycleEndIso: '2026-08-12',
    });

    expect(context.totalSpentThisCycle).toBe(0);
    expect(context.categoryTotals).toEqual([]);
    expect(prompt).toContain('Always respond in Polish');
    expect(prompt).toContain('No transactions this month.');
    expect(prompt).toContain('No transactions on record.');
  });

  it('embeds category totals in the system prompt', () => {
    const context = aggregateFinancialContext(
      '2026-07',
      [{ amount: 30, currency: 'PLN', category: 'Groceries' }],
      []
    );
    const prompt = buildChatSystemPrompt(context, 'en', {
      todayIso: '2026-07-13',
      financialMonthStartDay: 12,
      cycleStartIso: '2026-07-12',
      cycleEndIso: '2026-08-12',
    });

    expect(prompt).toContain('"category": "Groceries"');
    expect(prompt).toContain('"total": 30');
    expect(prompt).toContain('Current cycle label: 2026-07');
  });
});
