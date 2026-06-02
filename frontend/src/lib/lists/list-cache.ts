import type { QueryClient } from '@tanstack/react-query';
import type { ListItem, WorkflowListDetail } from '@/lib/api/types';
import { listKeys } from '@/hooks/queries/use-lists';

export function upsertListItemInDetailCache(
  qc: QueryClient,
  listId: string,
  item: ListItem,
) {
  qc.setQueryData<WorkflowListDetail>(listKeys.detail(listId), (old) => {
    if (!old) return old;
    const idx = old.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      return {
        ...old,
        items: old.items.map((i) => (i.id === item.id ? item : i)),
      };
    }
    return { ...old, items: [...old.items, item] };
  });
}

export function removeListItemFromDetailCache(
  qc: QueryClient,
  listId: string,
  itemId: string,
) {
  qc.setQueryData<WorkflowListDetail>(listKeys.detail(listId), (old) => {
    if (!old) return old;
    return {
      ...old,
      items: old.items.map((i) =>
        i.id === itemId ? { ...i, status: 'REMOVED' as const } : i,
      ),
    };
  });
}

export function invalidateListQueries(qc: QueryClient, listId?: string) {
  void qc.invalidateQueries({ queryKey: listKeys.all });
  if (listId) {
    void qc.invalidateQueries({ queryKey: listKeys.detail(listId) });
  }
}
