'use client';

import { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AppShell } from '@/components/layout/app-shell';
import { SpreadsheetGrid } from '@/components/grid/spreadsheet-grid';
import {
  buildVerificationColumns,
  type VerificationGridRow,
} from '@/components/verification/verification-columns';
import { useVerificationSpreadsheet } from '@/hooks/use-verification-spreadsheet';
import { useLists } from '@/hooks/queries/use-lists';
import { useVerifications } from '@/hooks/queries/use-verifications';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationStatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import type { InventoryVerification } from '@/lib/api/types';

export default function VerificationPage() {
  const [selectedListId, setSelectedListId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyLimit = 20;

  const { data: listsData, isLoading: listsLoading } = useLists({
    type: 'ACQUIRED',
    limit: 100,
  });
  const acquiredLists = listsData?.items ?? [];

  const canEdit = true;
  const {
    list,
    rows,
    isLoading,
    handleCellChange,
    verifyRow,
    isVerifying,
  } = useVerificationSpreadsheet(selectedListId, canEdit);

  const { data: historyData, isLoading: historyLoading } = useVerifications({
    listId: selectedListId || undefined,
    page: historyPage,
    limit: historyLimit,
  });

  const historyRows = historyData?.data ?? [];
  const historyMeta = historyData?.meta;

  const columnDefs = useMemo(
    () => [
      ...buildVerificationColumns(canEdit),
      {
        colId: 'actions',
        headerName: '',
        width: 110,
        pinned: 'right',
        editable: false,
        cellRenderer: (p: { data?: VerificationGridRow }) => {
          const row = p.data;
          if (!row) return null;
          return (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              disabled={isVerifying}
              onClick={() => void verifyRow(row)}
            >
              Verify
            </Button>
          );
        },
      } as ColDef<VerificationGridRow>,
    ],
    [canEdit, isVerifying, verifyRow],
  );

  return (
    <AppShell title="Inventory Verification" allowedRoles={['ADMIN', 'INVENTORY']}>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Acquired Lists</h2>
          <p className="text-sm text-muted-foreground">
            Select an acquired list to verify products against expected quantities.
          </p>
        </div>

        <div className="max-w-md space-y-2">
          <Label>List</Label>
          {listsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedListId || undefined}
              onValueChange={(v) => {
                setSelectedListId(v);
                setHistoryPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select acquired list" />
              </SelectTrigger>
              <SelectContent>
                {acquiredLists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedListId ? (
          <>
            <div>
              <h3 className="mb-2 font-semibold">
                {list?.name ?? 'List items'}
              </h3>
              <SpreadsheetGrid
                rowData={rows}
                columnDefs={columnDefs}
                loading={isLoading}
                onCellValueChanged={handleCellChange}
                getRowId={(r) => r.id}
                enableRowSelection={false}
                quickFilterPlaceholder="Filter products..."
                emptyMessage="No products in this acquired list."
                height="calc(100vh - 420px)"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Verification History</h3>
              {historyLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : historyRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No verification records for this list yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {historyRows.map((v: InventoryVerification) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-border p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {v.listItem?.product?.name ?? 'Product'}
                        </p>
                        {v.status && <VerificationStatusBadge status={v.status} />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expected {v.expectedQuantity} · Actual {v.actualQuantity}
                        {v.notes ? ` · ${v.notes}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.verifiedBy?.email ??
                          [v.verifiedBy?.firstName, v.verifiedBy?.lastName]
                            .filter(Boolean)
                            .join(' ')}{' '}
                        · {formatDate(v.verifiedAt)}
                      </p>
                    </div>
                  ))}
                  {historyMeta && historyMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Page {historyMeta.page} of {historyMeta.totalPages} ·{' '}
                        {historyMeta.total} records
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={historyPage <= 1}
                          onClick={() => setHistoryPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={historyPage >= historyMeta.totalPages}
                          onClick={() => setHistoryPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a list to begin verification.
          </p>
        )}
      </div>
    </AppShell>
  );
}
