export type Role = 'ADMIN' | 'INVENTORY' | 'PROCUREMENT';

export type ProductStatus =
  | 'PENDING_COSTING'
  | 'COSTING_COMPLETED'
  | 'APPROVED'
  | 'REJECTED';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export type NotificationType =
  | 'PRODUCT_CREATED'
  | 'COSTING_COMPLETED'
  | 'PRODUCT_APPROVED'
  | 'SELLING_PRICE_CHANGED'
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

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  sku: string | null;
  status: ProductStatus;
  unitCostPrice: string | null;
  totalCostPrice: string | null;
  oldSellingPrice: string | null;
  investmentFund: string | null;
  operationProfit: string | null;
  netProfit: string | null;
  payrollFund: string | null;
  otherCosts: string | null;
  grossProfit: string | null;
  priceBeforeTax: string | null;
  minimum4Percent: string | null;
  minimum20Percent: string | null;
  finalSellingPrice: string | null;
  printed: boolean;
  createdById: string;
  approvedById: string | null;
  costingCompletedById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export interface ProductStats {
  total: number;
  pendingCosting: number;
  approved: number;
  rejected: number;
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
  INVENTORY: '/inventory',
  PROCUREMENT: '/procurement',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  PENDING_COSTING: 'Pending Costing',
  COSTING_COMPLETED: 'Costing Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
