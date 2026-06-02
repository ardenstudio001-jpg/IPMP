'use client';

import { useState } from 'react';
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
import { useLists } from '@/hooks/queries/use-lists';
import type { ListType } from '@/lib/api/types';
import { defaultListName } from '@/lib/lists/list-names';

interface MoveItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'PURCHASE' | 'ACQUIRED';
  sourceItemIds: string[];
  onConfirm: (payload: {
    sourceItemIds: string[];
    purchaseListId?: string;
    newPurchaseList?: { name: string };
    acquiredListId?: string;
    newAcquiredList?: { name: string };
  }) => Promise<void>;
  loading?: boolean;
}

export function MoveItemsDialog({
  open,
  onOpenChange,
  targetType,
  sourceItemIds,
  onConfirm,
  loading,
}: MoveItemsDialogProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState(() => defaultListName(targetType));

  const { data: listsData } = useLists({ type: targetType, limit: 100 });
  const lists = listsData?.items ?? [];

  const title =
    targetType === 'PURCHASE' ? 'Move to purchase list' : 'Move to acquired list';

  const handleConfirm = async () => {
    if (mode === 'existing' && !selectedListId) return;
    if (mode === 'new' && !newListName.trim()) return;

    const base = { sourceItemIds };
    if (targetType === 'PURCHASE') {
      await onConfirm(
        mode === 'existing'
          ? { ...base, purchaseListId: selectedListId }
          : { ...base, newPurchaseList: { name: newListName.trim() } },
      );
    } else {
      await onConfirm(
        mode === 'existing'
          ? { ...base, acquiredListId: selectedListId }
          : { ...base, newAcquiredList: { name: newListName.trim() } },
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Moving {sourceItemIds.length} item(s). Source rows stay on the original list.
        </p>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('existing')}
            >
              Existing list
            </Button>
            <Button
              type="button"
              variant={mode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('new')}
            >
              New list
            </Button>
          </div>
          {mode === 'existing' ? (
            <div className="space-y-2">
              <Label>Select list</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>New list name</Label>
              <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={loading}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
