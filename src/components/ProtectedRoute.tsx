
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-brand-navy" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to landing page instead of login directly for better UX
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
