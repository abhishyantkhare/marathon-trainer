'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User, ApiError } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (err) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: err instanceof ApiError ? err.message : 'Failed to fetch user',
      });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      await authApi.logout();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const refresh = () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchUser();
  };

  return (
    <AuthContext.Provider value={{ ...state, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
