'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { AppShell } from '@/components/layout/app-shell';
import { SpreadsheetGrid } from '@/components/grid/spreadsheet-grid';
import { buildAdminColumns } from '@/components/grid/product-columns';
import { useProductMutations } from '@/hooks/queries/use-products';
import type { Product } from '@/lib/api/types';
import { WorkflowPipeline } from '@/components/shared/workflow-pipeline';
import { ApprovalPanel } from '@/components/grid/approval-panel';
import { ProductsLoadError } from '@/components/shared/products-load-error';
import {
  useProductSpreadsheet,
  type SpreadsheetRow,
} from '@/hooks/use-product-spreadsheet';

export default function WorkspacePage() {
  const { approve, reject, updatePrinted, updateFinalPrice } = useProductMutations();
  const [selected, setSelected] = useState<Product | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleApprove = useCallback(
    (product: Product) => {
      const finalPrice = parseFloat(
        product.finalSellingPrice ?? product.minimum20Percent ?? '0',
      );
      approve.mutate({
        id: product.id,
        finalSellingPrice: finalPrice,
        printed: product.printed,
      });
    },
    [approve],
  );

  const handleReject = useCallback(
    (product: Product) => {
      reject.mutate({ id: product.id });
    },
    [reject],
  );

  const columnDefs = useMemo(
    () =>
      buildAdminColumns(
        (p) => {
          setSelected(p);
          setPanelOpen(true);
        },
        handleReject,
      ),
    [handleReject],
  );

  const onPersistedCellChange = useCallback(
    (event: CellValueChangedEvent<SpreadsheetRow>, row: SpreadsheetRow) => {
      const field = event.colDef.field;
      if (!field) return false;

      if (field === 'printed') {
        updatePrinted.mutate({ id: row.id, printed: !!event.newValue });
        return true;
      }

      if (field === 'finalSellingPrice' && row.status === 'APPROVED') {
        updateFinalPrice.mutate({
          id: row.id,
          finalSellingPrice: parseFloat(String(event.newValue)) || 0,
        });
        setSelected(row);
        return true;
      }

      setSelected(row);
      return false;
    },
    [updateFinalPrice, updatePrinted],
  );

  const { rows, isLoading, isError, error, handleAddRow, handleCellChange, getRowId } =
    useProductSpreadsheet({ onPersistedCellChange });

  return (
    <AppShell title="Admin Workspace" allowedRoles={['ADMIN']}>
      <WorkflowPipeline />
      <div className="mb-4 mt-4">
        <p className="text-sm text-muted-foreground">
          Unified spreadsheet — manage products, costing, approvals, and pricing inline. New rows
          save when you finish entering both SKU and product name.
        </p>
      </div>
      {isError && error ? <ProductsLoadError error={error} /> : null}
      <SpreadsheetGrid
        rowData={rows}
        columnDefs={columnDefs}
        loading={isLoading}
        onAddRow={handleAddRow}
        onCellValueChanged={handleCellChange}
        getRowId={getRowId}
      />
      <ApprovalPanel
        product={selected}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onApprove={handleApprove}
      />
    </AppShell>
  );
}
