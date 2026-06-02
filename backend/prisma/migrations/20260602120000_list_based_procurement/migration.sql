-- List-Based Procurement: breaking migration

-- Drop product workflow foreign keys
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_createdById_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_approvedById_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_costingCompletedById_fkey";

TRUNCATE TABLE "products" CASCADE;

-- Replace NotificationType enum
CREATE TYPE "NotificationType_new" AS ENUM (
  'PROCUREMENT_LIST_CREATED',
  'ITEM_MOVED_TO_PURCHASE',
  'PURCHASE_LIST_READY',
  'ITEM_MOVED_TO_ACQUIRED',
  'ACQUIRED_LIST_READY',
  'VERIFICATION_PENDING',
  'VERIFICATION_MISMATCH',
  'LIST_ITEM_PRICING_UPDATED',
  'USER_INVITATION_SENT',
  'SYSTEM'
);

ALTER TABLE "notifications" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "notifications"
  ALTER COLUMN "type" TYPE "NotificationType_new"
  USING (
    CASE "type"::text
      WHEN 'USER_INVITATION_SENT' THEN 'USER_INVITATION_SENT'::"NotificationType_new"
      ELSE 'SYSTEM'::"NotificationType_new"
    END
  );

DROP TYPE "NotificationType";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";

-- New enums
CREATE TYPE "ProcurementType" AS ENUM ('LOCAL', 'IMPORTED', 'EMERGENCY', 'STANDARD');
CREATE TYPE "ListType" AS ENUM ('PROCUREMENT', 'PURCHASE', 'ACQUIRED');
CREATE TYPE "RequesterType" AS ENUM ('SHOP', 'CUSTOMER', 'BRANCH', 'WHOLESALE_CLIENT');
CREATE TYPE "ListItemStatus" AS ENUM ('ACTIVE', 'REMOVED', 'VERIFIED');
CREATE TYPE "MovementAction" AS ENUM ('CREATED', 'MOVED_FORWARD', 'MOVED_BACKWARD', 'REMOVED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'MATCHED', 'PARTIAL', 'MISSING', 'DAMAGED');

-- Drop old products table and recreate as catalog master
DROP TABLE "products";

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

CREATE TABLE "requesters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RequesterType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "requesters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "requesters_name_idx" ON "requesters"("name");

CREATE TABLE "stock_owners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_owners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_owners_name_key" ON "stock_owners"("name");

CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ListType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lists_type_createdAt_idx" ON "lists"("type", "createdAt");
CREATE INDEX "lists_createdById_idx" ON "lists"("createdById");

ALTER TABLE "lists" ADD CONSTRAINT "lists_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "procurementType" "ProcurementType" NOT NULL,
    "productDetails" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_name_idx" ON "products"("name");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPrice" DECIMAL(10,2),
    "regularPrice" DECIMAL(10,2),
    "salesPrice" DECIMAL(10,2),
    "minimum20" DECIMAL(10,2),
    "minimum4" DECIMAL(10,2),
    "finalSellingPrice" DECIMAL(10,2),
    "requestedById" TEXT,
    "stockOwnerId" TEXT,
    "status" "ListItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentItemId" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "list_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "list_items_listId_idx" ON "list_items"("listId");
CREATE INDEX "list_items_productId_idx" ON "list_items"("productId");
CREATE INDEX "list_items_parentItemId_idx" ON "list_items"("parentItemId");
CREATE INDEX "list_items_status_idx" ON "list_items"("status");
CREATE INDEX "list_items_listId_status_idx" ON "list_items"("listId", "status");

ALTER TABLE "list_items" ADD CONSTRAINT "list_items_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "requesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_stockOwnerId_fkey"
  FOREIGN KEY ("stockOwnerId") REFERENCES "stock_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_parentItemId_fkey"
  FOREIGN KEY ("parentItemId") REFERENCES "list_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_removedById_fkey"
  FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "product_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromListId" TEXT,
    "toListId" TEXT,
    "listItemId" TEXT,
    "action" "MovementAction" NOT NULL,
    "movedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_movements_productId_idx" ON "product_movements"("productId");
CREATE INDEX "product_movements_fromListId_idx" ON "product_movements"("fromListId");
CREATE INDEX "product_movements_toListId_idx" ON "product_movements"("toListId");
CREATE INDEX "product_movements_movedById_idx" ON "product_movements"("movedById");
CREATE INDEX "product_movements_createdAt_idx" ON "product_movements"("createdAt");

ALTER TABLE "product_movements" ADD CONSTRAINT "product_movements_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_movements" ADD CONSTRAINT "product_movements_fromListId_fkey"
  FOREIGN KEY ("fromListId") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_movements" ADD CONSTRAINT "product_movements_toListId_fkey"
  FOREIGN KEY ("toListId") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_movements" ADD CONSTRAINT "product_movements_listItemId_fkey"
  FOREIGN KEY ("listItemId") REFERENCES "list_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_movements" ADD CONSTRAINT "product_movements_movedById_fkey"
  FOREIGN KEY ("movedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_verifications" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_verifications_listItemId_idx" ON "inventory_verifications"("listItemId");
CREATE INDEX "inventory_verifications_verifiedById_idx" ON "inventory_verifications"("verifiedById");
CREATE INDEX "inventory_verifications_status_idx" ON "inventory_verifications"("status");

ALTER TABLE "inventory_verifications" ADD CONSTRAINT "inventory_verifications_listItemId_fkey"
  FOREIGN KEY ("listItemId") REFERENCES "list_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_verifications" ADD CONSTRAINT "inventory_verifications_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE IF EXISTS "ProductStatus";
