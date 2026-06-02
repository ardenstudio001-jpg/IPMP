'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLists } from '@/hooks/queries/use-lists';
import { useAuditLogs } from '@/hooks/queries/use-audit';
import { useNotifications } from '@/hooks/queries/use-notifications';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { getAuditActorEmail } from '@/lib/audit/display';
import { ClipboardList, ShoppingBag, PackageCheck, Bell, Activity } from 'lucide-react';

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: procurement, isLoading: pLoading } = useLists({
    type: 'PROCUREMENT',
    limit: 1,
  });
  const { data: purchase, isLoading: puLoading } = useLists({
    type: 'PURCHASE',
    limit: 1,
  });
  const { data: acquired, isLoading: aLoading } = useLists({
    type: 'ACQUIRED',
    limit: 1,
  });
  const statsLoading = pLoading || puLoading || aLoading;

  const { data: audit, isLoading: auditLoading } = useAuditLogs({ limit: 10 });
  const { data: notifications, isLoading: notifLoading } = useNotifications(true);

  return (
    <AppShell title="Dashboard" allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Operational Overview</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Procurement Lists"
            value={procurement?.meta.total ?? 0}
            icon={ClipboardList}
            loading={statsLoading}
          />
          <MetricCard
            title="Purchase Lists"
            value={purchase?.meta.total ?? 0}
            icon={ShoppingBag}
            loading={statsLoading}
          />
          <MetricCard
            title="Acquired Lists"
            value={acquired?.meta.total ?? 0}
            icon={PackageCheck}
            loading={statsLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (audit?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {(audit?.data ?? []).slice(0, 8).map((log) => (
                    <div key={log.id} className="flex items-start justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-muted-foreground">
                          {getAuditActorEmail(log)} · {log.entityType}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-primary" />
                Notifications Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{notifications?.data?.length ?? 0}</div>
                  <p className="mt-1 text-sm text-muted-foreground">Unread notifications</p>
                  {(notifications?.data ?? []).slice(0, 5).map((n) => (
                    <div key={n.id} className="mt-3 border-t border-border pt-3 text-sm">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground">{n.message}</p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
