export const EntityType = {
  Product: 'Product',
  PricingSetting: 'PricingSetting',
  WorkflowList: 'WorkflowList',
  ListItem: 'ListItem',
  ListItemParty: 'ListItemParty',
  ProductMovement: 'ProductMovement',
  InventoryVerification: 'InventoryVerification',
  Category: 'Category',
  User: 'User',
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];
