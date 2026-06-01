import { apiClient } from '@/lib/api/client';
import type {
  AuditLog,
  AuthResponse,
  Invitation,
  Notification,
  PaginatedResponse,
  PricingSetting,
  Product,
  ProductStats,
  Role,
  User,
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
    status?: string;
  }) => apiClient.get<PaginatedResponse<Product>>('/products', { params }),
  stats: () => apiClient.get<ProductStats>('/products/stats'),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
  create: (data: {
    name: string;
    quantity: number;
    unit: string;
    sku?: string;
    oldSellingPrice?: number;
  }) => apiClient.post<Product>('/products', data),
  update: (
    id: string,
    data: Partial<{
      sku: string;
      name: string;
      quantity: number;
      unit: string;
      oldSellingPrice: number;
      unitCostPrice: number;
    }>,
  ) => apiClient.patch<Product>(`/products/${id}`, data),
  applyCosting: (id: string, unitCostPrice: number) =>
    apiClient.patch<Product>(`/products/${id}/costing`, { unitCostPrice }),
  approve: (id: string, finalSellingPrice: number, printed: boolean) =>
    apiClient.patch<Product>(`/products/${id}/approve`, {
      finalSellingPrice,
      printed,
    }),
  reject: (id: string, reason?: string) =>
    apiClient.patch<Product>(`/products/${id}/reject`, { reason }),
  updatePrinted: (id: string, printed: boolean) =>
    apiClient.patch<Product>(`/products/${id}/printed`, { printed }),
  updateFinalPrice: (id: string, finalSellingPrice: number) =>
    apiClient.patch<Product>(`/products/${id}/final-selling-price`, {
      finalSellingPrice,
    }),
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
