'use client';

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridReadyEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useMemo, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import type { AuditLog } from '@/lib/api/types';
import {
  formatAuditAction,
  formatAuditEntity,
  getAuditActorEmail,
  getAuditSku,
} from '@/lib/audit/display';

ModuleRegistry.registerModules([AllCommunityModule]);

const ipmpTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f8fafb',
  oddRowBackgroundColor: '#fafbfc',
  rowHoverColor: 'rgba(15, 171, 187, 0.06)',
  accentColor: '#0fabbb',
  fontFamily: 'inherit',
  fontSize: 13,
  columnBorder: { color: '#eef0f2' },
  wrapperBorder: { color: '#eef0f2' },
});

export interface AuditLogGridProps {
  rowData: AuditLog[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
  height?: string;
}

export function AuditLogGrid({
  rowData,
  loading,
  search,
  onSearchChange,
  className,
  height = 'min(70vh, 640px)',
}: AuditLogGridProps) {
  const gridRef = useRef<AgGridReact<AuditLog>>(null);

  const columnDefs = useMemo<ColDef<AuditLog>[]>(
    () => [
      {
        colId: 'user',
        headerName: 'User',
        flex: 1,
        minWidth: 180,
        valueGetter: (params) =>
          params.data ? getAuditActorEmail(params.data) : '',
      },
      {
        field: 'action',
        headerName: 'Action',
        flex: 1,
        minWidth: 160,
        valueFormatter: (params) =>
          params.value ? formatAuditAction(String(params.value)) : '',
      },
      {
        colId: 'entity',
        headerName: 'Entity',
        flex: 1,
        minWidth: 160,
        valueGetter: (params) =>
          params.data ? formatAuditEntity(params.data) : '',
      },
      {
        colId: 'sku',
        headerName: 'SKU',
        width: 140,
        valueGetter: (params) =>
          params.data ? getAuditSku(params.data) ?? '—' : '—',
      },
      {
        field: 'createdAt',
        headerName: 'Timestamp',
        width: 180,
        valueFormatter: (params) =>
          params.value ? formatDate(String(params.value)) : '—',
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    [],
  );

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit();
  }, []);

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search email, action, entity, SKU..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="rounded-xl border border-border shadow-sm">
        <div style={{ height, width: '100%' }}>
          <AgGridReact<AuditLog>
            ref={gridRef}
            theme={ipmpTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={25}
            paginationPageSizeSelector={[25, 50, 100]}
            onGridReady={onGridReady}
            enableCellTextSelection
            ensureDomOrder
          />
        </div>
      </div>
    </div>
  );
}
