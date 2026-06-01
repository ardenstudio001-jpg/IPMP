'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, usersApi } from '@/lib/api/endpoints';
import type { Role, User } from '@/lib/api/types';
import { ROLE_HOME } from '@/lib/api/types';
import {
  clearSession,
  getTokens,
  getUserFromStorage,
  setTokens,
  setUserInStorage,
} from '@/lib/auth/session';
import { getErrorMessage, tryRefreshSession } from '@/lib/api/client';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      setUser(null);
      return;
    }
    const { data } = await usersApi.me();
    setUser(data);
    setUserInStorage(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = getUserFromStorage();
      const { accessToken, refreshToken } = getTokens();
      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }
      if (stored) setUser(stored);
      try {
        if (!accessToken && refreshToken) {
          const restored = await tryRefreshSession();
          if (!restored) {
            setUser(null);
            return;
          }
        }
        await refreshUser();
      } catch {
        const restored = await tryRefreshSession();
        if (restored) {
          try {
            await refreshUser();
            return;
          } catch {
            // fall through to clear
          }
        }
        clearSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const { data } = await authApi.login(email, password);
      setTokens(data.accessToken, data.refreshToken, remember);
      setUserInStorage(data.user, remember);
      setUser(data.user);
      router.replace(ROLE_HOME[data.user.role as Role]);
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      clearSession();
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireAuth(allowedRoles?: Role[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [user, isLoading, allowedRoles, router]);

  return { user, isLoading };
}
