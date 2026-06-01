'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuditLogs } from '@/hooks/queries/use-audit';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { AuditLogGrid } from '@/components/grid/audit-log-grid';
import {
  formatAuditAction,
  getAuditActorEmail,
  getAuditSku,
} from '@/lib/audit/display';

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAuditLogs({ limit: 100, search });

  const logs = data?.data ?? [];

  return (
    <AppShell title="Audit Logs" allowedRoles={['ADMIN']}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AuditLogGrid
            rowData={logs}
            loading={isLoading}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Timeline</h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="relative space-y-4 border-l-2 border-primary/30 pl-4">
              {logs.slice(0, 15).map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{formatAuditAction(log.action)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getAuditActorEmail(log)} · {formatDate(log.createdAt)}
                  </p>
                  {getAuditSku(log) && (
                    <p className="text-xs text-muted-foreground">SKU: {getAuditSku(log)}</p>
                  )}
                  {(log.oldValue || log.newValue) && (
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">View changes</summary>
                      {log.oldValue && (
                        <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
                          {JSON.stringify(log.oldValue, null, 2)}
                        </pre>
                      )}
                      {log.newValue && (
                        <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
                          {JSON.stringify(log.newValue, null, 2)}
                        </pre>
                      )}
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
