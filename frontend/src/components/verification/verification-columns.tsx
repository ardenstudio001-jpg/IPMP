'use client';

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { InventoryVerification, ListItem } from '@/lib/api/types';
import { VerificationStatusBadge, ListItemStatusBadge } from '@/components/shared/status-badge';
import { currencyFormatter } from '@/components/grid/product-columns';

export type VerificationGridRow = ListItem & {
  _verification?: InventoryVerification | null;
  _actualQuantity?: number;
  _notes?: string;
};

function imageCellRenderer(params: ICellRendererParams<VerificationGridRow>) {
  const url = params.data?.product?.imageUrl;
  if (!url) return <span className="text-muted-foreground">—</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-8 w-8 rounded object-cover" />
  );
}

export function buildVerificationColumns(
  canEdit: boolean,
): ColDef<VerificationGridRow>[] {
  return [
    {
      field: 'product.name',
      headerName: 'Product Name',
      pinned: 'left',
      flex: 1,
      minWidth: 160,
      editable: canEdit,
      valueGetter: (p) => p.data?.product?.name ?? '',
      valueSetter: (p) => {
        if (!p.data?.product) return false;
        p.data.product.name = String(p.newValue ?? '');
        return true;
      },
    },
    {
      field: 'quantity',
      headerName: 'Expected Quantity',
      width: 140,
      editable: false,
    },
    {
      colId: 'actualQuantity',
      headerName: 'Actual Quantity',
      width: 130,
      editable: canEdit,
      valueGetter: (p) =>
        p.data?._actualQuantity ??
        p.data?._verification?.actualQuantity ??
        p.data?.quantity ??
        0,
      valueSetter: (p) => {
        if (!p.data) return false;
        p.data._actualQuantity = parseInt(String(p.newValue), 10) || 0;
        return true;
      },
    },
    {
      colId: 'product.imageUrl',
      headerName: 'Image',
      width: 100,
      editable: canEdit,
      cellRenderer: imageCellRenderer,
      valueGetter: (p) => p.data?.product?.imageUrl ?? '',
      valueSetter: (p) => {
        if (!p.data?.product) return false;
        p.data.product.imageUrl = (p.newValue as string) || null;
        return true;
      },
    },
    {
      colId: 'product.productDetails',
      headerName: 'Product Details',
      width: 160,
      editable: canEdit,
      valueGetter: (p) => p.data?.product?.productDetails ?? '',
      valueSetter: (p) => {
        if (!p.data?.product) return false;
        p.data.product.productDetails = (p.newValue as string) || null;
        return true;
      },
    },
    {
      colId: 'verificationStatus',
      headerName: 'Verification Status',
      width: 150,
      editable: false,
      valueGetter: (p) => p.data?._verification?.status ?? 'PENDING',
      cellRenderer: (p: ICellRendererParams<VerificationGridRow>) => {
        const status = p.data?._verification?.status;
        if (status) {
          return <VerificationStatusBadge status={status} />;
        }
        return <ListItemStatusBadge status={p.data?.status ?? 'ACTIVE'} />;
      },
    },
    {
      colId: 'notes',
      headerName: 'Notes',
      width: 180,
      editable: canEdit,
      valueGetter: (p) => p.data?._notes ?? p.data?._verification?.notes ?? '',
      valueSetter: (p) => {
        if (!p.data) return false;
        p.data._notes = String(p.newValue ?? '');
        return true;
      },
    },
    {
      colId: 'product.description',
      headerName: 'Description',
      width: 160,
      hide: true,
      editable: canEdit,
      valueGetter: (p) => p.data?.product?.description ?? '',
      valueSetter: (p) => {
        if (!p.data?.product) return false;
        p.data.product.description = (p.newValue as string) || null;
        return true;
      },
    },
    {
      colId: 'product.unit',
      headerName: 'Unit',
      width: 90,
      hide: true,
      editable: false,
      valueGetter: (p) => p.data?.product?.unit ?? '',
    },
    {
      field: 'costPrice',
      headerName: 'Cost Price',
      width: 120,
      hide: true,
      editable: false,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'regularPrice',
      headerName: 'Regular Price',
      width: 120,
      hide: true,
      editable: false,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'salesPrice',
      headerName: 'Sales Price',
      width: 120,
      hide: true,
      editable: false,
      valueFormatter: currencyFormatter,
    },
  ];
}
