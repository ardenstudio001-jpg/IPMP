'use client';

import { formatCurrency, formatDate } from '@/lib/utils';

export function currencyFormatter(params: { value: string | null }) {
  return formatCurrency(params.value);
}

export function dateFormatter(params: { value: string }) {
  return params.value ? formatDate(params.value) : '—';
}
