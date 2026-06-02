'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useLists, useListMutations } from '@/hooks/queries/use-lists';
import { useAuth } from '@/providers/auth-provider';
import type { ListType, Role } from '@/lib/api/types';
import { LIST_TYPE_LABELS, LIST_TYPE_ROUTES } from '@/lib/api/types';
import { defaultListName } from '@/lib/lists/list-names';
import { formatDate } from '@/lib/utils';

const LIST_ALLOWED_ROLES: Record<ListType, Role[]> = {
  PROCUREMENT: ['ADMIN', 'PROCUREMENT'],
  PURCHASE: ['ADMIN', 'PROCUREMENT'],
  ACQUIRED: ['ADMIN', 'PROCUREMENT', 'INVENTORY'],
};

export function ListOverviewPage({ listType }: { listType: ListType }) {
  const router = useRouter();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState(() => defaultListName(listType));

  const allowedRoles = LIST_ALLOWED_ROLES[listType];
  const { data, isLoading } = useLists({ type: listType, from: from || undefined, to: to || undefined, page, limit: 20 });
  const { create } = useListMutations();

  const canCreate =
    user?.role === 'ADMIN' || user?.role === 'PROCUREMENT';

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!nameFilter.trim()) return items;
    const term = nameFilter.toLowerCase();
    return items.filter((l) => l.name.toLowerCase().includes(term));
  }, [data?.items, nameFilter]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const result = await create.mutateAsync({ name, type: listType });
    setCreateOpen(false);
    setNewName(defaultListName(listType));
    router.push(`${LIST_TYPE_ROUTES[listType]}/${result.data.id}`);
  };

  return (
    <AppShell
      title={`${LIST_TYPE_LABELS[listType]} Lists`}
      allowedRoles={allowedRoles}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {LIST_TYPE_LABELS[listType]} Lists
            </h2>
            <p className="text-sm text-muted-foreground">
              Open a list to manage items or review historical lists.
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => {
                setNewName(defaultListName(listType));
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create list
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Items</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Created by</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      No lists found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((list) => (
                    <tr
                      key={list.id}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-primary/5"
                      onClick={() =>
                        router.push(`${LIST_TYPE_ROUTES[listType]}/${list.id}`)
                      }
                    >
                      <td className="px-4 py-3 font-medium">{list.name}</td>
                      <td className="px-4 py-3">{list._count?.items ?? '—'}</td>
                      <td className="px-4 py-3">{formatDate(list.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {list.createdBy?.email ?? list.createdById}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {LIST_TYPE_LABELS[listType]} list</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="list-name">List name</Label>
            <Input
              id="list-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
