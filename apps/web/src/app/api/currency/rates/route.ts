import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { getExchangeRates } from '@web/features/currency/services/currency.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const rates = await getExchangeRates();
    return NextResponse.json({ rates });
  } catch {
    return jsonError('currency.errors.fetchFailed', 500);
  }
}
