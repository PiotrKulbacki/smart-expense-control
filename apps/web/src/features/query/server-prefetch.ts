import { dehydrate, type DehydratedState } from '@tanstack/react-query';
import { listUserCategories } from '@web/features/categories/services/category.service';
import type { SafeUser } from '@web/features/auth/types';
import { getQueryClient } from '@web/features/query/query-client';
import { queryKeys } from '@web/features/query/query-keys';

export async function prefetchAppShellData(user: SafeUser): Promise<DehydratedState> {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => listUserCategories(user.id),
  });

  return dehydrate(queryClient);
}
