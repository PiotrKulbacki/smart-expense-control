import { prisma } from '@smart-expense-control/database';
import type { Currency } from '@smart-expense-control/database';
import type { Decimal } from '@prisma/client/runtime/library';
import {
  getAiChatLimit,
  getAiChatQuotaStatus,
  type PlanType,
  type QuotaStatus,
} from '@shared/features/billing/plan-limits';
import {
  CHAT_ERROR_CODES,
  chatResponseSchema,
  type ChatMessage,
  type ChatRequest,
} from '@shared/features/ai/schemas';
import { env } from '@web/env';
import { ANALYTICS_EVENTS } from '@web/features/analytics/events';
import { captureServerEvent } from '@web/features/analytics/posthog-server';
import {
  aggregateFinancialContext,
  buildChatSystemPrompt,
} from '@web/features/ai/services/chat-context';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const RECENT_TRANSACTIONS_LIMIT = 15;

type MonthlyTransactionRow = {
  amount: Decimal;
  currency: Currency;
  category: string;
};

type RecentTransactionRow = MonthlyTransactionRow & {
  description: string | null;
  date: Date;
};

export type { QuotaStatus };
export { getAiChatQuotaStatus };

function getCurrentMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return { start, end, label };
}

async function fetchFinancialContext(userId: string) {
  const { start, end, label } = getCurrentMonthRange();

  const [monthlyTransactions, recentTransactions]: [
    MonthlyTransactionRow[],
    RecentTransactionRow[],
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      select: {
        amount: true,
        currency: true,
        category: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
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
  ]);

  return aggregateFinancialContext(
    label,
    monthlyTransactions.map((transaction) => ({
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      category: transaction.category,
    })),
    recentTransactions.map((transaction) => ({
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date,
    }))
  );
}

async function callOpenAiChat(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(CHAT_ERROR_CODES.AI_FAILED);
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: 'user', content: message },
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(CHAT_ERROR_CODES.AI_FAILED);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(CHAT_ERROR_CODES.AI_FAILED);
  }

  return content;
}

export type AiChatQuotaCheckResult = { ok: true; plan: PlanType } | { ok: false; error: string };

export async function checkAiChatQuota(userId: string): Promise<AiChatQuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true, monthlyAiChatCount: true },
  });

  if (!user) {
    return { ok: false, error: CHAT_ERROR_CODES.AI_FAILED };
  }

  const plan = user.currentPlan as PlanType;
  const limit = getAiChatLimit(plan);

  if (user.monthlyAiChatCount >= limit) {
    return {
      ok: false,
      error:
        plan === 'FREE' ? CHAT_ERROR_CODES.QUOTA_EXCEEDED : CHAT_ERROR_CODES.MONTHLY_LIMIT_REACHED,
    };
  }

  return { ok: true, plan };
}

export async function getUserAiChatQuota(userId: string): Promise<QuotaStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true, monthlyAiChatCount: true },
  });

  if (!user) {
    return null;
  }

  return getAiChatQuotaStatus(user.currentPlan as PlanType, user.monthlyAiChatCount);
}

async function incrementAiChatCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { monthlyAiChatCount: { increment: 1 } },
  });
}

export async function sendChatMessage(
  userId: string,
  input: ChatRequest
): Promise<{ reply: string } | { error: string }> {
  const quota = await checkAiChatQuota(userId);
  if (!quota.ok) {
    return { error: quota.error };
  }

  try {
    const context = await fetchFinancialContext(userId);
    const systemPrompt = buildChatSystemPrompt(context, input.locale);
    const rawReply = await callOpenAiChat(systemPrompt, input.history, input.message);

    const validated = chatResponseSchema.safeParse({ reply: rawReply });
    const reply = validated.success ? validated.data.reply : rawReply;

    await incrementAiChatCount(userId);

    captureServerEvent(userId, ANALYTICS_EVENTS.AI_CHAT_MESSAGE_SENT, {
      userId,
      plan: quota.plan,
      locale: input.locale,
    });

    return { reply };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { error: CHAT_ERROR_CODES.AI_FAILED };
    }

    if (error instanceof Error && error.message.startsWith('chat.')) {
      return { error: error.message };
    }

    return { error: CHAT_ERROR_CODES.AI_FAILED };
  }
}
