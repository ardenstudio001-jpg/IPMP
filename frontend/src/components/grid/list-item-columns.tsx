'use client';

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { Category, ListItem, ListType, ProcurementType } from '@/lib/api/types';
import { PROCUREMENT_TYPE_LABELS } from '@/lib/api/types';
import { ListItemStatusBadge } from '@/components/shared/status-badge';
import { currencyFormatter, dateFormatter } from '@/components/grid/product-columns';
import {
  PartyTagsCellEditor,
  PartyTagsCellRenderer,
} from '@/components/grid/cells/party-tags-cell';

export type ListItemGridRow = ListItem & {
  _clientRowId?: string;
  _isDraft?: boolean;
};

function productField(field: keyof ListItem['product']) {
  return {
    valueGetter: (p: { data?: ListItemGridRow }) => p.data?.product?.[field],
    valueSetter: (p: { data?: ListItemGridRow; newValue: unknown }) => {
      if (!p.data?.product) return false;
      (p.data.product as unknown as Record<string, unknown>)[field] = p.newValue;
      return true;
    },
  };
}

function imageCellRenderer(params: ICellRendererParams<ListItemGridRow>) {
  const url = params.data?.product?.imageUrl;
  if (!url) return <span className="text-muted-foreground">—</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-8 w-8 rounded object-cover" />
  );
}

export interface BuildListItemColumnsOptions {
  listType: ListType;
  categories: Category[];
  editable: boolean;
}

export function buildListItemColumns({
  listType,
  categories,
  editable,
}: BuildListItemColumnsOptions): ColDef<ListItemGridRow>[] {
  const canEdit = editable;
  const categoryNames = categories.map((c) => c.name);
  const categoryIds = categories.map((c) => c.id);
  const procurementTypes = Object.keys(PROCUREMENT_TYPE_LABELS) as ProcurementType[];

  const partyField =
    listType === 'ACQUIRED' ? 'stockOwner' : 'requestedBy';
  const partyHeader = listType === 'ACQUIRED' ? 'Stock Owner' : 'Requested By';

  return [
    {
      field: 'product.sku',
      headerName: 'SKU',
      pinned: 'left',
      width: 120,
      editable: canEdit,
      ...productField('sku'),
    },
    {
      field: 'product.name',
      headerName: 'Product Name',
      pinned: 'left',
      flex: 1,
      minWidth: 160,
      editable: canEdit,
      ...productField('name'),
    },
    {
      colId: 'product.imageUrl',
      headerName: 'Product Image',
      width: 100,
      editable: canEdit,
      cellRenderer: imageCellRenderer,
      ...productField('imageUrl'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      editable: false,
      cellRenderer: (p: ICellRendererParams<ListItemGridRow>) =>
        p.value ? <ListItemStatusBadge status={p.value} /> : null,
    },
    {
      field: partyField,
      headerName: partyHeader,
      width: 200,
      editable: canEdit,
      cellRenderer: PartyTagsCellRenderer,
      cellEditor: PartyTagsCellEditor,
    },
    {
      field: 'sources',
      headerName: 'Sources',
      width: 200,
      editable: canEdit,
      cellRenderer: PartyTagsCellRenderer,
      cellEditor: PartyTagsCellEditor,
    },
    {
      colId: 'product.category',
      headerName: 'Product Category',
      width: 150,
      editable: canEdit,
      valueGetter: (p) => p.data?.product?.category?.name ?? '',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: categoryNames.length ? categoryNames : ['—'],
      },
      valueSetter: (p) => {
        if (!p.data?.product) return false;
        const idx = categoryNames.indexOf(String(p.newValue));
        if (idx >= 0) {
          p.data.product.categoryId = categoryIds[idx]!;
          p.data.product.category = categories[idx];
        }
        return true;
      },
    },
    {
      colId: 'product.procurementType',
      headerName: 'Procurement Type',
      width: 140,
      editable: canEdit,
      valueGetter: (p) => p.data?.product?.procurementType ?? '',
      valueFormatter: (p) =>
        PROCUREMENT_TYPE_LABELS[p.value as ProcurementType] ?? p.value,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: procurementTypes },
      valueSetter: (p) => {
        if (!p.data?.product) return false;
        p.data.product.procurementType = p.newValue as ProcurementType;
        return true;
      },
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      editable: canEdit,
    },
    {
      field: 'costPrice',
      headerName: 'Cost Price',
      width: 120,
      editable: canEdit,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'regularPrice',
      headerName: 'Regular Price',
      width: 120,
      editable: canEdit,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'salesPrice',
      headerName: 'Sales Price',
      width: 120,
      editable: canEdit,
      valueFormatter: currencyFormatter,
    },
    {
      colId: 'product.productDetails',
      headerName: 'Product Details',
      width: 160,
      editable: canEdit,
      ...productField('productDetails'),
    },
    {
      colId: 'product.description',
      headerName: 'Product Description',
      width: 180,
      editable: canEdit,
      ...productField('description'),
    },
    {
      colId: 'product.unit',
      headerName: 'Unit',
      width: 90,
      editable: canEdit,
      ...productField('unit'),
    },
    {
      field: 'minimum20',
      headerName: 'Minimum 20%',
      width: 120,
      editable: false,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'minimum4',
      headerName: 'Minimum 4%',
      width: 120,
      editable: false,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'finalSellingPrice',
      headerName: 'Final Selling Price',
      width: 140,
      editable: canEdit,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      editable: false,
      valueFormatter: dateFormatter,
    },
  ];
}
