'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, ListItem, ListType, ProcurementType } from '@/lib/api/types';
import { useList } from '@/hooks/queries/use-lists';
import { useListItemMutations } from '@/hooks/queries/use-list-items';
import { useCategories } from '@/hooks/queries/use-categories';
import { listsApi, listItemsApi, productsApi } from '@/lib/api/endpoints';
import { upsertListItemInDetailCache } from '@/lib/lists/list-cache';
import { generateSkuCandidate } from '@/lib/products/sku';
import { getErrorMessage } from '@/lib/api/client';
import type { ListItemGridRow } from '@/components/grid/list-item-columns';
import axios from 'axios';

function createEmptyDraftRow(categories: Category[]): ListItemGridRow {
  const clientRowId = `temp-${crypto.randomUUID()}`;
  const defaultCategory = categories[0];
  return {
    id: clientRowId,
    _clientRowId: clientRowId,
    _isDraft: true,
    listId: '',
    productId: '',
    quantity: 1,
    costPrice: null,
    regularPrice: null,
    salesPrice: null,
    minimum20: null,
    minimum4: null,
    finalSellingPrice: null,
    status: 'ACTIVE',
    parentItemId: null,
    removedAt: null,
    removedById: null,
    createdAt: new Date().toISOString(),
    sources: [],
    requestedBy: [],
    stockOwner: [],
    product: {
      id: '',
      sku: generateSkuCandidate(),
      name: '',
      imageUrl: null,
      categoryId: defaultCategory?.id ?? '',
      procurementType: 'STANDARD',
      productDetails: null,
      description: null,
      unit: 'pcs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: defaultCategory,
    },
  };
}

function canPersistDraft(row: ListItemGridRow, categories: Category[]): boolean {
  return Boolean(
    row.product?.name?.trim() &&
      row.product?.categoryId &&
      categories.some((c) => c.id === row.product.categoryId) &&
      row.product?.procurementType &&
      row.product?.unit?.trim() &&
      Number(row.quantity) >= 1,
  );
}

function parsePrice(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? undefined : n;
}

export interface UseListItemSpreadsheetOptions {
  listId: string;
  listType: ListType;
  canEdit: boolean;
  includeRemoved?: boolean;
}

