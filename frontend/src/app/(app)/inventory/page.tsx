'use client';

import { useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SpreadsheetGrid } from '@/components/grid/spreadsheet-grid';
import { buildInventoryColumns } from '@/components/grid/product-columns';
import { ProductsLoadError } from '@/components/shared/products-load-error';
import { useProductSpreadsheet } from '@/hooks/use-product-spreadsheet';

export default function InventoryPage() {
  const { rows, isLoading, isError, error, handleAddRow, handleCellChange, getRowId } =
    useProductSpreadsheet();

  const columnDefs = useMemo(() => buildInventoryColumns(), []);

  return (
    <AppShell title="Inventory Spreadsheet" allowedRoles={['INVENTORY']}>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Product creation and inventory data entry. A row is saved when you finish entering both
          SKU and product name.
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
    </AppShell>
  );
}
