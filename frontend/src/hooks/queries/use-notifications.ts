'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly?: boolean) => ['notifications', { unreadOnly }] as const,
};

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: async () => {
      const { data } = await notificationsApi.list({ limit: 50, unreadOnly });
      return data;
    },
    refetchInterval: 120_000,
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: notificationKeys.all });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      invalidate();
      toast.success('All notifications marked as read');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { markRead, markAllRead };
}
