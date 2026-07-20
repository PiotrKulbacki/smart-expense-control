import { prisma } from '@lyamo/database';
import {
  getAiScanLimit,
  getAiScanQuotaStatus,
  getPhotoRetentionDays,
  type AiScanQuotaStatus,
  type PlanType,
} from '@shared/features/billing/plan-limits';
import { getAllowedCategoryKeys } from '@web/features/categories/services/category.service';
import { normalizeLegacyCategory } from '@shared/features/transactions/categories';
import {
  CURRENCY_CODES,
  receiptScanResultSchema,
  RECEIPT_SCAN_ERROR_CODES,
  type ReceiptScanResult,
} from '@shared/features/transactions/schemas';
import { env } from '@web/env';
import { resolveReceiptSplitDraft } from '@web/features/ai/services/receipt-scan-splits';
import { captureServerException } from '@web/lib/sentry-server';
import {
  deleteReceiptImage,
  uploadReceiptImage,
} from '@web/features/scanner/services/receipt-storage.service';
import { isSupabaseStorageConfigured } from '@web/lib/supabase-server';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_VISION_MODEL = 'gpt-4o';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type ReceiptScanDraft = ReceiptScanResult & {
  isAiScanned: true;
  receiptGroupId: string;
  receiptImageUrl: string;
};

export type { AiScanQuotaStatus };
export { getAiScanQuotaStatus };

function getVisionModel(): string {
  return env.OPENAI_VISION_MODEL ?? DEFAULT_VISION_MODEL;
}

