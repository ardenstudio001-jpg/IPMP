import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  clearSession,
  getTokens,
  setTokens,
  setUserInStorage,
} from '@/lib/auth/session';
import type { AuthResponse } from '@/lib/api/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(options?: {
  redirectOnFailure?: boolean;
}): Promise<string | null> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<AuthResponse>(
      `${API_URL}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );
    setTokens(data.accessToken, data.refreshToken);
    setUserInStorage(data.user);
    return data.accessToken;
  } catch {
    clearSession();
    if (options?.redirectOnFailure !== false && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }
}

/** Attempt silent refresh without redirecting (e.g. on app init). */
export async function tryRefreshSession(): Promise<boolean> {
  const { accessToken, refreshToken } = getTokens();
  if (accessToken) return true;
  if (!refreshToken) return false;
  const token = await refreshAccessToken({ redirectOnFailure: false });
  return Boolean(token);
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] };
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
