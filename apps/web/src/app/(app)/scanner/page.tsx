import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getUserAiScanQuota } from '@web/features/ai/services/receipt-scanner.service';
import { getUserFromSession } from '@web/features/auth/services/auth.service';
import { getQueryClient } from '@web/features/query/query-client';
import { queryKeys } from '@web/features/query/query-keys';
import { ReceiptScanner } from '@web/features/scanner/components/ReceiptScanner';
import { listReceiptArchiveDocuments } from '@web/features/scanner/services/receipt-archive.service';

export default async function ScannerPage() {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  const queryClient = getQueryClient();
  const [quota, archiveDocuments] = await Promise.all([
    getUserAiScanQuota(user.id),
    listReceiptArchiveDocuments(user.id),
  ]);

  if (quota) {
    queryClient.setQueryData(queryKeys.scanQuota(user.id), {
      plan: user.currentPlan,
      quota,
    });
  }

  queryClient.setQueryData(queryKeys.receiptArchive(user.id), archiveDocuments);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReceiptScanner />
    </HydrationBoundary>
  );
}
