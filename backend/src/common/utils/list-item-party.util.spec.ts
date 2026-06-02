import { PartyRole } from '@prisma/client';
import {
  groupPartiesByRole,
  normalizePartyNames,
  partiesForCopy,
} from './list-item-party.util';

describe('list-item-party.util', () => {
  it('deduplicates and trims party names', () => {
    expect(normalizePartyNames(['  ABC ', 'abc', 'XYZ', ''])).toEqual([
      'ABC',
      'XYZ',
    ]);
  });

  it('groups parties by role', () => {
    const grouped = groupPartiesByRole([
      { name: 'Supplier A', role: PartyRole.SOURCE },
      { name: 'Branch', role: PartyRole.REQUESTED_BY },
    ]);
    expect(grouped.sources).toEqual(['Supplier A']);
    expect(grouped.requestedBy).toEqual(['Branch']);
  });

  it('maps requestedBy to stockOwner on acquired copy', () => {
    const groups = partiesForCopy(
      [
        { name: 'Supplier', role: PartyRole.SOURCE },
        { name: 'Spintex', role: PartyRole.REQUESTED_BY },
      ],
      'to_acquired',
    );
    expect(groups.sources).toEqual(['Supplier']);
    expect(groups.stockOwner).toEqual(['Spintex']);
    expect(groups.requestedBy).toBeUndefined();
  });
});
