import { prisma } from '@smart-expense-control/database';
import {
  getAiScanLimit,
  getAiScanQuotaStatus,
  type AiScanQuotaStatus,
  type PlanType,
} from '@shared/features/billing/plan-limits';
import {
  receiptScanResultSchema,
  RECEIPT_SCAN_ERROR_CODES,
  TRANSACTION_CATEGORIES,
  type ReceiptScanResult,
} from '@shared/features/transactions/schemas';
import { env } from '@web/env';
import { ANALYTICS_EVENTS } from '@web/features/analytics/events';
import { captureServerEvent } from '@web/features/analytics/posthog-server';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type ReceiptScanDraft = ReceiptScanResult & {
  isAiScanned: true;
};

export type { AiScanQuotaStatus };
export { getAiScanQuotaStatus };

function buildSystemPrompt(): string {
  const categories = TRANSACTION_CATEGORIES.join(', ');
  return `You are a receipt OCR assistant. Extract expense data from receipt images.
Return ONLY valid JSON with these fields:
- amount (number, positive, total paid)
- currency (one of: PLN, EUR, GBP)
- date (ISO 8601 date string YYYY-MM-DD)
- category (exactly one of: ${categories})
- description (short string, e.g. store name)
- needsManualReview (boolean — true if any field is uncertain or unreadable)

If the image is not a receipt or is completely unreadable, set needsManualReview to true and use your best guess for other fields.`;
}

function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return RECEIPT_SCAN_ERROR_CODES.INVALID_FILE;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return RECEIPT_SCAN_ERROR_CODES.FILE_TOO_LARGE;
  }

  return null;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString('base64');
}

function extractJsonFromContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

async function callOpenAiVision(base64: string, mimeType: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(RECEIPT_SCAN_ERROR_CODES.AI_FAILED);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this receipt image and return the JSON object.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(RECEIPT_SCAN_ERROR_CODES.AI_FAILED);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(RECEIPT_SCAN_ERROR_CODES.AI_FAILED);
  }

  return content;
}

export type AiScanQuotaCheckResult = { ok: true; plan: PlanType } | { ok: false; error: string };

export async function checkAiScanQuota(userId: string): Promise<AiScanQuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true, monthlyAiScansCount: true },
  });

  if (!user) {
    return { ok: false, error: RECEIPT_SCAN_ERROR_CODES.AI_FAILED };
  }

  const plan = user.currentPlan as PlanType;
  const limit = getAiScanLimit(plan);

  if (user.monthlyAiScansCount >= limit) {
    return {
      ok: false,
      error:
        plan === 'FREE'
          ? RECEIPT_SCAN_ERROR_CODES.QUOTA_EXCEEDED
          : RECEIPT_SCAN_ERROR_CODES.MONTHLY_LIMIT_REACHED,
    };
  }

  return { ok: true, plan };
}

export async function getUserAiScanQuota(userId: string): Promise<AiScanQuotaStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true, monthlyAiScansCount: true },
  });

  if (!user) {
    return null;
  }

  return getAiScanQuotaStatus(user.currentPlan as PlanType, user.monthlyAiScansCount);
}

async function incrementAiScanCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { monthlyAiScansCount: { increment: 1 } },
  });
}

export async function scanReceiptFromFile(
  userId: string,
  file: File
): Promise<{ draft: ReceiptScanDraft } | { error: string }> {
  const fileError = validateImageFile(file);
  if (fileError) {
    return { error: fileError };
  }

  const quota = await checkAiScanQuota(userId);
  if (!quota.ok) {
    return { error: quota.error };
  }

  try {
    const base64 = await fileToBase64(file);
    const rawContent = await callOpenAiVision(base64, file.type);
    const parsed = extractJsonFromContent(rawContent);
    const validated = receiptScanResultSchema.safeParse(parsed);

    if (!validated.success) {
      return { error: RECEIPT_SCAN_ERROR_CODES.PARSE_FAILED };
    }

    const result = validated.data;

    if (result.needsManualReview && result.amount <= 0) {
      return { error: RECEIPT_SCAN_ERROR_CODES.UNREADABLE };
    }

    await incrementAiScanCount(userId);

    captureServerEvent(userId, ANALYTICS_EVENTS.AI_SCAN_COMPLETED, {
      userId,
      plan: quota.plan,
      needsManualReview: result.needsManualReview,
    });

    return {
      draft: {
        ...result,
        isAiScanned: true,
      },
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { error: RECEIPT_SCAN_ERROR_CODES.PARSE_FAILED };
    }

    if (error instanceof Error && error.message.startsWith('scanner.')) {
      return { error: error.message };
    }

    return { error: RECEIPT_SCAN_ERROR_CODES.AI_FAILED };
  }
}
