import { ListItemParty, PartyRole } from '@prisma/client';

export type PartyNameGroups = {
  sources: string[];
  requestedBy: string[];
  stockOwner: string[];
};

export function normalizePartyNames(names?: string[]): string[] {
  if (!names?.length) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function groupPartiesByRole(
  parties: Pick<ListItemParty, 'name' | 'role'>[],
): PartyNameGroups {
  const groups: PartyNameGroups = {
    sources: [],
    requestedBy: [],
    stockOwner: [],
  };
  for (const party of parties) {
    switch (party.role) {
      case PartyRole.SOURCE:
        groups.sources.push(party.name);
        break;
      case PartyRole.REQUESTED_BY:
        groups.requestedBy.push(party.name);
        break;
      case PartyRole.STOCK_OWNER:
        groups.stockOwner.push(party.name);
        break;
    }
  }
  return {
    sources: normalizePartyNames(groups.sources),
    requestedBy: normalizePartyNames(groups.requestedBy),
    stockOwner: normalizePartyNames(groups.stockOwner),
  };
}

export function buildPartyCreateRows(
  listItemId: string,
  groups: Partial<PartyNameGroups>,
): { listItemId: string; name: string; role: PartyRole }[] {
  const rows: { listItemId: string; name: string; role: PartyRole }[] = [];
  for (const name of normalizePartyNames(groups.sources)) {
    rows.push({ listItemId, name, role: PartyRole.SOURCE });
  }
  for (const name of normalizePartyNames(groups.requestedBy)) {
    rows.push({ listItemId, name, role: PartyRole.REQUESTED_BY });
  }
  for (const name of normalizePartyNames(groups.stockOwner)) {
    rows.push({ listItemId, name, role: PartyRole.STOCK_OWNER });
  }
  return rows;
}

export type PartyCopyMode = 'same_roles' | 'to_acquired';

export function partiesForCopy(
  sourceParties: Pick<ListItemParty, 'name' | 'role'>[],
  mode: PartyCopyMode,
): Partial<PartyNameGroups> {
  const grouped = groupPartiesByRole(sourceParties);
  if (mode === 'same_roles') {
    return grouped;
  }
  const stockOwner = normalizePartyNames([
    ...grouped.stockOwner,
    ...grouped.requestedBy,
  ]);
  return {
    sources: grouped.sources,
    stockOwner,
  };
}
