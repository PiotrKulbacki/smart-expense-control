import { prisma } from '@smart-expense-control/database';
import { getQuotaPeriodEnd, getQuotaPeriodStart } from '@shared/features/billing/financial-month';
import {
  INSIGHT_ERROR_CODES,
  insightSchema,
  type AiInsightContent,
} from '@shared/features/ai/schemas';
import type { Locale } from '@shared/features/i18n';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { env } from '@web/env';
import { computeNoSpendDays } from '@web/features/dashboard/lib/no-spend-days';
import { getOrRefreshPeriodAggregation } from '@web/features/analytics/services/period-aggregation-cache.service';
import { captureServerException } from '@web/lib/sentry-server';
import { getCategoryLimitProgressForUser } from '@web/features/settings/services/category-limits.service';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_TRANSACTIONS_LIMIT = 10;

const LOCALE_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  de: 'German',
  pl: 'Polish',
  es: 'Spanish',
};

export type DashboardInsightResponse = {
  insight: AiInsightContent;
  cached: boolean;
  updatedAt: string;
};

function isCacheFresh(updatedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - updatedAt.getTime() < CACHE_TTL_MS;
}

function parseCachedContent(content: unknown): AiInsightContent | null {
  const parsed = insightSchema.safeParse(content);
  return parsed.success ? parsed.data : null;
}

function buildSystemPrompt(locale: Locale, serverNowIso: string): string {
  const language = LOCALE_LANGUAGE[locale];

  return `You are a concise personal finance assistant for Smart Expense Control.
Current server datetime (ISO): ${serverNowIso}
Use this datetime as your temporal anchor when interpreting "today", "this month", remaining days, and streaks.

Respond ONLY with a JSON object matching this schema:
{
  "type": "success" | "warning" | "anomaly" | "tip",
  "metric": string,   // short highlight phrase, e.g. "8 no-spend days!"
  "message": string,  // main insight, max 2 sentences
  "actionableStep": string // optional short concrete tip
}

Rules:
- Write all user-facing strings in ${language}.
- Be specific and data-driven. Do not invent numbers that are not in the context.
- Prefer one clear insight over generic advice.
- Keep metric under 8 words. Keep message under 2 sentences.
- actionableStep should be optional and concrete when present.
- If categoryLimits are present, you MAY highlight categories near or over their limit (use percentage / remainingAmount / isOverLimit).
- type guidance:
  - success: positive streak / under budget / healthy pattern
  - warning: overspending risk / budget pressure / category limit pressure
  - anomaly: unusual spike vs typical pattern
  - tip: practical optimization idea`;
}

function buildUserPrompt(context: {
  primaryCurrency: string;
  totalSpent: number;
  budget: number | null;
  remainingBudget: number | null;
  categoryTotals: Array<{ category: string; amount: number }>;
  categoryLimits: Array<{
    category: string;
    limitAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentage: number;
    isOverLimit: boolean;
  }>;
  noSpendDays: number;
  totalDays: number;
  recentTransactions: Array<{
    amount: number;
    currency: string;
    category: string;
    description: string | null;
    date: string;
  }>;
}): string {
  return `Current billing period context:
${JSON.stringify(context, null, 2)}

When categoryLimits is non-empty, prefer insights about categories close to or over their limits (percentage, remainingAmount, isOverLimit). Generate one insight JSON object.`;
}

async function callOpenAiInsight(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(INSIGHT_ERROR_CODES.AI_FAILED);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(INSIGHT_ERROR_CODES.AI_FAILED);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(INSIGHT_ERROR_CODES.AI_FAILED);
  }

  return content;
}

