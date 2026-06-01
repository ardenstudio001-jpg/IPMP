-- Add actor email snapshot and entity SKU to audit logs
ALTER TABLE "audit_logs" ADD COLUMN "actorEmail" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "entitySku" TEXT;

-- Backfill actor email from users table
UPDATE "audit_logs" al
SET "actorEmail" = u.email
FROM "users" u
WHERE al."userId" = u.id AND al."actorEmail" IS NULL;

-- Fallback for orphaned rows
UPDATE "audit_logs"
SET "actorEmail" = 'unknown'
WHERE "actorEmail" IS NULL;

ALTER TABLE "audit_logs" ALTER COLUMN "actorEmail" SET NOT NULL;

-- Backfill entity SKU from JSON snapshots where possible
UPDATE "audit_logs"
SET "entitySku" = COALESCE(
  "newValue"->>'sku',
  "oldValue"->>'sku'
)
WHERE "entitySku" IS NULL
  AND "entityType" = 'Product'
  AND (
    ("newValue"->>'sku') IS NOT NULL
    OR ("oldValue"->>'sku') IS NOT NULL
  );

CREATE INDEX "audit_logs_entitySku_idx" ON "audit_logs"("entitySku");
