'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '@/lib/api/endpoints';
import type { ListType } from '@/lib/api/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { invalidateListQueries } from '@/lib/lists/list-cache';

export const listKeys = {
  all: ['lists'] as const,
  list: (params?: Record<string, unknown>) => ['lists', 'list', params] as const,
  detail: (id: string, includeRemoved?: boolean) =>
    ['lists', 'detail', id, includeRemoved] as const,
};

export function useLists(params?: {
  type?: ListType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: listKeys.list(params),
    queryFn: async () => {
      const { data } = await listsApi.list(params);
      return data;
    },
  });
}

export function useList(id: string, includeRemoved = false) {
  return useQuery({
    queryKey: listKeys.detail(id, includeRemoved),
    queryFn: async () => {
      const { data } = await listsApi.get(id, includeRemoved);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useListMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: listsApi.create,
    onSuccess: () => {
      invalidateListQueries(qc);
      toast.success('List created');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { create };
}
