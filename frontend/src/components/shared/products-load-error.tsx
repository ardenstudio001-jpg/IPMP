'use client';

import { AlertCircle } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';

export function ProductsLoadError({ error }: { error: unknown }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Could not load products</p>
        <p className="mt-1 text-destructive/90">{getErrorMessage(error)}</p>
      </div>
    </div>
  );
}
