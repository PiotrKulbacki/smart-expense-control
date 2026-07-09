import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { scanReceiptFromFile } from '@web/features/ai/services/receipt-scanner.service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const formData = await request.formData();
    const file = formData.get('receipt');

    if (!(file instanceof File)) {
      return jsonError('scanner.errors.invalidFile', 400);
    }

    const result = await scanReceiptFromFile(user.id, file);

    if ('error' in result) {
      const isQuotaError =
        result.error === 'scanner.errors.quotaExceeded' ||
        result.error === 'scanner.errors.monthlyLimitReached';
      const status = isQuotaError ? 429 : 422;
      return jsonError(result.error, status);
    }

    return NextResponse.json({
      draft: result.draft,
      message: result.draft.needsManualReview
        ? 'scanner.warnings.needsReview'
        : 'scanner.success.readyToConfirm',
    });
  } catch {
    return jsonError('scanner.errors.aiFailed', 500);
  }
}
