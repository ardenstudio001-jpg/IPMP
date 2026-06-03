'use client';

import { useCallback, useMemo } from 'react';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { useQueryClient } from '@tanstack/react-query';
import type { InventoryVerification, ListItem } from '@/lib/api/types';
import { useList } from '@/hooks/queries/use-lists';
import { useVerifications, useVerificationMutations } from '@/hooks/queries/use-verifications';
import { listItemsApi, productsApi } from '@/lib/api/endpoints';
import { upsertListItemInDetailCache } from '@/lib/lists/list-cache';
import type { VerificationGridRow } from '@/components/verification/verification-columns';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from 'sonner';

export function useVerificationSpreadsheet(listId: string, canEdit: boolean) {
  const qc = useQueryClient();
  const { data: list, isLoading: listLoading } = useList(listId);
  const { data: verificationsPage, isLoading: verificationsLoading } =
    useVerifications({ listId, limit: 500 });
  const { create, update } = useVerificationMutations();

  const verificationByItemId = useMemo(() => {
    const map = new Map<string, InventoryVerification>();
    for (const v of verificationsPage?.data ?? []) {
      const existing = map.get(v.listItemId);
      if (
        !existing ||
        new Date(v.verifiedAt).getTime() > new Date(existing.verifiedAt).getTime()
      ) {
        map.set(v.listItemId, v);
      }
    }
    return map;
  }, [verificationsPage?.data]);

  const rows: VerificationGridRow[] = useMemo(() => {
    return (list?.items ?? []).map((item) => ({
      ...item,
      _verification: verificationByItemId.get(item.id) ?? null,
      _actualQuantity:
        verificationByItemId.get(item.id)?.actualQuantity ?? item.quantity,
      _notes: verificationByItemId.get(item.id)?.notes ?? '',
    }));
  }, [list?.items, verificationByItemId]);

  const persistProductField = useCallback(
    async (row: VerificationGridRow, field: string, value: unknown) => {
      if (!row.productId) return;
      const key = field.replace('product.', '') as
        | 'name'
        | 'imageUrl'
        | 'productDetails'
        | 'description';
      await productsApi.update(row.productId, { [key]: value });
      const { data: refreshed } = await listItemsApi.get(row.id);
      upsertListItemInDetailCache(qc, listId, refreshed);
    },
    [listId, qc],
  );

  const handleCellChange = useCallback(
    async (event: CellValueChangedEvent<VerificationGridRow>) => {
      const row = event.data;
      if (!row || !canEdit) return;
      const field = event.colDef.field ?? event.colDef.colId;
      if (!field) return;

      if (field.startsWith('product.') || field === 'product.name') {
        try {
          const productField = field.includes('.')
            ? field
            : `product.${field}`;
          await persistProductField(row, productField, event.newValue);
        } catch (e) {
          toast.error(getErrorMessage(e));
          event.api.refreshCells({ rowNodes: [event.node], force: true });
        }
      }
    },
    [canEdit, persistProductField],
  );

  const verifyRow = useCallback(
    async (row: VerificationGridRow) => {
      const expected = row.quantity;
      const actual = row._actualQuantity ?? row.quantity;
      const notes = row._notes?.trim() || undefined;
      const existing = row._verification;

      try {
        if (existing) {
          await update.mutateAsync({
            id: existing.id,
            data: { actualQuantity: actual, notes },
          });
        } else {
          await create.mutateAsync({
            listItemId: row.id,
            expectedQuantity: expected,
            actualQuantity: actual,
            notes,
          });
        }
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    },
    [create, update],
  );

  return {
    list,
    rows,
    isLoading: listLoading || verificationsLoading,
    handleCellChange,
    verifyRow,
    isVerifying: create.isPending || update.isPending,
  };
}
