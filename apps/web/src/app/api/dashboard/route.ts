import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  getDashboardData,
  parseDashboardDateRange,
} from '@web/features/dashboard/services/dashboard.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const dateRange = parseDashboardDateRange(searchParams);
    const data = await getDashboardData(user.id, dateRange);

    if (!data) {
      return jsonError('auth.errors.generic', 500);
    }

    return NextResponse.json(data);
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
