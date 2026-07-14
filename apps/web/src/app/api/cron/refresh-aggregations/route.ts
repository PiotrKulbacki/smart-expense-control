import { NextResponse } from 'next/server';
import { env } from '@web/env';
import { refreshDirtyPeriodAggregations } from '@web/features/analytics/services/period-aggregation-cache.service';
import { captureServerException } from '@web/lib/sentry-server';

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
    const url = new URL(request.url);
    const batchSize = Math.min(
      500,
      Math.max(1, Number.parseInt(url.searchParams.get('batchSize') ?? '100', 10) || 100)
    );

    const result = await refreshDirtyPeriodAggregations(batchSize);

    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      pruned: result.pruned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    captureServerException(error, { scope: 'cron.refresh-aggregations' });
    return NextResponse.json({ error: 'Aggregation refresh failed' }, { status: 500 });
  }
}
