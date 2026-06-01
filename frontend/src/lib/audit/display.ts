import type { AuditLog } from '@/lib/api/types';

export function getAuditActorEmail(log: AuditLog): string {
  return log.actorEmail ?? log.user?.email ?? log.userId;
}

export function getAuditSku(log: AuditLog): string | null {
  if (log.entitySku) return log.entitySku;
  const fromNew =
    log.newValue && typeof log.newValue === 'object' && 'sku' in log.newValue
      ? String((log.newValue as { sku?: unknown }).sku ?? '')
      : '';
  const fromOld =
    log.oldValue && typeof log.oldValue === 'object' && 'sku' in log.oldValue
      ? String((log.oldValue as { sku?: unknown }).sku ?? '')
      : '';
  const sku = fromNew || fromOld;
  return sku.trim() || null;
}

export function formatAuditAction(action: string): string {
  return action.replace(/_/g, ' ');
}

export function formatAuditEntity(log: AuditLog): string {
  return `${log.entityType} · ${log.entityId.slice(0, 8)}…`;
}
