import { ListItemWithRelations } from '../selects/list-item.select';
import { decimalToString } from './decimal.util';
import { groupPartiesByRole } from './list-item-party.util';

export function formatListItem(item: ListItemWithRelations) {
  const { parties, ...rest } = item;
  const { sources, requestedBy, stockOwner } = groupPartiesByRole(parties);

  return {
    ...rest,
    costPrice: decimalToString(item.costPrice),
    regularPrice: decimalToString(item.regularPrice),
    salesPrice: decimalToString(item.salesPrice),
    minimum20: decimalToString(item.minimum20),
    minimum4: decimalToString(item.minimum4),
    finalSellingPrice: decimalToString(item.finalSellingPrice),
    sources,
    requestedBy,
    stockOwner,
  };
}
