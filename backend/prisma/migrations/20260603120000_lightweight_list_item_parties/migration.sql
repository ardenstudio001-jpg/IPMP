-- Lightweight sources / requestedBy / stockOwner via ListItemParty

CREATE TYPE "PartyRole" AS ENUM ('SOURCE', 'REQUESTED_BY', 'STOCK_OWNER');

CREATE TABLE "list_item_parties" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PartyRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "list_item_parties_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "list_item_parties_listItemId_idx" ON "list_item_parties"("listItemId");
CREATE INDEX "list_item_parties_listItemId_role_idx" ON "list_item_parties"("listItemId", "role");

ALTER TABLE "list_item_parties" ADD CONSTRAINT "list_item_parties_listItemId_fkey"
  FOREIGN KEY ("listItemId") REFERENCES "list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing requester / stock owner FKs into party rows
INSERT INTO "list_item_parties" ("id", "listItemId", "name", "role", "createdAt")
SELECT gen_random_uuid()::text, li."id", r."name", 'REQUESTED_BY'::"PartyRole", NOW()
FROM "list_items" li
INNER JOIN "requesters" r ON li."requestedById" = r."id"
WHERE li."requestedById" IS NOT NULL;

INSERT INTO "list_item_parties" ("id", "listItemId", "name", "role", "createdAt")
SELECT gen_random_uuid()::text, li."id", so."name", 'STOCK_OWNER'::"PartyRole", NOW()
FROM "list_items" li
INNER JOIN "stock_owners" so ON li."stockOwnerId" = so."id"
WHERE li."stockOwnerId" IS NOT NULL;

ALTER TABLE "list_items" DROP CONSTRAINT IF EXISTS "list_items_requestedById_fkey";
ALTER TABLE "list_items" DROP CONSTRAINT IF EXISTS "list_items_stockOwnerId_fkey";
ALTER TABLE "list_items" DROP COLUMN IF EXISTS "requestedById";
ALTER TABLE "list_items" DROP COLUMN IF EXISTS "stockOwnerId";

DROP TABLE IF EXISTS "requesters";
DROP TABLE IF EXISTS "stock_owners";
DROP TYPE IF EXISTS "RequesterType";
