# IPMP Project Progress Report

**Last Updated**: June 3, 2026  
**Project**: Inventory & Pricing Management Platform  
**Status**: List workflow + party names + frontend verification, audit UX, and persistence fixes

---

## Executive Summary

IPMP uses a **list-based procurement workflow** (procurement → purchase → acquired) with **copy + lineage** on `ListItem` rows.

A recent refinement replaced heavyweight `Requester` / `StockOwner` entities and any supplier registry with **lightweight multi-name fields** stored via `ListItemParty` (name + role only). Users enter plain strings in the API—no pre-created records or CRUD modules for suppliers or organizations.

The **frontend** uses list-based spreadsheets for procurement/purchase/acquired lists and a dedicated inventory verification workspace.

---

## June 3, 2026 — Bug fixes & UX improvements

### Security

- Self-service password change requires **current password**, **new password**, and **confirm new password** (UI in account menu).
- Backend validates current password hash, invalidates refresh token on success, and audits `USER_PASSWORD_CHANGED` (no password values in logs).
- User deactivation requires an explicit confirmation dialog (name, role, warning) before `isActive` is set to false.

### Audit

- Audit table and timeline share the same **server-side pagination** (`page`, `limit`, `search`) — same records, totals, and page count on both panels.
- **View changes** shows only fields that differ (plain text default, optional JSON toggle).
- Pricing settings audits include `oldValue` from the previously active setting for field-level diffs (e.g. Investment Fund Rate 10% → 15%).

### Inventory verification

- Verification UI: select an **acquired list**, spreadsheet of all list products (including `VERIFIED`), inline actual quantity / notes / verify.
- Verification history is paginated per list; API returns `{ data, meta }` (fixed mismatch with frontend).
- Inventory staff can update product name, image, and details during verification (audited via `ProductsService`).

### Category UX

- Category column uses **searchable select + create** (filter as you type, `Create "…"` for new categories, immediate API persist).

### Persistence fixes

- **Sources** and **requestedBy** grid edits use explicit `valueSetter` / `equals` and read committed row values before PATCH — party arrays persist to `ListItemParty`.
- Auto-generated SKUs are **5 characters** (alphanumeric, no prefix).

---

## Architecture Refinement (June 3, 2026)

### Decision: `ListItemParty` instead of separate tables

| Before | After |
|--------|-------|
| `Requester` table + `requestedById` FK | `ListItemParty` rows with `role = REQUESTED_BY` |
| `StockOwner` table + `stockOwnerId` FK | `ListItemParty` rows with `role = STOCK_OWNER` |
| No sources | `ListItemParty` rows with `role = SOURCE` |
| `/requesters`, `/stock-owners` CRUD modules | **Removed** — names only on list items |

**Why:** Operational reality is free-text names (branches, vendors, warehouses), not a managed registry. Normalization is deferred until supplier/organization management is a real requirement.

### `PartyRole` enum

- `SOURCE` — who we buy from (e.g. "Nestle Distributor", "China Vendor")
- `REQUESTED_BY` — who requested the item on procurement/purchase lists
- `STOCK_OWNER` — stock responsibility on acquired lists

### API response shape

List items return grouped string arrays (not nested entities):

```json
{
  "sources": ["ABC Supplier", "XYZ Imports"],
  "requestedBy": ["Spintex Branch", "Wholesale Client"],
  "stockOwner": ["Main Warehouse"]
}
```

### Copy rules (unchanged workflow, updated parties)

- **Procurement → purchase**: copy all party rows with the same roles
- **Purchase → acquired**: copy `SOURCE`; map `REQUESTED_BY` names → `STOCK_OWNER` (requested-by becomes stock owner)

---

## Database

**Schema**: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

**Migrations**:

1. `20260602120000_list_based_procurement` — list workflow foundation
2. `20260603120000_lightweight_list_item_parties` — parties table; migrates legacy FK data; drops `requesters` / `stock_owners`

**Apply**:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

---

## Backend Modules

| Module | Responsibility |
|--------|----------------|
| `categories` | Normalized product categories (ADMIN write) |
| `products` | Catalog master |
| `lists` | Workflow list containers |
| `list-items` | Items, parties, moves, rollback, lineage |
| `inventory-verification` | Acquired list physical checks |
| `pricing`, `audit`, `notifications`, `auth`, `users`, `invitations`, `realtime` | Cross-cutting |

**Removed**: `requesters`, `stock-owners`

---

## List Item API

### Create (`POST /lists/:listId/items`)

```json
{
  "name": "Cooking Oil",
  "categoryId": "...",
  "procurementType": "LOCAL",
  "unit": "L",
  "quantity": 10,
  "costPrice": 12.5,
  "sources": ["ABC Supplier", "XYZ Imports"],
  "requestedBy": ["Spintex Branch", "Wholesale Client"]
}
```

### Update (`PATCH /list-items/:id`)

Pass `sources`, `requestedBy`, or `stockOwner` arrays to **replace** that role’s names for the item.

### Fetch

`GET /list-items/:id` and list detail endpoints return `sources`, `requestedBy`, `stockOwner` arrays via `formatListItem()`.

---

## Permissions (unchanged)

| Action | ADMIN | PROCUREMENT | INVENTORY |
|--------|:-----:|:-----------:|:---------:|
| Workflow lists / moves / rollback | ✓ | ✓ | ✗ |
| Acquired list read / verify | ✓ | read lists | ✓ |
| Update acquired item quantity | ✓ | ✗ | ✓ |
| Category write | ✓ | ✗ | ✗ |
| Change own password | ✓ | ✓ | ✓ |

---

## Tests

- `list-item-party.util.spec.ts` — normalize, group, acquired copy mapping
- `list-items.service.spec.ts` — rollback + formatted party arrays
- **17 suites, 30 tests** passing

---

## Frontend Status

- List detail spreadsheets (procurement / purchase / acquired) with party tag editors and category search/create
- Inventory verification workspace (acquired list picker + verify grid + history)
- Audit page with synchronized pagination and diff-based view changes
- Account password change dialog; admin user deactivate confirmation

---

## Completed

- [x] List-based procurement backend
- [x] Lightweight `ListItemParty` for sources / requestedBy / stockOwner
- [x] Migration with legacy data preservation
- [x] Removed requester/stock-owner modules
- [x] Updated DTOs, services, formatters, tests, docs
- [x] Password change security, audit timeline sync, verification redesign
- [x] Sources / requestedBy persistence, verified records visibility, 5-char SKU
