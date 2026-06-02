'use client';

import { GitBranch } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useListItemLineage } from '@/hooks/queries/use-list-items';
import { LIST_TYPE_LABELS } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

interface LineagePanelProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LineageStep({
  label,
  name,
  type,
  createdAt,
  status,
}: {
  label: string;
  name: string;
  type: string;
  createdAt: string;
  status: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{name}</p>
      <p className="text-sm text-muted-foreground">
        {LIST_TYPE_LABELS[type as keyof typeof LIST_TYPE_LABELS] ?? type} · {status}
      </p>
      <p className="text-xs text-muted-foreground">{formatDate(createdAt)}</p>
    </div>
  );
}

export function LineagePanel({ itemId, open, onOpenChange }: LineagePanelProps) {
  const { data, isLoading } = useListItemLineage(open ? itemId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Workflow lineage
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {!isLoading && data && (
            <>
              {data.ancestors.map((item, i) => (
                <LineageStep
                  key={item.id}
                  label={i === 0 ? 'Origin' : 'Upstream'}
                  name={item.list?.name ?? item.listId}
                  type={item.list?.type ?? ''}
                  createdAt={item.createdAt}
                  status={item.status}
                />
              ))}
              <LineageStep
                label="Current"
                name={data.item.list?.name ?? data.item.listId}
                type={data.item.list?.type ?? ''}
                createdAt={data.item.createdAt}
                status={data.item.status}
              />
              {data.descendants.map((item) => (
                <LineageStep
                  key={item.id}
                  label="Downstream"
                  name={item.list?.name ?? item.listId}
                  type={item.list?.type ?? ''}
                  createdAt={item.createdAt}
                  status={item.status}
                />
              ))}
              {data.ancestors.length === 0 && data.descendants.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No linked items in other workflow stages yet.
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
