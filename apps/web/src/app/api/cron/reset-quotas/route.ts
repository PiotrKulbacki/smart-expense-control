import { prisma } from '@smart-expense-control/database';
import { shouldResetQuotaToday } from '@shared/features/billing/financial-month';
import { env } from '@web/env';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: Request): boolean {
  if (!env.CRON_SECRET) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = now.getUTCDate();

    const candidates = await prisma.user.findMany({
      where: { financialMonthStartDay: today },
      select: {
        id: true,
        financialMonthStartDay: true,
        lastQuotaResetAt: true,
        defaultMonthlyBudget: true,
      },
    });

    const usersToReset = candidates.filter((user) =>
      shouldResetQuotaToday(user.financialMonthStartDay, user.lastQuotaResetAt, now)
    );

    if (usersToReset.length === 0) {
      return NextResponse.json({
        success: true,
        usersReset: 0,
        timestamp: now.toISOString(),
      });
    }

    const resetIds = usersToReset.map((user) => user.id);

    const quotaResult = await prisma.user.updateMany({
      where: { id: { in: resetIds } },
      data: {
        monthlyAiScansCount: 0,
        monthlyAiChatCount: 0,
        lastQuotaResetAt: now,
      },
    });

    const budgetUpdates = usersToReset.filter((user) => user.defaultMonthlyBudget != null);

    if (budgetUpdates.length > 0) {
      await Promise.all(
        budgetUpdates.map((user) =>
          prisma.user.update({
            where: { id: user.id },
            data: { currentMonthBudget: user.defaultMonthlyBudget },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      usersReset: quotaResult.count,
      timestamp: now.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Quota reset failed' }, { status: 500 });
  }
}
