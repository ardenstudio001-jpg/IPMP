export type Role = 'ADMIN' | 'INVENTORY' | 'PROCUREMENT';

export type ListType = 'PROCUREMENT' | 'PURCHASE' | 'ACQUIRED';

export type ListItemStatus = 'ACTIVE' | 'REMOVED' | 'VERIFIED';

export type ProcurementType = 'LOCAL' | 'IMPORTED' | 'EMERGENCY' | 'STANDARD';

export type VerificationStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'PARTIAL'
  | 'MISSING'
  | 'DAMAGED';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export type NotificationType =
  | 'PROCUREMENT_LIST_CREATED'
  | 'ITEM_MOVED_TO_PURCHASE'
  | 'PURCHASE_LIST_READY'
  | 'ITEM_MOVED_TO_ACQUIRED'
  | 'ACQUIRED_LIST_READY'
  | 'VERIFICATION_PENDING'
  | 'VERIFICATION_MISMATCH'
  | 'LIST_ITEM_PRICING_UPDATED'
  | 'USER_INVITATION_SENT'
  | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ListsPaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  imageUrl: string | null;
  categoryId: string;
  procurementType: ProcurementType;
  productDetails: string | null;
  description: string | null;
  unit: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface WorkflowListSummary {
  id: string;
  name: string;
  type: ListType;
  createdAt: string;
  createdById: string;
  createdBy?: User;
  _count?: { items: number };
}

export interface ListItemParentRef {
  id: string;
  listId: string;
  status: ListItemStatus;
}

export interface ListItem {
  id: string;
  listId: string;
  productId: string;
  quantity: number;
  costPrice: string | null;
  regularPrice: string | null;
  salesPrice: string | null;
  minimum20: string | null;
  minimum4: string | null;
  finalSellingPrice: string | null;
  status: ListItemStatus;
  parentItemId: string | null;
  removedAt: string | null;
  removedById: string | null;
  createdAt: string;
  sources: string[];
  requestedBy: string[];
  stockOwner: string[];
  product: Product;
  list?: {
    id: string;
    name: string;
    type: ListType;
    createdAt: string;
    createdById: string;
  };
  parentItem?: ListItemParentRef | null;
}

export interface WorkflowListDetail extends WorkflowListSummary {
  items: ListItem[];
}

export interface LineageResponse {
  item: ListItem;
  ancestors: ListItem[];
  descendants: ListItem[];
}

export interface InventoryVerification {
  id: string;
  listItemId: string;
  verifiedById: string;
  expectedQuantity: number;
  actualQuantity: number;
  status: VerificationStatus;
  notes: string | null;
  verifiedAt: string;
  listItem?: ListItem;
  verifiedBy?: User;
}

export interface PricingSetting {
  id: string;
  investmentFundRate: string;
  operationProfitRate: string;
  netProfitRateOfOP: string;
  payrollRateOfOPMinusNP: string;
  otherCostsRateOfOPMinusNP: string;
  salesTaxRate20: string;
  salesTaxRate4: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  entitySku: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  status: InvitationStatus;
  invitedById: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  invitedBy?: User;
}

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/dashboard',
  INVENTORY: '/verification',
  PROCUREMENT: '/lists/procurement',
};

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  PROCUREMENT: 'Procurement',
  PURCHASE: 'Purchase',
  ACQUIRED: 'Acquired',
};

export const LIST_ITEM_STATUS_LABELS: Record<ListItemStatus, string> = {
  ACTIVE: 'Active',
  REMOVED: 'Removed',
  VERIFIED: 'Verified',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: 'Pending',
  MATCHED: 'Matched',
  PARTIAL: 'Partial',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
};

export const PROCUREMENT_TYPE_LABELS: Record<ProcurementType, string> = {
  LOCAL: 'Local',
  IMPORTED: 'Imported',
  EMERGENCY: 'Emergency',
  STANDARD: 'Standard',
};

export const LIST_TYPE_ROUTES: Record<ListType, string> = {
  PROCUREMENT: '/lists/procurement',
  PURCHASE: '/lists/purchase',
  ACQUIRED: '/lists/acquired',
};
