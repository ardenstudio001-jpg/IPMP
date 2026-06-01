'use client';

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { Product, ProductStatus } from '@/lib/api/types';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export function statusCellRenderer(params: ICellRendererParams<Product>) {
  if (!params.value) return null;
  return <StatusBadge status={params.value as ProductStatus} />;
}

export function currencyFormatter(params: { value: string | null }) {
  return formatCurrency(params.value);
}

export function dateFormatter(params: { value: string }) {
  return params.value ? formatDate(params.value) : '—';
}

export function buildInventoryColumns(): ColDef<Product>[] {
  return [
    { field: 'sku', headerName: 'SKU', editable: true, pinned: 'left', width: 120 },
    { field: 'name', headerName: 'Product Name', editable: true, flex: 1, minWidth: 160 },
    { field: 'quantity', headerName: 'Quantity', editable: true, width: 110 },
    { field: 'unit', headerName: 'Unit', editable: true, width: 100 },
    {
      field: 'oldSellingPrice',
      headerName: 'Old Selling Price',
      editable: true,
      width: 150,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'finalSellingPrice',
      headerName: 'Final Selling Price',
      editable: false,
      width: 160,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'status',
      headerName: 'Status',
      editable: false,
      width: 160,
      cellRenderer: statusCellRenderer,
    },
    {
      field: 'createdAt',
      headerName: 'Created Date',
      editable: false,
      width: 170,
      valueFormatter: dateFormatter,
    },
  ];
}

export function buildProcurementColumns(): ColDef<Product>[] {
  return [
    { field: 'sku', headerName: 'SKU', editable: false, pinned: 'left', width: 120 },
    { field: 'name', headerName: 'Product Name', editable: false, flex: 1, minWidth: 160 },
    { field: 'quantity', headerName: 'Quantity', editable: false, width: 110 },
    { field: 'unit', headerName: 'Unit', editable: false, width: 100 },
    {
      field: 'oldSellingPrice',
      headerName: 'Old Selling Price',
      editable: false,
      width: 150,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'unitCostPrice',
      headerName: 'Unit Cost Price',
      editable: true,
      width: 150,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'minimum20Percent',
      headerName: 'Min 20%',
      editable: false,
      width: 130,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'minimum4Percent',
      headerName: 'Min 4%',
      editable: false,
      width: 130,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'status',
      headerName: 'Status',
      editable: false,
      width: 160,
      cellRenderer: statusCellRenderer,
    },
  ];
}

export function buildAdminColumns(
  onApprove?: (product: Product) => void,
  onReject?: (product: Product) => void,
): ColDef<Product>[] {
  return [
    { field: 'sku', headerName: 'SKU', editable: true, pinned: 'left', width: 110 },
    { field: 'name', headerName: 'Product Name', editable: true, flex: 1, minWidth: 150 },
    { field: 'quantity', headerName: 'Qty', editable: true, width: 90 },
    { field: 'unit', headerName: 'Unit', editable: true, width: 90 },
    {
      field: 'oldSellingPrice',
      headerName: 'Old Price',
      editable: true,
      width: 120,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'unitCostPrice',
      headerName: 'Unit Cost',
      editable: true,
      width: 120,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'minimum20Percent',
      headerName: 'Min 20%',
      editable: false,
      width: 120,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'minimum4Percent',
      headerName: 'Min 4%',
      editable: false,
      width: 120,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'finalSellingPrice',
      headerName: 'Final Price',
      editable: (params) => params.data?.status === 'APPROVED',
      width: 120,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'printed',
      headerName: 'Printed',
      editable: true,
      width: 100,
      cellEditor: 'agCheckboxCellEditor',
    },
    {
      field: 'status',
      headerName: 'Approval',
      editable: false,
      width: 150,
      cellRenderer: statusCellRenderer,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      editable: false,
      width: 150,
      valueFormatter: dateFormatter,
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      editable: false,
      pinned: 'right',
      width: 180,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const product = params.data;
        if (!product || product.status !== 'COSTING_COMPLETED') return null;
        return (
          <div className="flex h-full items-center gap-1">
            <button
              type="button"
              className="rounded bg-primary px-2 py-0.5 text-xs text-white"
              onClick={() => onApprove?.(product)}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded bg-destructive px-2 py-0.5 text-xs text-white"
              onClick={() => onReject?.(product)}
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];
}
