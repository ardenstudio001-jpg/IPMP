'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listItemsApi } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import {
  invalidateListQueries,
  removeListItemFromDetailCache,
  upsertListItemInDetailCache,
} from '@/lib/lists/list-cache';
import { listKeys } from '@/hooks/queries/use-lists';
import { verificationKeys } from '@/hooks/queries/use-verifications';

export const listItemKeys = {
  all: ['list-items'] as const,
  detail: (id: string) => ['list-items', id] as const,
  lineage: (id: string) => ['list-items', 'lineage', id] as const,
};

export function useListItemLineage(id: string | null) {
  return useQuery({
    queryKey: listItemKeys.lineage(id ?? ''),
    queryFn: async () => {
      const { data } = await listItemsApi.lineage(id!);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useListItemMutations(listId: string) {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: (data: Parameters<typeof listItemsApi.add>[1]) =>
      listItemsApi.add(listId, data),
    onSuccess: (response) => {
      upsertListItemInDetailCache(qc, listId, response.data);
      invalidateListQueries(qc, listId);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof listItemsApi.update>[1];
    }) => listItemsApi.update(id, data),
    onSuccess: (response) => {
      upsertListItemInDetailCache(qc, listId, response.data);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const moveToPurchase = useMutation({
    mutationFn: listItemsApi.moveToPurchase,
    onSuccess: () => {
      invalidateListQueries(qc);
      void qc.invalidateQueries({ queryKey: listKeys.detail(listId) });
      toast.success('Items moved to purchase list');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const moveToAcquired = useMutation({
    mutationFn: listItemsApi.moveToAcquired,
    onSuccess: () => {
      invalidateListQueries(qc);
      void qc.invalidateQueries({ queryKey: listKeys.detail(listId) });
      toast.success('Items moved to acquired list');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rollback = useMutation({
    mutationFn: (id: string) => listItemsApi.rollback(id),
    onSuccess: (response) => {
      removeListItemFromDetailCache(qc, listId, response.data.id);
      invalidateListQueries(qc, listId);
      toast.success('Item removed from workflow');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { add, update, moveToPurchase, moveToAcquired, rollback };
}
