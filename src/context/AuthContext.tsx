
import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { AuthUser, UserRole, Permission, UserRoles } from '../types';
import { getCurrentUser, login as authLogin, logout as authLogout, register as authRegister, verifySession, completeLoginWith2FA, updateProfile as authUpdateProfile } from '../services/authService';
import { getRoles } from '../services/storageService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean | '2fa_required'>;
  loginWith2FA: (token: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  checkPermission: (permission: Permission) => boolean;
  updateProfile: (data: { name: string }) => Promise<boolean>;
}

// Persist context across Vite HMR to prevent "useAuth must be used within AuthProvider" errors
const AuthContext: React.Context<AuthContextType | undefined> =
  (globalThis as any).__SAFEDIFY_AUTH_CTX__ ||
  createContext<AuthContextType | undefined>(undefined);
(globalThis as any).__SAFEDIFY_AUTH_CTX__ = AuthContext;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const cachedRoles = useRef<any[]>([]);

  // Load roles from backend and cache them for synchronous permission checks
  const loadRoles = async () => {
    try {
      const roles = await getRoles();
      cachedRoles.current = roles;
    } catch (e) {
      console.error('Failed to load roles', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      // First load from local storage for instant UI, then verify with backend
      const storedUser = getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        await loadRoles();
        // Verify session with backend in the background (updates localStorage if role/tier changed)
        const verified = await verifySession();
        if (verified) {
          setUser(verified);
        } else {
          // Token invalid or user deleted — log out
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string): Promise<boolean | '2fa_required'> => {
    const result = await authLogin(email, password);
    if (result === '2fa_required') return '2fa_required';
    if (result && typeof result === 'object') {
      setUser(result);
      await loadRoles();
      return true;
    }
    return false;
  };

  const loginWith2FA = async (token: string): Promise<boolean> => {
    const loggedUser = await completeLoginWith2FA(token);
    if (loggedUser) {
      setUser(loggedUser);
      await loadRoles();
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<boolean> => {
      try {
          const registeredUser = await authRegister(name, email, password, role);
          if (registeredUser) {
              setUser(registeredUser);
              await loadRoles();
              return true;
          }
          return false;
      } catch (error) {
          console.error("Registration failed", error);
          throw error;
      }
  };

  const updateProfile = async (data: { name: string }): Promise<boolean> => {
    const updated = await authUpdateProfile(data);
    if (updated) {
      setUser(updated);
      return true;
    }
    return false;
  };

  const logout = () => {
    authLogout();
    setUser(null);
    cachedRoles.current = [];
  };

  const checkPermission = (permission: Permission): boolean => {
      if (!user) return false;
      // Admin bypass for legacy/simplicity
      if (user.role === UserRoles.ADMIN) return true;

      // Use cached roles for synchronous permission check
      const userRole = cachedRoles.current.find((r: any) => r.name === user.role);
      
      if (!userRole) {
          // Deny by default if role not loaded yet (safe default)
          return false;
      }

      return userRole.permissions.includes(permission);
  };

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    loginWith2FA,
    register,
    logout,
    loading,
    checkPermission,
    updateProfile,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
