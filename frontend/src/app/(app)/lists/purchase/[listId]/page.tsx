'use client';

import { use } from 'react';
import { ListDetailPage } from '@/components/lists/list-detail-page';

export default function PurchaseListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  return <ListDetailPage listId={listId} listType="PURCHASE" />;
}
