import type { ListItemStatus, VerificationStatus } from '@/lib/api/types';
import {
  LIST_ITEM_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';

const LIST_ITEM_VARIANT: Record<
  ListItemStatus,
  'warning' | 'default' | 'success' | 'danger' | 'muted'
> = {
  ACTIVE: 'default',
  REMOVED: 'muted',
  VERIFIED: 'success',
};

const VERIFICATION_VARIANT: Record<
  VerificationStatus,
  'warning' | 'default' | 'success' | 'danger' | 'muted'
> = {
  PENDING: 'warning',
  MATCHED: 'success',
  PARTIAL: 'default',
  MISSING: 'danger',
  DAMAGED: 'danger',
};

export function ListItemStatusBadge({ status }: { status: ListItemStatus }) {
  return (
    <Badge variant={LIST_ITEM_VARIANT[status]}>
      {LIST_ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <Badge variant={VERIFICATION_VARIANT[status]}>
      {VERIFICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
