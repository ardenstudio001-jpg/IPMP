'use client';

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridReadyEvent,
  type CellValueChangedEvent,
  type SelectionChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Search, Columns3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

const ipmpTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f8fafb',
  oddRowBackgroundColor: '#fafbfc',
  rowHoverColor: 'rgba(15, 171, 187, 0.06)',
  selectedRowBackgroundColor: 'rgba(15, 171, 187, 0.1)',
  rangeSelectionBorderColor: '#0fabbb',
  accentColor: '#0fabbb',
  fontFamily: 'inherit',
  fontSize: 13,
  columnBorder: { color: '#eef0f2' },
  wrapperBorder: { color: '#eef0f2' },
});

export interface SpreadsheetGridProps<T extends { id: string }> {
  rowData: T[];
  columnDefs: ColDef[];
  loading?: boolean;
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void | Promise<void>;
  onAddRow?: () => void;
  addRowLabel?: string;
  height?: string;
  className?: string;
  quickFilterPlaceholder?: string;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  enableRowSelection?: boolean;
  toolbarExtra?: React.ReactNode;
  onSelectionChanged?: (event: SelectionChangedEvent<T>) => void;
}

export function SpreadsheetGrid<T extends { id: string }>({
  rowData,
  columnDefs,
  loading,
  onCellValueChanged,
  onAddRow,
  addRowLabel = 'Add Row',
  height = 'calc(100vh - 220px)',
  className,
  quickFilterPlaceholder = 'Search...',
  getRowId,
  emptyMessage = 'No products yet. Click Add Row to create your first product.',
  enableRowSelection = true,
  toolbarExtra,
  onSelectionChanged,
}: SpreadsheetGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
    }),
    [],
  );

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit();
  }, []);

  const resolveRowId = useCallback(
    (params: { data: T }) => {
      if (!params.data) return '';
      return getRowId?.(params.data) ?? params.data.id;
    },
    [getRowId],
  );

  const toggleColumn = (field: string, visible: boolean) => {
    setHiddenCols((prev) => ({ ...prev, [field]: !visible }));
    gridRef.current?.api.setColumnsVisible([field], visible);
  };

  const colFields = columnDefs
    .map((c) => c.field)
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={quickFilterPlaceholder}
            value={quickFilter}
            onChange={(e) => {
              setQuickFilter(e.target.value);
              gridRef.current?.api.setGridOption('quickFilterText', e.target.value);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          {onAddRow && (
            <Button size="sm" onClick={onAddRow}>
              <Plus className="h-4 w-4" />
              {addRowLabel}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => gridRef.current?.api.exportDataAsCsv()}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {colFields.map((field) => (
                <DropdownMenuCheckboxItem
                  key={field}
                  checked={!hiddenCols[field]}
                  onCheckedChange={(checked) => toggleColumn(field, !!checked)}
                >
                  {field}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="spreadsheet-container relative rounded-xl border border-border shadow-sm">
        {rowData.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <p className="max-w-sm text-center text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
        <div style={{ height, width: '100%' }}>
          <AgGridReact<T>
            ref={gridRef}
            theme={ipmpTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            singleClickEdit
            stopEditingWhenCellsLoseFocus
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
            rowSelection={
              enableRowSelection
                ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true }
                : undefined
            }
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
            onSelectionChanged={onSelectionChanged}
            getRowId={resolveRowId}
            suppressScrollOnNewData
            suppressMovableColumns={false}
            enableCellTextSelection
            ensureDomOrder
          />
        </div>
      </div>
    </div>
  );
}
