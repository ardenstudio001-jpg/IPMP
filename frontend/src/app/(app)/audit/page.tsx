'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuditLogs } from '@/hooks/queries/use-audit';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { AuditLogGrid } from '@/components/grid/audit-log-grid';
import { AuditChangesPanel } from '@/components/audit/audit-changes-panel';
import {
  formatAuditAction,
  getAuditActorEmail,
  getAuditSku,
} from '@/lib/audit/display';
import { Button } from '@/components/ui/button';

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useAuditLogs({ page, limit, search });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <AppShell title="Audit Logs" allowedRoles={['ADMIN']}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <AuditLogGrid
            rowData={logs}
            loading={isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages} · {meta.total} records
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Timeline</h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events on this page.</p>
          ) : (
            <div className="relative space-y-4 border-l-2 border-primary/30 pl-4">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{formatAuditAction(log.action)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getAuditActorEmail(log)} · {formatDate(log.createdAt)}
                  </p>
                  {getAuditSku(log) && (
                    <p className="text-xs text-muted-foreground">SKU: {getAuditSku(log)}</p>
                  )}
                  <AuditChangesPanel log={log} />
                </div>
              ))}
            </div>
          )}
          {meta && (
            <p className="text-xs text-muted-foreground">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
