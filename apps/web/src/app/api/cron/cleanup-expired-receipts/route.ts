import { prisma } from '@lyamo/database';
import { deleteReceiptImage } from '@web/features/scanner/services/receipt-storage.service';
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
    const now = new Date();
    const expired = await prisma.transaction.findMany({
      where: {
        imageExpiresAt: { lte: now },
        receiptImageUrl: { not: null },
      },
      select: {
        id: true,
        receiptImageUrl: true,
        receiptGroupId: true,
      },
      take: 200,
    });

    let imagesDeleted = 0;
    const clearedPaths = new Set<string>();

    for (const transaction of expired) {
      const path = transaction.receiptImageUrl;
      if (!path) {
        continue;
      }

      if (!clearedPaths.has(path)) {
        await deleteReceiptImage(path);
        clearedPaths.add(path);
        imagesDeleted += 1;
      }

      await prisma.transaction.updateMany({
        where: {
          receiptImageUrl: path,
        },
        data: {
          receiptImageUrl: null,
          imageExpiresAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      transactionsMatched: expired.length,
      imagesDeleted,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    captureServerException(error, { scope: 'cron.cleanup-expired-receipts' });
    return NextResponse.json({ error: 'Expired receipt cleanup failed' }, { status: 500 });
  }
}
