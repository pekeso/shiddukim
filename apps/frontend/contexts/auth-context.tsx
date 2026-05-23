'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { clearTokens, setTokens } from '@/lib/api';
import type { AuthUser, LoginResponse } from '@/lib/types';

// ── State ────────────────────────────────────────────────────
interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: AuthUser }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case 'CLEAR_USER':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  login: (response: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('authUser');
      const accessToken = localStorage.getItem('accessToken');
      if (stored && accessToken) {
        const user = JSON.parse(stored) as AuthUser;
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = useCallback((response: LoginResponse) => {
    setTokens(response.accessToken, response.refreshToken);
    const user = userFromAccessToken(response.accessToken);
    localStorage.setItem('authUser', JSON.stringify(user));
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function userFromAccessToken(accessToken: string): AuthUser {
  const fallback: AuthUser = { email: '', role: 'MEMBER' };

  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return fallback;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    const parsed = JSON.parse(json) as Partial<AuthUser>;
    return {
      email: parsed.email ?? '',
      role: (parsed.role as AuthUser['role']) ?? 'MEMBER',
    };
  } catch {
    return fallback;
  }
}
