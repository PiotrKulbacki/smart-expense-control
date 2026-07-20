import { prisma } from '@lyamo/database';
import {
  PAST_DUE_GRACE_MS,
  PAST_DUE_REMINDER_AFTER_MS,
} from '@shared/features/billing/financial-month';
import { isPaidPlan } from '@shared/features/billing/plan-limits';
import { sendPastDueDunningEmail } from '@web/features/billing/services/dunning-email.service';
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
    const now = Date.now();
    const graceCutoff = new Date(now - PAST_DUE_GRACE_MS);
    const reminderCutoff = new Date(now - PAST_DUE_REMINDER_AFTER_MS);

    const pastDueUsers = await prisma.user.findMany({
      where: {
        pastDueSince: { not: null },
        currentPlan: { in: ['PRO', 'PREMIUM'] },
      },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        pastDueSince: true,
        pastDueFirstEmailSentAt: true,
        pastDueReminderSentAt: true,
      },
    });

    let remindersSent = 0;
    let usersDowngraded = 0;

    for (const user of pastDueUsers) {
      if (!user.pastDueSince || !user.stripeCustomerId) {
        continue;
      }

      if (user.pastDueSince <= graceCutoff) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentPlan: 'FREE',
            pastDueSince: null,
            pastDueFirstEmailSentAt: null,
            pastDueReminderSentAt: null,
          },
        });
        usersDowngraded += 1;
        continue;
      }

      if (
        user.pastDueSince <= reminderCutoff &&
        user.pastDueFirstEmailSentAt &&
        !user.pastDueReminderSentAt
      ) {
        const sent = await sendPastDueDunningEmail({
          email: user.email,
          stripeCustomerId: user.stripeCustomerId,
          kind: 'reminder',
        });

        if (sent) {
          await prisma.user.update({
            where: { id: user.id },
            data: { pastDueReminderSentAt: new Date() },
          });
          remindersSent += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      usersDowngraded,
      remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Past due downgrade failed' }, { status: 500 });
  }
}

// Keep isPaidPlan import used for type narrowing in future edits / lint.
void isPaidPlan;
