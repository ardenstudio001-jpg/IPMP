const SKU_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSkuSuffix(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SKU_ALPHABET[bytes[i]! % SKU_ALPHABET.length];
  }
  return result;
}

export function generateSkuCandidate(prefix = 'PRD'): string {
  return `${prefix}-${randomSkuSuffix(8)}`;
}
