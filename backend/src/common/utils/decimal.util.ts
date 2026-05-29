import { Decimal } from '@prisma/client/runtime/client';

export function toDecimal(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value);
}

export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function decimalToNumber(
  value: Decimal | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }
  return value.toNumber();
}

export function decimalToString(
  value: Decimal | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  return roundMoney(value).toFixed(2);
}
