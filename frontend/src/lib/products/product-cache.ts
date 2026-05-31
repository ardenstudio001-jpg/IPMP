import type { QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, Product } from '@/lib/api/types';
import { productKeys } from '@/hooks/queries/use-products';

type ListQueryParams = { status?: string; search?: string; page?: number; limit?: number };

function matchesListFilter(product: Product, params?: ListQueryParams): boolean {
  if (params?.status && product.status !== params.status) {
    return false;
  }
  if (params?.search) {
    const term = params.search.toLowerCase();
    const inName = product.name.toLowerCase().includes(term);
    const inSku = product.sku?.toLowerCase().includes(term) ?? false;
    if (!inName && !inSku) return false;
  }
  return true;
}

function upsertIntoList(
  old: PaginatedResponse<Product>,
  product: Product,
  params?: ListQueryParams,
): PaginatedResponse<Product> {
  const existingIdx = old.data.findIndex((p) => p.id === product.id);
  const matches = matchesListFilter(product, params);

  if (!matches) {
    if (existingIdx < 0) return old;
    return {
      ...old,
      data: old.data.filter((p) => p.id !== product.id),
      meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) },
    };
  }

  if (existingIdx >= 0) {
    return {
      ...old,
      data: old.data.map((p) => (p.id === product.id ? { ...p, ...product } : p)),
    };
  }

  return {
    ...old,
    data: [product, ...old.data],
    meta: { ...old.meta, total: old.meta.total + 1 },
  };
}

export function upsertProductInAllListCaches(qc: QueryClient, product: Product) {
  const queries = qc.getQueriesData<PaginatedResponse<Product>>({
    queryKey: productKeys.all,
  });

  for (const [queryKey, old] of queries) {
    if (!old?.data) continue;
    const params = queryKey[2] as ListQueryParams | undefined;
    qc.setQueryData(queryKey, upsertIntoList(old, product, params));
  }
}

export function invalidateProductStats(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: productKeys.stats });
}
