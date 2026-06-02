'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints';
import type { Product } from '@/lib/api/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';

export const productKeys = {
  all: ['products'] as const,
  list: (params?: Record<string, unknown>) => ['products', 'list', params] as const,
  detail: (id: string) => ['products', id] as const,
};

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const { data } = await productsApi.list({ limit: 100, ...params });
      return data;
    },
  });
}

export function useProductMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Product created');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof productsApi.update>[1] }) =>
      productsApi.update(id, data),
    onSuccess: (response) => {
      qc.setQueryData(productKeys.detail(response.data.id), response.data);
      void qc.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { create, update };
}

export type { Product };
