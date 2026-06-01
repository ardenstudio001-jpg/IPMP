/**
 * Display-only Ghana Cedis formatting for user-facing strings (notifications, etc.).
 */
export function formatGhsDisplay(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  return `₵${num.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
