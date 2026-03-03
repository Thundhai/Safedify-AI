
import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { AuthUser, UserRole, Permission, UserRoles } from '../types';
import { getCurrentUser, login as authLogin, logout as authLogout, register as authRegister } from '../services/authService';
import { getRoles } from '../services/storageService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  checkPermission: (permission: Permission) => boolean;
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
      const storedUser = getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        await loadRoles();
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const loggedUser = await authLogin(email, password);
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, loading, checkPermission }}>
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
