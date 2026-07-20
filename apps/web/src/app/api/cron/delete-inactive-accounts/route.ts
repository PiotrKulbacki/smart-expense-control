import { prisma } from '@lyamo/database';
import { INACTIVE_ACCOUNT_TTL_MS } from '@shared/features/billing/financial-month';
import { deleteAllUserReceiptImages } from '@web/features/scanner/services/receipt-storage.service';
import { env } from '@web/env';
import { captureServerException } from '@web/lib/sentry-server';
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
    const cutoff = new Date(Date.now() - INACTIVE_ACCOUNT_TTL_MS);
    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: { lte: cutoff },
      },
      select: { id: true },
      take: 50,
    });

    let deleted = 0;

    for (const user of inactiveUsers) {
      try {
        await deleteAllUserReceiptImages(user.id);
        await prisma.user.delete({ where: { id: user.id } });
        deleted += 1;
      } catch (error) {
        captureServerException(error, {
          scope: 'cron.delete-inactive-accounts',
          userId: user.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      candidates: inactiveUsers.length,
      deleted,
      cutoff: cutoff.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    captureServerException(error, { scope: 'cron.delete-inactive-accounts' });
    return NextResponse.json({ error: 'Inactive account cleanup failed' }, { status: 500 });
  }
}
