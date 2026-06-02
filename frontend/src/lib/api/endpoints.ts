import { apiClient } from '@/lib/api/client';
import type {
  AuditLog,
  AuthResponse,
  Category,
  InventoryVerification,
  Invitation,
  LineageResponse,
  ListItem,
  ListType,
  ListsPaginatedResponse,
  Notification,
  PaginatedResponse,
  PricingSetting,
  ProcurementType,
  Product,
  Role,
  User,
  VerificationStatus,
  WorkflowListDetail,
  WorkflowListSummary,
} from '@/lib/api/types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>(
      '/auth/refresh',
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),
};

export const usersApi = {
  me: () => apiClient.get<User>('/users/me'),
  list: () => apiClient.get<User[]>('/users'),
  create: (data: {
    email: string;
    password: string;
    role: Role;
    firstName?: string;
    lastName?: string;
  }) => apiClient.post<User>('/users', data),
  update: (id: string, data: Partial<User & { isActive?: boolean }>) =>
    apiClient.patch<User>(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

export const productsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  }) => apiClient.get<PaginatedResponse<Product>>('/products', { params }),
  skuPreview: () => apiClient.get<{ sku: string }>('/products/sku-preview'),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
  create: (data: {
    name: string;
    categoryId: string;
    procurementType: ProcurementType;
    unit: string;
    sku?: string;
    imageUrl?: string;
    productDetails?: string;
    description?: string;
  }) => apiClient.post<Product>('/products', data),
  update: (
    id: string,
    data: Partial<{
      sku: string;
      name: string;
      imageUrl: string;
      categoryId: string;
      procurementType: ProcurementType;
      productDetails: string;
      description: string;
      unit: string;
    }>,
  ) => apiClient.patch<Product>(`/products/${id}`, data),
};

export const listsApi = {
  create: (data: { name: string; type: ListType }) =>
    apiClient.post<WorkflowListSummary>('/lists', data),
  list: (params?: {
    type?: ListType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<ListsPaginatedResponse<WorkflowListSummary>>('/lists', {
      params,
    }),
  get: (id: string, includeRemoved?: boolean) =>
    apiClient.get<WorkflowListDetail>(`/lists/${id}`, {
      params: includeRemoved ? { includeRemoved: 'true' } : undefined,
    }),
};

export const listItemsApi = {
  add: (
    listId: string,
    data: {
      productId?: string;
      sku?: string;
      name: string;
      categoryId: string;
      procurementType: ProcurementType;
      unit: string;
      quantity: number;
      imageUrl?: string;
      productDetails?: string;
      description?: string;
      costPrice?: number;
      regularPrice?: number;
      salesPrice?: number;
      finalSellingPrice?: number;
      sources?: string[];
      requestedBy?: string[];
      stockOwner?: string[];
    },
  ) => apiClient.post<ListItem>(`/lists/${listId}/items`, data),
  get: (id: string) => apiClient.get<ListItem>(`/list-items/${id}`),
  update: (
    id: string,
    data: Partial<{
      quantity: number;
      costPrice: number;
      regularPrice: number;
      salesPrice: number;
      finalSellingPrice: number;
      sources: string[];
      requestedBy: string[];
      stockOwner: string[];
    }>,
  ) => apiClient.patch<ListItem>(`/list-items/${id}`, data),
  lineage: (id: string) =>
    apiClient.get<LineageResponse>(`/list-items/${id}/lineage`),
  moveToPurchase: (data: {
    sourceItemIds: string[];
    purchaseListId?: string;
    newPurchaseList?: { name: string };
  }) => apiClient.post<ListItem[]>('/list-items/move-to-purchase', data),
  moveToAcquired: (data: {
    sourceItemIds: string[];
    acquiredListId?: string;
    newAcquiredList?: { name: string };
  }) => apiClient.post<ListItem[]>('/list-items/move-to-acquired', data),
  rollback: (id: string) =>
    apiClient.post<ListItem>(`/list-items/${id}/rollback`),
};

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  get: (id: string) => apiClient.get<Category>(`/categories/${id}`),
  create: (name: string) => apiClient.post<Category>('/categories', { name }),
  update: (id: string, name: string) =>
    apiClient.patch<Category>(`/categories/${id}`, { name }),
};

export const verificationsApi = {
  list: (params?: {
    listId?: string;
    listItemId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<PaginatedResponse<InventoryVerification>>(
      '/inventory-verifications',
      { params },
    ),
  create: (data: {
    listItemId: string;
    expectedQuantity: number;
    actualQuantity: number;
    notes?: string;
  }) =>
    apiClient.post<InventoryVerification>('/inventory-verifications', data),
  update: (
    id: string,
    data: Partial<{
      actualQuantity: number;
      status: VerificationStatus;
      notes: string;
    }>,
  ) =>
    apiClient.patch<InventoryVerification>(
      `/inventory-verifications/${id}`,
      data,
    ),
};

export const pricingApi = {
  getActive: () => apiClient.get<PricingSetting>('/pricing/settings/active'),
  list: () => apiClient.get<PricingSetting[]>('/pricing/settings'),
  create: (data: {
    investmentFundRate: number;
    operationProfitRate: number;
    netProfitRateOfOP: number;
    payrollRateOfOPMinusNP: number;
    otherCostsRateOfOPMinusNP: number;
    salesTaxRate20: number;
    salesTaxRate4: number;
    name?: string;
  }) => apiClient.post<PricingSetting>('/pricing/settings', data),
  activate: (id: string) =>
    apiClient.patch<PricingSetting>(`/pricing/settings/${id}/activate`),
};

export const auditApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    entityId?: string;
    userId?: string;
    search?: string;
  }) => apiClient.get<PaginatedResponse<AuditLog>>('/audit', { params }),
};

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get<PaginatedResponse<Notification>>('/notifications', {
      params,
    }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const invitationsApi = {
  list: () => apiClient.get<Invitation[]>('/invitations'),
  create: (email: string, role: Role) =>
    apiClient.post<Invitation>('/invitations', { email, role }),
  revoke: (id: string) => apiClient.delete(`/invitations/${id}`),
  accept: (data: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => apiClient.post('/invitations/accept', data),
};
