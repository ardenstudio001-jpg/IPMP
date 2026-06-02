'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const { data } = await categoriesApi.list();
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (name: string) => categoriesApi.create(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success('Category created');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { create };
}