function buildSystemPrompt(categoryKeys: string[], currentDate: string): string {
  const categories = categoryKeys.join(', ');
  const currencies = CURRENCY_CODES.join(', ');
  const hasAlcohol = categoryKeys.includes('Alcohol');
  const alcoholRule = hasAlcohol
    ? `
- ALCOHOL (CRITICAL): Any alcoholic beverage MUST use category "Alcohol". Never put alcohol in Groceries or Other.
  Alcohol signals: "% Vol.", "Vol.", "vol", "ABV", "Spritz", "Bier", "Beer", "Wein", "Wine", "Sekt", "Cidre", "Alkohol",
  "Prosecco", "Vodka", "Rum", "Whisky", "Gin", "Lager", "Ale", "Cider", "Champagne", "Likör", "Liqueur".
  Example: "Rosa Spritz" with alcohol content → Alcohol, NOT Groceries.`
    : `
- ALCOHOLIC BEVERAGES: If "Alcohol" is not in the allowed list, still never use "Other" for alcoholic drinks — use the closest allowed category.`;

  return `You are a document OCR assistant for expenses (receipts, invoices, bills). Extract expense data from images.

TEMPORAL ANCHOR:
Today's reference date is ${currentDate} (ISO 8601). Use it when interpreting abbreviated or two-digit years on receipts.
Example: "02.07.26" with reference 2026-07-15 → date 2026-07-02 (not 2022). Prefer the most complete date printed on the receipt (e.g. TSE timestamps, payment footer) over abbreviated header dates when they disagree.

OCR INTEGRITY (CRITICAL — NO FUDGING):
- Transcribe every printed product line exactly as shown, with exact spelling and exact individual prices.
- NEVER adjust, recalculate, round, or invent line item prices to make them sum to the receipt total.
- NEVER omit line items to force totals to match.
- Discount lines (Rabatt, Preisvorteil, Lidl Plus Rabatt, coupon, refund) must be included as separate line items with negative amounts when printed as deductions.
- Discount lines immediately follow the product they apply to — keep that order in lineItems.
- Do NOT fold discounts into product prices yourself; return product at printed gross price, then discount as its own negative line.
- Deposit charges (Pfand, Kaucja, bottle deposit) → positive amount; deposit returns/refunds (Pfand-Rückgabe) → negative amount.
- Quantity lines (e.g. "2 x 2,79 = 5,58") → use the line total (5.58) as amount; preserve the product name.
- The amount field must be the printed total paid ("Zu zahlen", "Total", "Sum", etc.) exactly as shown.
- If line items do not sum to the printed total, still return all items with exact printed prices and set needsManualReview to true.
- All monetary values in JSON must be numbers with dot decimal separator (e.g. 2.49), never strings with commas.

Return ONLY valid JSON with these fields:
- amount (number, positive, total paid)
- currency (one of: ${currencies})
- date (ISO 8601 date string YYYY-MM-DD)
- category (exactly one of: ${categories}) — the dominant category if the receipt were recorded as a single expense
- description (short string, e.g. store or vendor name)
- needsManualReview (boolean — true if any field is uncertain, unreadable, or line items do not sum to total)
- hasMultipleCategories (boolean — true if the receipt clearly contains items from multiple spending categories)
- lineItems (optional array — REQUIRED when the receipt has multiple categories or many distinct products):
  - Each element: { "name": string, "amount": number, "category": one of the allowed categories }
  - Include every meaningful product line with its individual price from the receipt
  - Deposit/refund lines (Pfand, Kaucja, deposit, bottle deposit) → use the same category as the main basket or the product they belong to, never "Other"
  - Non-alcoholic drinks and mixers (Tonic, Cola, Wasser, Water, Juice, Saft, Sirup) → Groceries (or closest food/drink category), never "Other" unless truly uncategorizable
${alcoholRule}
- suggestedSplits (optional array; include when hasMultipleCategories is true):
  - Each element: { "category": one of the allowed categories, "amount": number, "items": optional array of { "name": string, "amount": number } }
  - Use 2-5 groups maximum; group similar items together
  - Map cleaning/household products to Household, cosmetics to Cosmetics, food to Groceries, alcohol to Alcohol, fuel to Fuel
  - Sum suggestedSplits from actual line item amounts — do NOT fudge split amounts to match total

If the image is not a financial document or is completely unreadable, set needsManualReview to true and use your best guess for other fields. Omit lineItems/suggestedSplits when the receipt is single-category.`;
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

function extractJsonFromContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

async function callOpenAiVision(imageUrl: string, categoryKeys: string[]): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(RECEIPT_SCAN_ERROR_CODES.AI_FAILED);
  }

  const currentDate = new Date().toISOString().slice(0, 10);
  const visionModel = getVisionModel();

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: visionModel,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(categoryKeys, currentDate) },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this expense document image and return the JSON object.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
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
    const allowedCategories = await getAllowedCategoryKeys(userId);
    const categoryKeys = [...allowedCategories];
    const receiptGroupId = crypto.randomUUID();

    if (!isSupabaseStorageConfigured()) {
      return { error: RECEIPT_SCAN_ERROR_CODES.STORAGE_NOT_CONFIGURED };
    }

    const uploadResult = await uploadReceiptImage(userId, receiptGroupId, file);
    if ('error' in uploadResult) {
      return { error: uploadResult.error };
    }

    const { storagePath, signedUrl } = uploadResult;

    let rawContent: string;
    try {
      rawContent = await callOpenAiVision(signedUrl, categoryKeys);
    } catch (error) {
      await deleteReceiptImage(storagePath);
      throw error;
    }

    const parsed = extractJsonFromContent(rawContent);
    const validated = receiptScanResultSchema.safeParse(parsed);

    if (!validated.success) {
      await deleteReceiptImage(storagePath);
      return { error: RECEIPT_SCAN_ERROR_CODES.PARSE_FAILED };
    }

    const normalizedCategory = normalizeLegacyCategory(validated.data.category);
    if (!allowedCategories.has(normalizedCategory)) {
      await deleteReceiptImage(storagePath);
      return { error: RECEIPT_SCAN_ERROR_CODES.PARSE_FAILED };
    }

    const splitDraft = resolveReceiptSplitDraft(
      {
        lineItems: validated.data.lineItems,
        suggestedSplits: validated.data.suggestedSplits,
        amount: validated.data.amount,
      },
      allowedCategories
    );

    const result: ReceiptScanResult = {
      ...validated.data,
      category: normalizedCategory,
      hasMultipleCategories: Boolean(splitDraft.suggestedSplits?.length),
      lineItems: splitDraft.lineItems,
      suggestedSplits: splitDraft.suggestedSplits,
    };

    if (result.lineItems?.length) {
      const lineItemsSum = result.lineItems.reduce((total, item) => total + item.amount, 0);

      if (Math.abs(lineItemsSum - result.amount) > 0.01) {
        result.needsManualReview = true;
      }
    }

    if (result.needsManualReview && result.amount <= 0) {
      await deleteReceiptImage(storagePath);
      return { error: RECEIPT_SCAN_ERROR_CODES.UNREADABLE };
    }

    await incrementAiScanCount(userId);
    // Analytics events are captured client-side only after cookie consent.

    const persistReceiptImage = getPhotoRetentionDays(quota.plan) > 0;
    if (!persistReceiptImage) {
      await deleteReceiptImage(storagePath);
    }

    return {
      draft: {
        ...result,
        isAiScanned: true,
        receiptGroupId,
        receiptImageUrl: persistReceiptImage ? storagePath : '',
      },
    };
  } catch (error) {
    captureServerException(error, { scope: 'ai.scan.receipt', userId });

    if (error instanceof SyntaxError) {
      return { error: RECEIPT_SCAN_ERROR_CODES.PARSE_FAILED };
    }

    if (error instanceof Error && error.message.startsWith('scanner.')) {
      return { error: error.message };
    }

    return { error: RECEIPT_SCAN_ERROR_CODES.AI_FAILED };
  }
}
