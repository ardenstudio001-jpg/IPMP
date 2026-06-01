'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints';
import type { Product } from '@/lib/api/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import {
  invalidateProductStats,
  upsertProductInAllListCaches,
} from '@/lib/products/product-cache';
import { notificationKeys } from '@/hooks/queries/use-notifications';
import { auditKeys } from '@/hooks/queries/use-audit';

export const productKeys = {
  all: ['products'] as const,
  list: (params?: Record<string, unknown>) => ['products', 'list', params] as const,
  stats: ['products', 'stats'] as const,
  detail: (id: string) => ['products', id] as const,
};

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const { data } = await productsApi.list({ limit: 100, ...params });
      return data;
    },
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: productKeys.stats,
    queryFn: async () => {
      const { data } = await productsApi.stats();
      return data;
    },
  });
}

export function useProductMutations() {
  const qc = useQueryClient();

  const syncProduct = (product: Product) => {
    upsertProductInAllListCaches(qc, product);
    invalidateProductStats(qc);
    void qc.invalidateQueries({ queryKey: notificationKeys.all });
    void qc.invalidateQueries({ queryKey: auditKeys.all });
  };

  const create = useMutation({
    mutationFn: productsApi.create,
    onSuccess: (response) => {
      syncProduct(response.data);
      toast.success('Product created');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof productsApi.update>[1] }) =>
      productsApi.update(id, data),
    onSuccess: (response) => {
      syncProduct(response.data);
    },
    onError: (e) => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
      toast.error(getErrorMessage(e));
    },
  });

  const applyCosting = useMutation({
    mutationFn: ({ id, unitCostPrice }: { id: string; unitCostPrice: number }) =>
      productsApi.applyCosting(id, unitCostPrice),
    onSuccess: (response) => {
      syncProduct(response.data);
      toast.success('Costing saved');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approve = useMutation({
    mutationFn: ({
      id,
      finalSellingPrice,
      printed,
    }: {
      id: string;
      finalSellingPrice: number;
      printed: boolean;
    }) => productsApi.approve(id, finalSellingPrice, printed),
    onSuccess: (response) => {
      syncProduct(response.data);
      toast.success('Product approved');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      productsApi.reject(id, reason),
    onSuccess: (response) => {
      syncProduct(response.data);
      toast.success('Product rejected');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updatePrinted = useMutation({
    mutationFn: ({ id, printed }: { id: string; printed: boolean }) =>
      productsApi.updatePrinted(id, printed),
    onSuccess: (response) => {
      syncProduct(response.data);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateFinalPrice = useMutation({
    mutationFn: ({ id, finalSellingPrice }: { id: string; finalSellingPrice: number }) =>
      productsApi.updateFinalPrice(id, finalSellingPrice),
    onSuccess: (response) => {
      syncProduct(response.data);
      toast.success('Final price updated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return {
    create,
    update,
    applyCosting,
    approve,
    reject,
    updatePrinted,
    updateFinalPrice,
  };
}