async function generateInsightContent(userId: string, locale: Locale): Promise<AiInsightContent> {
  const now = new Date();
  const serverNowIso = now.toISOString();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      financialMonthStartDay: true,
      currentMonthBudget: true,
      defaultMonthlyBudget: true,
      primaryCurrency: true,
    },
  });

  if (!user) {
    throw new Error(INSIGHT_ERROR_CODES.AI_FAILED);
  }

  const periodStart = getQuotaPeriodStart(user.financialMonthStartDay, now);
  const periodEnd = getQuotaPeriodEnd(periodStart);
  const primaryCurrency = user.primaryCurrency as CurrencyCode;
  const budget = user.currentMonthBudget ?? user.defaultMonthlyBudget ?? null;

  const [periodSnapshot, recentTransactions, periodTransactionDates] = await Promise.all([
    getOrRefreshPeriodAggregation(userId, now),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { date: 'desc' },
      take: RECENT_TRANSACTIONS_LIMIT,
      select: {
        amount: true,
        currency: true,
        category: true,
        description: true,
        date: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: periodEnd },
      },
      select: { date: true },
    }),
  ]);

  if (!periodSnapshot) {
    throw new Error(INSIGHT_ERROR_CODES.AI_FAILED);
  }

  const categoryLimitProgress = await getCategoryLimitProgressForUser(
    userId,
    periodSnapshot.categoryTotalsPrimary
  );

  const totalSpent = periodSnapshot.totalSpentPrimary + periodSnapshot.fixedCostsTotal;
  const remainingBudget = budget != null ? Math.round((budget - totalSpent) * 100) / 100 : null;
  const noSpend = computeNoSpendDays({
    periodStart,
    periodEnd,
    transactionDates: periodTransactionDates.map((row) => row.date),
    now,
  });

  const raw = await callOpenAiInsight(
    buildSystemPrompt(locale, serverNowIso),
    buildUserPrompt({
      primaryCurrency,
      totalSpent: Math.round(totalSpent * 100) / 100,
      budget,
      remainingBudget,
      categoryTotals: periodSnapshot.categoryTotalsPrimary,
      categoryLimits: categoryLimitProgress.map((limit) => ({
        category: limit.categoryKey,
        limitAmount: limit.limitAmount,
        spentAmount: limit.spentAmount,
        remainingAmount: limit.remainingAmount,
        percentage: limit.percentage,
        isOverLimit: limit.isOverLimit,
      })),
      noSpendDays: noSpend.noSpendDays,
      totalDays: noSpend.totalDays,
      recentTransactions: recentTransactions.map((transaction) => ({
        amount: transaction.amount.toNumber(),
        currency: transaction.currency,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date.toISOString().slice(0, 10),
      })),
    })
  );

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(INSIGHT_ERROR_CODES.GENERATION_FAILED);
  }

  const validated = insightSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error(INSIGHT_ERROR_CODES.GENERATION_FAILED);
  }

  return validated.data;
}

async function upsertInsightCache(
  userId: string,
  content: AiInsightContent
): Promise<{ content: AiInsightContent; updatedAt: Date }> {
  const row = await prisma.aiInsight.upsert({
    where: { userId },
    create: {
      userId,
      content,
    },
    update: {
      content,
    },
    select: {
      content: true,
      updatedAt: true,
    },
  });

  const parsed = parseCachedContent(row.content);
  if (!parsed) {
    throw new Error(INSIGHT_ERROR_CODES.GENERATION_FAILED);
  }

  return { content: parsed, updatedAt: row.updatedAt };
}

export async function getDashboardInsight(
  userId: string,
  options: { locale: Locale; forceRefresh?: boolean } = { locale: 'en' }
): Promise<DashboardInsightResponse | { error: string }> {
  try {
    const forceRefresh = options.forceRefresh ?? false;

    if (!forceRefresh) {
      const cached = await prisma.aiInsight.findUnique({
        where: { userId },
        select: { content: true, updatedAt: true },
      });

      if (cached && isCacheFresh(cached.updatedAt)) {
        const content = parseCachedContent(cached.content);
        if (content) {
          return {
            insight: content,
            cached: true,
            updatedAt: cached.updatedAt.toISOString(),
          };
        }
      }
    }

    const generated = await generateInsightContent(userId, options.locale);
    const saved = await upsertInsightCache(userId, generated);

    return {
      insight: saved.content,
      cached: false,
      updatedAt: saved.updatedAt.toISOString(),
    };
  } catch (error) {
    captureServerException(error, { scope: 'dashboard.insights.get', userId });

    if (error instanceof Error && error.message.startsWith('dashboard.insights.')) {
      return { error: error.message };
    }

    return { error: INSIGHT_ERROR_CODES.AI_FAILED };
  }
}
