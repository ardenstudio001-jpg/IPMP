const SKU_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSkuSuffix(length = 5): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SKU_ALPHABET[bytes[i]! % SKU_ALPHABET.length];
  }
  return result;
}

/** Generates a 5-character SKU candidate (no prefix). */
export function generateSkuCandidate(): string {
  return randomSkuSuffix(5);
}
