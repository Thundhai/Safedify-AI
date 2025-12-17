
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const loggedUser = await authLogin(email, password);
    if (loggedUser) {
      setUser(loggedUser);
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<boolean> => {
      try {
          const registeredUser = await authRegister(name, email, password, role);
          if (registeredUser) {
              setUser(registeredUser);
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
  };

  const checkPermission = (permission: Permission): boolean => {
      if (!user) return false;
      // Admin bypass for legacy/simplicity
      if (user.role === UserRoles.ADMIN) return true;

      // Dynamic check
      const roles = getRoles();
      const userRole = roles.find(r => r.name === user.role);
      
      if (!userRole) {
          // Fallback if role missing in DB (e.g. migration issue)
          return true; // Or strictly false depending on security policy
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
