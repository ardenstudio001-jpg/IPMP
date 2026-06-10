import { randomBytes } from 'crypto';

const SKU_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSkuSuffix(length = 5): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SKU_ALPHABET[bytes[i] % SKU_ALPHABET.length];
  }
  return result;
}

/** Generates a unique 5-character SKU (no prefix). */
export function generateSkuCandidate(): string {
  return randomSkuSuffix(5);
}
