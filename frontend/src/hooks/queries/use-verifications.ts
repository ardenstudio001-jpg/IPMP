'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { verificationsApi } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { listKeys } from '@/hooks/queries/use-lists';

export const verificationKeys = {
  all: ['verifications'] as const,
  list: (params?: Record<string, unknown>) =>
    ['verifications', 'list', params] as const,
};

export function useVerifications(params?: {
  listId?: string;
  listItemId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: verificationKeys.list(params),
    queryFn: async () => {
      const { data } = await verificationsApi.list(params);
      return data;
    },
  });
}

export function useVerificationMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: verificationsApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: verificationKeys.all });
      void qc.invalidateQueries({ queryKey: listKeys.all });
      toast.success('Verification recorded');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof verificationsApi.update>[1];
    }) => verificationsApi.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: verificationKeys.all });
      void qc.invalidateQueries({ queryKey: listKeys.all });
      toast.success('Verification updated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { create, update };
}
