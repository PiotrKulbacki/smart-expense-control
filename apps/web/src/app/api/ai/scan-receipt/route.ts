import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  checkAiScanQuota,
  scanReceiptFromFile,
} from '@web/features/ai/services/receipt-scanner.service';
import { checkAiRateLimit } from '@web/lib/rate-limit';
import { requireAiEnabled } from '@web/lib/require-ai-enabled';
import { isSupabaseStorageConfigured } from '@web/lib/supabase-server';
import { debugIngest } from '@web/lib/debug-ingest';

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

    const quotaCheck = await checkAiScanQuota(user.id);
    if (!quotaCheck.ok) {
      return jsonError(quotaCheck.error, 429);
    }

    // FREE: monthly DB quota is the business limit — skip Redis per-minute cap.
    // PRO: apply Redis abuse protection (15 req/min) against endpoint spam.
    if (quotaCheck.plan === 'PRO') {
      const rateLimit = await checkAiRateLimit(request, 'scan', user.id);
      if (!rateLimit.allowed) {
        return jsonError(RATE_LIMIT_ERROR, 429);
      }
    }

    const formData = await request.formData();
    const file = formData.get('receipt');

    if (!(file instanceof File)) {
      return jsonError('scanner.errors.invalidFile', 400);
    }

    // #region agent log
    debugIngest(
      'scan-receipt/route.ts:POST',
      'Scan receipt request env snapshot',
      {
        storageConfigured: isSupabaseStorageConfigured(),
        vercel: Boolean(process.env.VERCEL),
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
      'H1'
    );
    // #endregion

    const result = await scanReceiptFromFile(user.id, file);

    if ('error' in result) {
      // #region agent log
      debugIngest(
        'scan-receipt/route.ts:POST',
        'Scan receipt failed',
        { errorCode: result.error },
        result.error === 'scanner.errors.storageNotConfigured' ? 'H1' : 'H5'
      );
      // #endregion
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
