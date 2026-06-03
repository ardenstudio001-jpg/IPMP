'use client';

import { useState } from 'react';
import type { AuditLog } from '@/lib/api/types';
import {
  formatAuditAction,
  getAuditActorEmail,
} from '@/lib/audit/display';
import {
  getAuditFieldChanges,
  getAuditProductSummary,
} from '@/lib/audit/changes';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function AuditChangesPanel({ log }: { log: AuditLog }) {
  const [viewMode, setViewMode] = useState<'plain' | 'json'>('plain');
  const changes = getAuditFieldChanges(log);
  const summary = getAuditProductSummary(log);
  const hasValues = Boolean(log.oldValue || log.newValue);

  if (!hasValues) return null;

  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground/80">
        View changes
      </summary>
      <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Display
          </span>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-[10px]">
            <button
              type="button"
              className={cn(
                'rounded px-2 py-0.5',
                viewMode === 'plain' && 'bg-primary text-primary-foreground',
              )}
              onClick={() => setViewMode('plain')}
            >
              Plain Text
            </button>
            <button
              type="button"
              className={cn(
                'rounded px-2 py-0.5',
                viewMode === 'json' && 'bg-primary text-primary-foreground',
              )}
              onClick={() => setViewMode('json')}
            >
              JSON
            </button>
          </div>
        </div>

        {viewMode === 'json' ? (
          <div className="space-y-2">
            {log.oldValue && (
              <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px]">
                {JSON.stringify(log.oldValue, null, 2)}
              </pre>
            )}
            {log.newValue && (
              <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px]">
                {JSON.stringify(log.newValue, null, 2)}
              </pre>
            )}
          </div>
        ) : changes.length === 0 ? (
          <p className="text-muted-foreground">No field-level differences detected.</p>
        ) : (
          <div className="space-y-3">
            {(summary.productName || summary.listName) && (
              <div className="space-y-0.5 border-b border-border pb-2">
                {summary.productName && (
                  <p>
                    <span className="font-medium text-foreground">Product:</span>{' '}
                    {summary.productName}
                  </p>
                )}
                {summary.listName && (
                  <p>
                    <span className="font-medium text-foreground">List:</span>{' '}
                    {summary.listName}
                  </p>
                )}
                <p>
                  <span className="font-medium text-foreground">Changed By:</span>{' '}
                  {getAuditActorEmail(log)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Date:</span>{' '}
                  {formatDate(log.createdAt)}
                </p>
                <p className="text-muted-foreground">{formatAuditAction(log.action)}</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="font-medium text-foreground">Changes</p>
              {changes.map((change) => (
                <div key={change.field} className="rounded bg-background p-2">
                  <p className="font-medium text-foreground">{change.label}</p>
                  {change.oldDisplay !== '—' || change.newDisplay !== '—' ? (
                    <p className="mt-0.5 tabular-nums">
                      {change.oldDisplay} → {change.newDisplay}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1">
                        <span className="text-muted-foreground">Old:</span>{' '}
                        {change.oldDisplay}
                      </p>
                      <p>
                        <span className="text-muted-foreground">New:</span>{' '}
                        {change.newDisplay}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
