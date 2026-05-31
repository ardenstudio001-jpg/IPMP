'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/lib/api/types';
import { useProducts, useProductMutations } from '@/hooks/queries/use-products';
import { productsApi } from '@/lib/api/endpoints';
import {
  invalidateProductStats,
  upsertProductInAllListCaches,
} from '@/lib/products/product-cache';

export type SpreadsheetRow = Product & {
  _clientRowId: string;
  _isDraft?: boolean;
  _persisted?: boolean;
  _creating?: boolean;
};

export function createEmptyDraftRow(): SpreadsheetRow {
  const clientRowId = `temp-${crypto.randomUUID()}`;
  return {
    id: clientRowId,
    _clientRowId: clientRowId,
    name: '',
    quantity: 1,
    unit: '',
    sku: null,
    status: 'PENDING_COSTING',
    unitCostPrice: null,
    totalCostPrice: null,
    oldSellingPrice: null,
    investmentFund: null,
    operationProfit: null,
    netProfit: null,
    payrollFund: null,
    otherCosts: null,
    grossProfit: null,
    priceBeforeTax: null,
    minimum4Percent: null,
    minimum20Percent: null,
    finalSellingPrice: null,
    printed: false,
    createdById: '',
    approvedById: null,
    costingCompletedById: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _isDraft: true,
    _persisted: false,
    _creating: false,
  };
}

function canPersistDraft(row: SpreadsheetRow): boolean {
  return Boolean(row.sku?.trim() && row.name?.trim());
}

function shouldPersistDraft(row: SpreadsheetRow, field: string): boolean {
  if (!canPersistDraft(row)) return false;
  if (field === 'name' && row.sku?.trim()) return true;
  if (field === 'sku' && row.name?.trim()) return true;
  return false;
}

function buildCreatePayload(row: SpreadsheetRow) {
  return {
    name: row.name.trim(),
    quantity: Number(row.quantity) || 1,
    unit: row.unit?.trim() || 'pcs',
    sku: row.sku?.trim() || undefined,
    oldSellingPrice: row.oldSellingPrice
      ? parseFloat(String(row.oldSellingPrice))
      : undefined,
  };
}

function buildFollowUpUpdate(
  row: SpreadsheetRow,
  created: Product,
): Parameters<typeof productsApi.update>[1] | null {
  const payload: Parameters<typeof productsApi.update>[1] = {};

  if (row.unit?.trim() && row.unit.trim() !== 'pcs' && row.unit.trim() !== created.unit) {
    payload.unit = row.unit.trim();
  }
  if (Number(row.quantity) > 0 && Number(row.quantity) !== created.quantity) {
    payload.quantity = Number(row.quantity);
  }
  if (row.oldSellingPrice) {
    const price = parseFloat(String(row.oldSellingPrice));
    if (!Number.isNaN(price) && String(created.oldSellingPrice ?? '') !== String(price)) {
      payload.oldSellingPrice = price;
    }
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function buildUpdatePayload(field: string, newValue: unknown): Record<string, unknown> {
  if (field === 'oldSellingPrice' || field === 'unitCostPrice') {
    return { [field]: parseFloat(String(newValue)) || 0 };
  }
  if (field === 'quantity') {
    return { quantity: parseInt(String(newValue), 10) };
  }
  return { [field]: newValue };
}

function dedupeRowsByClientId(rows: SpreadsheetRow[]): SpreadsheetRow[] {
  const seen = new Set<string>();
  const result: SpreadsheetRow[] = [];

  for (const row of rows) {
    const id = row._clientRowId ?? row.id;
    if (seen.has(id)) {
      if (!row._isDraft) {
        const idx = result.findIndex((r) => (r._clientRowId ?? r.id) === id);
        if (idx >= 0) result[idx] = row;
      }
      continue;
    }
    seen.add(id);
    result.push(row);
  }

  return result;
}

export interface UseProductSpreadsheetOptions {
  onPersistedCellChange?: (
    event: CellValueChangedEvent<SpreadsheetRow>,
    row: SpreadsheetRow,
  ) => boolean | void;
}

export function useProductSpreadsheet(options: UseProductSpreadsheetOptions = {}) {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useProducts();
  const { create, update } = useProductMutations();
  const [draftRows, setDraftRows] = useState<SpreadsheetRow[]>([]);
  const clientRowIdRef = useRef(new Map<string, string>());
  const creatingRef = useRef(new Set<string>());

  const rows = useMemo(() => {
    const serverRows: SpreadsheetRow[] = (data?.data ?? []).map((product) => ({
      ...product,
      _clientRowId: clientRowIdRef.current.get(product.id) ?? product.id,
    }));

    const activeDrafts = draftRows.filter((draft) => !draft._persisted);
    return dedupeRowsByClientId([...activeDrafts, ...serverRows]);
  }, [data, draftRows]);

  const getRowId = useCallback((row: SpreadsheetRow) => {
    return row._clientRowId ?? clientRowIdRef.current.get(row.id) ?? row.id;
  }, []);

  const persistDraft = useCallback(
    async (row: SpreadsheetRow) => {
      if (!canPersistDraft(row) || row._creating || row._persisted) return;
      if (creatingRef.current.has(row._clientRowId)) return;

      creatingRef.current.add(row._clientRowId);
      setDraftRows((prev) =>
        prev.map((d) =>
          d._clientRowId === row._clientRowId ? { ...d, _creating: true } : d,
        ),
      );

      try {
        const { data: created } = await create.mutateAsync(buildCreatePayload(row));
        clientRowIdRef.current.set(created.id, row._clientRowId);
        setDraftRows((prev) => prev.filter((d) => d._clientRowId !== row._clientRowId));
        upsertProductInAllListCaches(qc, created);
        invalidateProductStats(qc);

        const followUp = buildFollowUpUpdate(row, created);
        if (followUp) {
          await update.mutateAsync({ id: created.id, data: followUp });
        }
      } catch {
        setDraftRows((prev) =>
          prev.map((d) =>
            d._clientRowId === row._clientRowId ? { ...d, _creating: false } : d,
          ),
        );
      } finally {
        creatingRef.current.delete(row._clientRowId);
      }
    },
    [create, qc, update],
  );

  const handleAddRow = useCallback(() => {
    setDraftRows((prev) => [createEmptyDraftRow(), ...prev]);
  }, []);

  const handleCellChange = useCallback(
    async (event: CellValueChangedEvent<SpreadsheetRow>) => {
      const row = event.data;
      if (!row) return;
      const field = event.colDef.field;
      if (!field) return;

      const isDraft = row._isDraft && !row._persisted;

      if (isDraft) {
        if (row._creating || creatingRef.current.has(row._clientRowId)) return;

        if (shouldPersistDraft(row, field)) {
          await persistDraft(row);
        }
        return;
      }

      if (options.onPersistedCellChange?.(event, row)) {
        return;
      }

      update.mutate({
        id: row.id,
        data: buildUpdatePayload(field, event.newValue) as Parameters<
          typeof update.mutate
        >[0]['data'],
      });
    },
    [options, persistDraft, update],
  );

  return {
    rows,
    isLoading,
    isError,
    error,
    handleAddRow,
    handleCellChange,
    getRowId,
  };
}