export function useListItemSpreadsheet({
  listId,
  listType,
  canEdit,
  includeRemoved = false,
}: UseListItemSpreadsheetOptions) {
  const qc = useQueryClient();
  const { data: list, isLoading, isError, error } = useList(listId, includeRemoved);
  const { data: categories = [] } = useCategories();
  const { add, update } = useListItemMutations(listId);
  const [draftRows, setDraftRows] = useState<ListItemGridRow[]>([]);
  const creatingRef = useRef(new Set<string>());

  const rows = useMemo(() => {
    const serverRows: ListItemGridRow[] = (list?.items ?? []).map((item) => ({
      ...item,
      _clientRowId: item.id,
    }));
    const activeDrafts = draftRows.filter((d) => d._isDraft);
    return [...activeDrafts, ...serverRows];
  }, [list?.items, draftRows]);

  const getRowId = useCallback((row: ListItemGridRow) => row._clientRowId ?? row.id, []);

  const persistDraft = useCallback(
    async (row: ListItemGridRow) => {
      if (!canPersistDraft(row, categories) || creatingRef.current.has(row._clientRowId!)) {
        return;
      }
      const clientId = row._clientRowId!;
      creatingRef.current.add(clientId);

      const payload = {
        name: row.product.name.trim(),
        categoryId: row.product.categoryId,
        procurementType: row.product.procurementType,
        unit: row.product.unit.trim() || 'pcs',
        quantity: Number(row.quantity) || 1,
        sku: row.product.sku?.trim() || undefined,
        imageUrl: row.product.imageUrl ?? undefined,
        productDetails: row.product.productDetails ?? undefined,
        description: row.product.description ?? undefined,
        costPrice: parsePrice(row.costPrice),
        regularPrice: parsePrice(row.regularPrice),
        salesPrice: parsePrice(row.salesPrice),
        finalSellingPrice: parsePrice(row.finalSellingPrice),
        sources: row.sources,
        requestedBy: row.requestedBy,
        stockOwner: row.stockOwner,
      };

      try {
        const { data: created } = await add.mutateAsync(payload);
        setDraftRows((prev) => prev.filter((d) => d._clientRowId !== clientId));
        upsertListItemInDetailCache(qc, listId, created);
      } catch (err) {
        const message = getErrorMessage(err);
        const isSkuConflict =
          axios.isAxiosError(err) &&
          err.response?.status === 409 &&
          message.toLowerCase().includes('sku');

        if (isSkuConflict && row.product) {
          const retried = {
            ...row,
            product: { ...row.product, sku: generateSkuCandidate() },
          };
          setDraftRows((prev) =>
            prev.map((d) => (d._clientRowId === clientId ? retried : d)),
          );
          creatingRef.current.delete(clientId);
          await persistDraft(retried);
          return;
        }
      } finally {
        creatingRef.current.delete(clientId);
      }
    },
    [add, categories, listId, qc],
  );

  const handleAddRow = useCallback(() => {
    if (!canEdit || listType !== 'PROCUREMENT') return;
    setDraftRows((prev) => [createEmptyDraftRow(categories), ...prev]);
  }, [canEdit, categories, listType]);

  const patchListItem = useCallback(
    async (row: ListItemGridRow, field: string, newValue: unknown) => {
      const itemPatch: Parameters<typeof listItemsApi.update>[1] = {};
      const productPatch: Parameters<typeof productsApi.update>[1] = {};

      if (field === 'quantity') {
        itemPatch.quantity = parseInt(String(newValue), 10) || 1;
      } else if (
        field === 'costPrice' ||
        field === 'regularPrice' ||
        field === 'salesPrice' ||
        field === 'finalSellingPrice'
      ) {
        const key = field as keyof typeof itemPatch;
        const price = parsePrice(newValue);
        if (price !== undefined) (itemPatch as Record<string, number>)[key] = price;
      } else if (field === 'sources' || field === 'requestedBy' || field === 'stockOwner') {
        (itemPatch as Record<string, string[]>)[field] = newValue as string[];
      } else if (field.startsWith('product.')) {
        const productField = field.replace('product.', '') as keyof typeof productPatch;
        (productPatch as Record<string, unknown>)[productField] = newValue;
      } else if (
        field === 'product.sku' ||
        field === 'product.name' ||
        field === 'product.imageUrl' ||
        field === 'product.productDetails' ||
        field === 'product.description' ||
        field === 'product.unit'
      ) {
        const key = field.split('.')[1] as keyof typeof productPatch;
        (productPatch as Record<string, unknown>)[key] = newValue;
      } else if (field === 'product.category') {
        const cat = categories.find((c) => c.name === newValue);
        if (cat) productPatch.categoryId = cat.id;
      } else if (field === 'product.procurementType') {
        productPatch.procurementType = newValue as ProcurementType;
      }

      if (Object.keys(productPatch).length > 0 && row.productId) {
        await productsApi.update(row.productId, productPatch);
      }
      if (Object.keys(itemPatch).length > 0) {
        const { data } = await update.mutateAsync({ id: row.id, data: itemPatch });
        return data;
      }
      if (Object.keys(productPatch).length > 0) {
        const { data: listData } = await listsApi.get(listId);
        const refreshed = listData.items.find((i) => i.id === row.id);
        if (refreshed) upsertListItemInDetailCache(qc, listId, refreshed);
      }
      return row;
    },
    [categories, listId, qc, update],
  );

  const handleCellChange = useCallback(
    async (event: CellValueChangedEvent<ListItemGridRow>) => {
      const row = event.data;
      if (!row || !canEdit) return;
      const field = event.colDef.field ?? event.colDef.colId;
      if (!field) return;

      let newValue = event.newValue;
      if (field === 'sources' || field === 'requestedBy' || field === 'stockOwner') {
        newValue = row[field] ?? newValue;
      }

      if (row._isDraft) {
        if (canPersistDraft(row, categories)) {
          await persistDraft(row);
        }
        return;
      }

      try {
        await patchListItem(row, field, newValue);
      } catch {
        event.api.refreshCells({ rowNodes: [event.node], force: true });
      }
    },
    [canEdit, categories, patchListItem, persistDraft],
  );

  return {
    list,
    rows,
    categories,
    isLoading,
    isError,
    error,
    handleAddRow,
    handleCellChange,
    getRowId,
    canAddRow: canEdit && listType === 'PROCUREMENT',
  };
}
