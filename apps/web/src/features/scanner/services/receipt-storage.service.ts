import { RECEIPT_SCAN_ERROR_CODES } from '@shared/features/transactions/schemas';
import { getSupabaseAdminClient, isSupabaseStorageConfigured } from '@web/lib/supabase-server';
import { captureServerException } from '@web/lib/sentry-server';

export const RECEIPTS_BUCKET = 'receipts';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function buildReceiptStoragePath(
  userId: string,
  receiptGroupId: string,
  mimeType: string
): string {
  return `${userId}/${receiptGroupId}.${extensionForMimeType(mimeType)}`;
}

export function parseReceiptStoragePath(storagePath: string): {
  userId: string;
  receiptGroupId: string;
} | null {
  const match = storagePath.match(/^([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
  if (!match) {
    return null;
  }

  return {
    userId: match[1],
    receiptGroupId: match[2],
  };
}

export async function uploadReceiptImage(
  userId: string,
  receiptGroupId: string,
  file: File
): Promise<{ storagePath: string; signedUrl: string } | { error: string }> {
  if (!isSupabaseStorageConfigured()) {
    return { error: RECEIPT_SCAN_ERROR_CODES.STORAGE_NOT_CONFIGURED };
  }

  const storagePath = buildReceiptStoragePath(userId, receiptGroupId, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      captureServerException(uploadError, {
        scope: 'storage.receipt.upload',
        userId,
        receiptGroupId,
      });
      return { error: RECEIPT_SCAN_ERROR_CODES.STORAGE_UPLOAD_FAILED };
    }

    const signedUrl = await createReceiptSignedUrl(storagePath);
    if (!signedUrl) {
      return { error: RECEIPT_SCAN_ERROR_CODES.STORAGE_UPLOAD_FAILED };
    }

    return { storagePath, signedUrl };
  } catch (error) {
    captureServerException(error, {
      scope: 'storage.receipt.upload',
      userId,
      receiptGroupId,
    });
    return { error: RECEIPT_SCAN_ERROR_CODES.STORAGE_UPLOAD_FAILED };
  }
}

export async function createReceiptSignedUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseStorageConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      captureServerException(error ?? new Error('Missing signed URL'), {
        scope: 'storage.receipt.signedUrl',
        storagePath,
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    captureServerException(error, {
      scope: 'storage.receipt.signedUrl',
      storagePath,
    });
    return null;
  }
}

export async function deleteReceiptImage(storagePath: string): Promise<void> {
  if (!isSupabaseStorageConfigured()) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath]);

    if (error) {
      captureServerException(error, {
        scope: 'storage.receipt.delete',
        storagePath,
      });
    }
  } catch (error) {
    captureServerException(error, {
      scope: 'storage.receipt.delete',
      storagePath,
    });
  }
}

export async function deleteReceiptImageIfOrphaned(
  userId: string,
  receiptGroupId: string,
  receiptImageUrl: string | null
): Promise<void> {
  if (!receiptImageUrl) {
    return;
  }

  const { prisma } = await import('@lyamo/database');
  const remaining = await prisma.transaction.count({
    where: {
      userId,
      receiptGroupId,
    },
  });

  if (remaining === 0) {
    await deleteReceiptImage(receiptImageUrl);
  }
}

export async function deleteAllUserReceiptImages(userId: string): Promise<void> {
  if (!isSupabaseStorageConfigured()) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).list(userId, {
      limit: 1000,
    });

    if (error) {
      captureServerException(error, {
        scope: 'storage.receipt.deleteAll.list',
        userId,
      });
      return;
    }

    const paths = (data ?? [])
      .map((item) => item.name)
      .filter(Boolean)
      .map((name) => `${userId}/${name}`);

    if (paths.length === 0) {
      return;
    }

    const { error: removeError } = await supabase.storage.from(RECEIPTS_BUCKET).remove(paths);
    if (removeError) {
      captureServerException(removeError, {
        scope: 'storage.receipt.deleteAll.remove',
        userId,
      });
    }
  } catch (error) {
    captureServerException(error, {
      scope: 'storage.receipt.deleteAll',
      userId,
    });
  }
}
