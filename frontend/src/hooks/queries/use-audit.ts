'use client';

import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api/endpoints';

export const auditKeys = {
  all: ['audit'] as const,
  list: (params?: Record<string, unknown>) => ['audit', 'list', params] as const,
};

export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  userId?: string;
  search?: string;
}) {
  const search = params?.search?.trim() || undefined;

  return useQuery({
    queryKey: auditKeys.list({ ...params, search }),
    queryFn: async () => {
      const { data } = await auditApi.list({
        ...params,
        search,
      });
      return data;
    },
  });
}
