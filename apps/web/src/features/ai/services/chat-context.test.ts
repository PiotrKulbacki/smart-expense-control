import { describe, expect, it } from 'vitest';
import {
  aggregateFinancialContext,
  buildChatSystemPrompt,
  resolveActiveMonthlyBudget,
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
          category: 'CoffeeShop',
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
        category: 'CoffeeShop',
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
      cycleEndIso: '2026-08-11',
      daysRemainingInCycle: 29,
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
      cycleEndIso: '2026-08-11',
      daysRemainingInCycle: 29,
    });

    expect(prompt).toContain('"category": "Groceries"');
    expect(prompt).toContain('"total": 30');
    expect(prompt).toContain('Current cycle label: 2026-07');
  });

  describe('resolveActiveMonthlyBudget', () => {
    it('prefers currentMonthBudget override over defaultMonthlyBudget', () => {
      const budget = resolveActiveMonthlyBudget({
        currentMonthBudget: 2500,
        defaultMonthlyBudget: 3000,
        primaryCurrency: 'EUR',
      });

      expect(budget).toEqual({
        amount: 2500,
        currency: 'EUR',
        source: 'current_override',
      });
    });

    it('falls back to defaultMonthlyBudget when currentMonthBudget is unset', () => {
      const budget = resolveActiveMonthlyBudget({
        currentMonthBudget: null,
        defaultMonthlyBudget: 3000,
        primaryCurrency: 'PLN',
      });

      expect(budget).toEqual({
        amount: 3000,
        currency: 'PLN',
        source: 'default',
      });
    });

    it('returns null when no valid budget is configured', () => {
      expect(
        resolveActiveMonthlyBudget({
          currentMonthBudget: null,
          defaultMonthlyBudget: null,
          primaryCurrency: 'EUR',
        })
      ).toBeNull();
    });
  });

  it('embeds active monthly budget override in the system prompt', () => {
    const context = aggregateFinancialContext('2026-07', [], []);
    const prompt = buildChatSystemPrompt(
      context,
      'pl',
      {
        todayIso: '2026-07-13',
        financialMonthStartDay: 12,
        cycleStartIso: '2026-07-12',
        cycleEndIso: '2026-08-11',
        daysRemainingInCycle: 29,
      },
      {
        amount: 2500,
        currency: 'EUR',
        source: 'current_override',
      }
    );

    expect(prompt).toContain(
      "User's active monthly budget for the current billing cycle: 2500 EUR."
    );
    expect(prompt).toContain('takes priority over general default settings');
  });

  it('reflects updated dashboard override instead of stale default in prompt', () => {
    const context = aggregateFinancialContext(
      '2026-07',
      [{ amount: 500, currency: 'EUR', category: 'Groceries' }],
      []
    );

    const afterDashboardEdit = buildChatSystemPrompt(
      context,
      'pl',
      {
        todayIso: '2026-07-14',
        financialMonthStartDay: 1,
        cycleStartIso: '2026-07-01',
        cycleEndIso: '2026-07-31',
        daysRemainingInCycle: 17,
      },
      resolveActiveMonthlyBudget({
        currentMonthBudget: 1800,
        defaultMonthlyBudget: 3000,
        primaryCurrency: 'EUR',
      })
    );

    expect(afterDashboardEdit).toContain('1800 EUR');
    expect(afterDashboardEdit).not.toContain('3000 EUR');
    expect(afterDashboardEdit).toContain('takes priority over general default settings');
  });

  it('embeds daysRemainingInCycle and forbids fixed 30/31-day assumptions', () => {
    const context = aggregateFinancialContext('2026-07-12 to 2026-08-11', [], []);
    const prompt = buildChatSystemPrompt(context, 'pl', {
      todayIso: '2026-07-14',
      financialMonthStartDay: 12,
      cycleStartIso: '2026-07-12',
      cycleEndIso: '2026-08-11',
      daysRemainingInCycle: 28,
    });

    expect(prompt).toContain('Days remaining until the end of the current billing cycle: 28.');
    expect(prompt).toContain('Do NOT use fixed values such as 30 or 31 days');
  });

  it('warns AI not to divide by zero on the last cycle day', () => {
    const context = aggregateFinancialContext('2026-07-12 to 2026-08-11', [], []);
    const prompt = buildChatSystemPrompt(context, 'pl', {
      todayIso: '2026-08-11',
      financialMonthStartDay: 12,
      cycleStartIso: '2026-07-12',
      cycleEndIso: '2026-08-11',
      daysRemainingInCycle: 0,
    });

    expect(prompt).toContain('Days remaining until the end of the current billing cycle: 0.');
    expect(prompt).toContain('do not divide by zero');
    expect(prompt).toContain('last day of the billing cycle');
  });
});
