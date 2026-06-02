'use client';

import { useMemo, useState } from 'react';
import type { SelectionChangedEvent } from 'ag-grid-community';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Undo2, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { SpreadsheetGrid } from '@/components/grid/spreadsheet-grid';
import { buildListItemColumns } from '@/components/grid/list-item-columns';
import { useListItemSpreadsheet } from '@/hooks/use-list-item-spreadsheet';
import { useListItemMutations } from '@/hooks/queries/use-list-items';
import { useAuth } from '@/providers/auth-provider';
import type { ListType, Role } from '@/lib/api/types';
import { LIST_TYPE_LABELS, LIST_TYPE_ROUTES } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoveItemsDialog } from '@/components/lists/move-items-dialog';
import { LineagePanel } from '@/components/lists/lineage-panel';
import { ProductsLoadError } from '@/components/shared/products-load-error';

const LIST_ALLOWED_ROLES: Record<ListType, Role[]> = {
  PROCUREMENT: ['ADMIN', 'PROCUREMENT'],
  PURCHASE: ['ADMIN', 'PROCUREMENT'],
  ACQUIRED: ['ADMIN', 'PROCUREMENT', 'INVENTORY'],
};

export function ListDetailPage({
  listId,
  listType,
}: {
  listId: string;
  listType: ListType;
}) {
  const { user } = useAuth();
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [lineageId, setLineageId] = useState<string | null>(null);

  const canWorkflow =
    user?.role === 'ADMIN' || user?.role === 'PROCUREMENT';
  const canEdit =
    canWorkflow && (listType === 'PROCUREMENT' || listType === 'PURCHASE');

  const {
    list,
    rows,
    categories,
    isLoading,
    isError,
    error,
    handleAddRow,
    handleCellChange,
    getRowId,
    canAddRow,
  } = useListItemSpreadsheet({ listId, listType, canEdit, includeRemoved });

  const { moveToPurchase, moveToAcquired, rollback } = useListItemMutations(listId);

  const columnDefs = useMemo(
    () =>
      buildListItemColumns({
        listType,
        categories,
        editable: canEdit,
      }),
    [listType, categories, canEdit],
  );

  const syncSelection = (event: SelectionChangedEvent) => {
    const ids = event.api
      .getSelectedRows()
      .filter((r: { _isDraft?: boolean; status: string }) => !r._isDraft && r.status === 'ACTIVE')
      .map((r: { id: string }) => r.id);
    setSelectedIds(ids);
  };

  const toolbarExtra = (
    <>
      {canWorkflow && listType === 'PROCUREMENT' && (
        <Button
          size="sm"
          variant="secondary"
          disabled={selectedIds.length === 0}
          onClick={() => setMoveOpen(true)}
        >
          <ArrowRight className="h-4 w-4" />
          Move to purchase
        </Button>
      )}
      {canWorkflow && listType === 'PURCHASE' && (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={selectedIds.length === 0}
            onClick={() => setMoveOpen(true)}
          >
            <ArrowRight className="h-4 w-4" />
            Move to acquired
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selectedIds.length !== 1}
            onClick={() => selectedIds[0] && setRollbackId(selectedIds[0])}
          >
            <Undo2 className="h-4 w-4" />
            Rollback
          </Button>
        </>
      )}
      {canWorkflow && listType === 'ACQUIRED' && (
        <Button
          size="sm"
          variant="outline"
          disabled={selectedIds.length !== 1}
          onClick={() => selectedIds[0] && setRollbackId(selectedIds[0])}
        >
          <Undo2 className="h-4 w-4" />
          Rollback
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={selectedIds.length !== 1}
        onClick={() => selectedIds[0] && setLineageId(selectedIds[0])}
      >
        <GitBranch className="h-4 w-4" />
        Lineage
      </Button>
      {(listType === 'PURCHASE' || listType === 'ACQUIRED') && canWorkflow && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="include-removed"
            checked={includeRemoved}
            onCheckedChange={(v) => setIncludeRemoved(v === true)}
          />
          <Label htmlFor="include-removed" className="text-xs">
            Show removed
          </Label>
        </div>
      )}
    </>
  );

  if (isError) {
    return (
      <AppShell
        title={list?.name ?? 'List'}
        allowedRoles={LIST_ALLOWED_ROLES[listType]}
      >
        <ProductsLoadError error={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={list?.name ?? `${LIST_TYPE_LABELS[listType]} List`}
      allowedRoles={LIST_ALLOWED_ROLES[listType]}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href={LIST_TYPE_ROUTES[listType]}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {LIST_TYPE_LABELS[listType]} · {rows.length} row(s)
        </p>
      </div>

      <SpreadsheetGrid
        rowData={rows}
        columnDefs={columnDefs}
        loading={isLoading}
        onCellValueChanged={handleCellChange}
        onSelectionChanged={syncSelection}
        onAddRow={canAddRow ? handleAddRow : undefined}
        getRowId={getRowId}
        toolbarExtra={toolbarExtra}
        enableRowSelection={canWorkflow}
        emptyMessage={
          canAddRow
            ? 'No items yet. Click Add Row to add your first product.'
            : 'No items in this list.'
        }
        quickFilterPlaceholder="Filter items..."
      />

      <MoveItemsDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        targetType={listType === 'PROCUREMENT' ? 'PURCHASE' : 'ACQUIRED'}
        sourceItemIds={selectedIds}
        loading={moveToPurchase.isPending || moveToAcquired.isPending}
        onConfirm={async (payload) => {
          if (listType === 'PROCUREMENT') {
            await moveToPurchase.mutateAsync(payload);
          } else {
            await moveToAcquired.mutateAsync(payload);
          }
          setSelectedIds([]);
        }}
      />

      <Dialog open={Boolean(rollbackId)} onOpenChange={() => setRollbackId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from workflow?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This soft-removes the item from this list (status REMOVED). Upstream
              procurement rows are not deleted. You can view removed rows with
              &quot;Show removed&quot;.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rollback.isPending}
              onClick={() => {
                if (rollbackId) {
                  rollback.mutate(rollbackId, {
                    onSuccess: () => {
                      setRollbackId(null);
                      setSelectedIds([]);
                    },
                  });
                }
              }}
            >
              Confirm rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LineagePanel
        itemId={lineageId}
        open={Boolean(lineageId)}
        onOpenChange={(o) => !o && setLineageId(null)}
      />
    </AppShell>
  );
}
