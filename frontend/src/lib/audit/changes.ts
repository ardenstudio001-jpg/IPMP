import type { AuditLog } from '@/lib/api/types';

const PRICING_FIELD_LABELS: Record<string, string> = {
  investmentFundRate: 'Investment Fund Rate',
  operationProfitRate: 'Operation Profit Rate',
  netProfitRateOfOP: 'Net Profit Rate of OP',
  payrollRateOfOPMinusNP: 'Payroll Rate',
  otherCostsRateOfOPMinusNP: 'Other Costs Rate',
  salesTaxRate20: 'Sales Tax Rate (20%)',
  salesTaxRate4: 'Sales Tax Rate (4%)',
  name: 'Name',
  isActive: 'Active',
};

const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: 'Product Name',
  sku: 'SKU',
  imageUrl: 'Product Image',
  categoryId: 'Category',
  procurementType: 'Procurement Type',
  productDetails: 'Product Details',
  description: 'Description',
  unit: 'Unit',
};

const LIST_ITEM_FIELD_LABELS: Record<string, string> = {
  quantity: 'Quantity',
  costPrice: 'Cost Price',
  regularPrice: 'Regular Price',
  salesPrice: 'Sales Price',
  finalSellingPrice: 'Final Selling Price',
  sources: 'Sources',
  requestedBy: 'Requested By',
  stockOwner: 'Stock Owner',
  status: 'Status',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    if ('name' in value && typeof (value as { name: unknown }).name === 'string') {
      return (value as { name: string }).name;
    }
    return JSON.stringify(value, null, 2);
  }
  const str = String(value);
  if (/^\d+(\.\d+)?$/.test(str) && str.includes('.')) {
    const num = Number(str);
    if (num <= 1 && num >= 0) {
      return `${(num * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
    }
  }
  return str;
}

function resolveLabel(key: string, entityType?: string): string {
  if (entityType === 'PricingSetting' || key in PRICING_FIELD_LABELS) {
    return PRICING_FIELD_LABELS[key] ?? key;
  }
  if (key.startsWith('product.') || key in PRODUCT_FIELD_LABELS) {
    const field = key.replace(/^product\./, '');
    return PRODUCT_FIELD_LABELS[field] ?? field;
  }
  return LIST_ITEM_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

export interface AuditFieldChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  oldDisplay: string;
  newDisplay: string;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function flattenForDiff(
  value: unknown,
  prefix = '',
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return prefix ? { [prefix]: value } : {};
  }

  const result: Record<string, unknown> = {};
  const nestedProduct = value.product;
  if (isPlainObject(nestedProduct)) {
    for (const [k, v] of Object.entries(nestedProduct)) {
      if (k === 'category' && isPlainObject(v)) {
        result['product.category'] = (v as { name?: string }).name ?? v;
      } else if (k !== 'id' && k !== 'createdAt' && k !== 'updatedAt') {
        result[`product.${k}`] = v;
      }
    }
  }

  for (const [k, v] of Object.entries(value)) {
    if (k === 'product' || k === 'id' || k === 'listId' || k === 'productId') continue;
    if (k === 'list' && isPlainObject(v)) {
      result['listName'] = (v as { name?: string }).name;
      continue;
    }
    if (k === 'verifiedBy' || k === 'listItem' || k === 'user') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v) && !('name' in v && Object.keys(v).length <= 3)) {
      Object.assign(result, flattenForDiff(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

export function getAuditFieldChanges(log: AuditLog): AuditFieldChange[] {
  const oldFlat = flattenForDiff(log.oldValue);
  const newFlat = flattenForDiff(log.newValue);
  const keys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
  const changes: AuditFieldChange[] = [];

  for (const field of keys) {
    const oldValue = oldFlat[field];
    const newValue = newFlat[field];
    if (valuesEqual(oldValue, newValue)) continue;
    if (oldValue === undefined && newValue === undefined) continue;
    changes.push({
      field,
      label: resolveLabel(field, log.entityType),
      oldValue,
      newValue,
      oldDisplay: formatDisplayValue(oldValue),
      newDisplay: formatDisplayValue(newValue),
    });
  }

  return changes;
}

export function getAuditProductSummary(log: AuditLog): {
  productName?: string;
  listName?: string;
} {
  const fromNew = isPlainObject(log.newValue) ? log.newValue : {};
  const fromOld = isPlainObject(log.oldValue) ? log.oldValue : {};
  const product =
    (isPlainObject(fromNew.product) ? fromNew.product : null) ??
    (isPlainObject(fromOld.product) ? fromOld.product : null);
  const list =
    (isPlainObject(fromNew.list) ? fromNew.list : null) ??
    (isPlainObject(fromOld.list) ? fromOld.list : null) ??
    (isPlainObject(fromNew.listItem) && isPlainObject((fromNew.listItem as Record<string, unknown>).list)
      ? (fromNew.listItem as { list: { name?: string } }).list
      : null);

  return {
    productName:
      (product && typeof product.name === 'string' ? product.name : undefined) ??
      (typeof fromNew.name === 'string' ? fromNew.name : undefined),
    listName: list && typeof list.name === 'string' ? list.name : undefined,
  };
}
