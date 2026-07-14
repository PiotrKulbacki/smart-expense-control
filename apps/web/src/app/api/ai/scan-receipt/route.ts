import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { scanReceiptFromFile } from '@web/features/ai/services/receipt-scanner.service';
import { checkAiRateLimit } from '@web/lib/rate-limit';
import { requireAiEnabled } from '@web/lib/require-ai-enabled';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const aiDisabled = requireAiEnabled();
    if (aiDisabled) {
      return aiDisabled;
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const rateLimit = await checkAiRateLimit(request, 'scan', user.id);
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
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
