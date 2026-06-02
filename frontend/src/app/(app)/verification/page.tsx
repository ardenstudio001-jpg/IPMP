'use client';

import { useMemo, useState } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationStatusBadge } from '@/components/shared/status-badge';
import { useList, useLists } from '@/hooks/queries/use-lists';
import { useVerifications, useVerificationMutations } from '@/hooks/queries/use-verifications';
import type { InventoryVerification, ListItem, VerificationStatus } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

const ipmpTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f8fafb',
  accentColor: '#0fabbb',
  fontFamily: 'inherit',
  fontSize: 13,
});

type VerificationRow = InventoryVerification & {
  productName?: string;
  listName?: string;
};

export default function VerificationPage() {
  const [listId, setListId] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [itemsListId, setItemsListId] = useState('');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [expectedQty, setExpectedQty] = useState('0');
  const [actualQty, setActualQty] = useState('0');
  const [notes, setNotes] = useState('');

  const { data: listsData } = useLists({ type: 'ACQUIRED', limit: 100 });
  const acquiredLists = listsData?.items ?? [];

  const { data: verificationsData, isLoading } = useVerifications({
    listId: listId || undefined,
    limit: 100,
  });

  const { data: acquiredListDetail, isLoading: itemsLoading } = useList(itemsListId);

  const { create } = useVerificationMutations();

  const rows: VerificationRow[] = useMemo(() => {
    return (verificationsData?.data ?? []).map((v) => ({
      ...v,
      productName: v.listItem?.product?.name,
      listName: v.listItem?.list?.name,
    }));
  }, [verificationsData]);

  const columnDefs = useMemo<ColDef<VerificationRow>[]>(
    () => [
      {
        field: 'productName',
        headerName: 'Product',
        flex: 1,
        minWidth: 160,
        pinned: 'left',
      },
      { field: 'expectedQuantity', headerName: 'Expected Qty', width: 120 },
      { field: 'actualQuantity', headerName: 'Actual Qty', width: 120 },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: (p: { value: VerificationStatus }) =>
          p.value ? <VerificationStatusBadge status={p.value} /> : null,
      },
      { field: 'notes', headerName: 'Notes', width: 180 },
      {
        headerName: 'Verified By',
        width: 160,
        valueGetter: (p) =>
          p.data?.verifiedBy?.email ??
          [p.data?.verifiedBy?.firstName, p.data?.verifiedBy?.lastName]
            .filter(Boolean)
            .join(' ') ??
          '—',
      },
      {
        field: 'verifiedAt',
        headerName: 'Verified At',
        width: 160,
        valueFormatter: (p) => (p.value ? formatDate(String(p.value)) : '—'),
      },
    ],
    [],
  );

  const handleCreate = async () => {
    if (!selectedItem) return;
    await create.mutateAsync({
      listItemId: selectedItem.id,
      expectedQuantity: parseInt(expectedQty, 10) || 0,
      actualQuantity: parseInt(actualQty, 10) || 0,
      notes: notes.trim() || undefined,
    });
    setCreateOpen(false);
    setSelectedItem(null);
    setNotes('');
  };

  return (
    <AppShell title="Acquired List Verification" allowedRoles={['ADMIN', 'INVENTORY']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Verification</h2>
            <p className="text-sm text-muted-foreground">
              Record physical counts for acquired list items.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>New verification</Button>
        </div>

        <div className="max-w-xs space-y-2">
          <Label>Filter by acquired list</Label>
          <Select
            value={listId || 'all'}
            onValueChange={(v) => setListId(v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All lists" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lists</SelectItem>
              {acquiredLists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <div className="spreadsheet-container rounded-xl border border-border">
            <div style={{ height: 'calc(100vh - 280px)', width: '100%' }}>
              <AgGridReact<VerificationRow>
                theme={ipmpTheme}
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, filter: true, resizable: true }}
                pagination
                paginationPageSize={50}
              />
            </div>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Acquired list</Label>
              <Select
                value={itemsListId}
                onValueChange={(v) => {
                  setItemsListId(v);
                  setSelectedItem(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select list" />
                </SelectTrigger>
                <SelectContent>
                  {acquiredLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>List item</Label>
              <Select
                value={selectedItem?.id ?? ''}
                onValueChange={(id) => {
                  const item = acquiredListDetail?.items.find((i) => i.id === id);
                  setSelectedItem(item ?? null);
                  if (item) setExpectedQty(String(item.quantity));
                }}
                disabled={!itemsListId || itemsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {(acquiredListDetail?.items ?? [])
                    .filter((i) => i.status === 'ACTIVE')
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.product.name} (qty {item.quantity})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Expected quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Actual quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Status is computed automatically (PENDING, MATCHED, PARTIAL, MISSING, DAMAGED).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!selectedItem || create.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
