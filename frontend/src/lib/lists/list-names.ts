import type { ListType } from '@/lib/api/types';

function formatDatePrefix(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DEFAULT_SUFFIX: Record<ListType, string> = {
  PROCUREMENT: 'Procurement_List',
  PURCHASE: 'Purchase_List',
  ACQUIRED: 'Acquired_List',
};

export function defaultListName(type: ListType, date = new Date()): string {
  return `${formatDatePrefix(date)} ${DEFAULT_SUFFIX[type]}`;
}
