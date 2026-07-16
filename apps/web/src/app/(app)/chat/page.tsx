import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getUserAiChatQuota, getUserChatHistoryPage } from '@web/features/ai/services/chat.service';
import { getUserFromSession } from '@web/features/auth/services/auth.service';
import { AiChatView } from '@web/features/chat/components/AiChatView';
import { getQueryClient } from '@web/features/query/query-client';
import { queryKeys } from '@web/features/query/query-keys';

const HISTORY_PAGE_SIZE = 30;

export default async function ChatPage() {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  const queryClient = getQueryClient();
  const [quota, historyPage] = await Promise.all([
    getUserAiChatQuota(user.id),
    getUserChatHistoryPage(user.id, HISTORY_PAGE_SIZE, 0),
  ]);

  if (quota) {
    queryClient.setQueryData(queryKeys.chatQuota(user.id), {
      plan: user.currentPlan,
      quota,
    });
  }

  queryClient.setQueryData(queryKeys.chatHistory(user.id, 0, HISTORY_PAGE_SIZE), historyPage);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AiChatView initialHistoryPage={historyPage} />
    </HydrationBoundary>
  );
}
