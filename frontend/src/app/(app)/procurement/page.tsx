'use client';

import { useCallback, useMemo } from 'react';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { AppShell } from '@/components/layout/app-shell';
import { SpreadsheetGrid } from '@/components/grid/spreadsheet-grid';
import { buildProcurementColumns } from '@/components/grid/product-columns';
import { ProductsLoadError } from '@/components/shared/products-load-error';
import { useProducts, useProductMutations } from '@/hooks/queries/use-products';
import type { Product } from '@/lib/api/types';

export default function ProcurementPage() {
  const pendingQuery = useProducts({ status: 'PENDING_COSTING' });
  const allProductsQuery = useProducts();
  const { applyCosting } = useProductMutations();

  const rows = useMemo(() => {
    const pending = pendingQuery.data?.data ?? [];
    const recent = (allProductsQuery.data?.data ?? []).filter(
      (p) => p.status === 'COSTING_COMPLETED',
    );
    const map = new Map<string, Product>();
    [...pending, ...recent].forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [pendingQuery.data, allProductsQuery.data]);

  const columnDefs = useMemo(() => buildProcurementColumns(), []);

  const loadError = pendingQuery.error ?? allProductsQuery.error;
  const isLoadError = pendingQuery.isError || allProductsQuery.isError;

  const handleCellChange = useCallback(
    (event: CellValueChangedEvent<Product>) => {
      const row = event.data;
      if (!row || event.colDef.field !== 'unitCostPrice') return;

      const raw = event.newValue;
      if (raw === null || raw === undefined || raw === '') return;
      if (event.oldValue === event.newValue) return;

      const value = parseFloat(String(raw));
      if (Number.isNaN(value) || value < 0) return;
      applyCosting.mutate({ id: row.id, unitCostPrice: value });
    },
    [applyCosting],
  );

  return (
    <AppShell title="Procurement Spreadsheet" allowedRoles={['PROCUREMENT']}>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Costing operations. Only Unit Cost Price is editable.
        </p>
      </div>
      {isLoadError && loadError ? <ProductsLoadError error={loadError} /> : null}
      <SpreadsheetGrid
        rowData={rows}
        columnDefs={columnDefs}
        loading={pendingQuery.isLoading || allProductsQuery.isLoading}
        onCellValueChanged={handleCellChange}
        quickFilterPlaceholder="Search inventory..."
        emptyMessage="No products awaiting costing. New inventory items appear here when created."
      />
    </AppShell>
  );
}
