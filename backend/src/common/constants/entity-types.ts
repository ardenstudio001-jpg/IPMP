export const EntityType = {
  Product: 'Product',
  PricingSetting: 'PricingSetting',
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];
