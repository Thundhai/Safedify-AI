
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SubscriptionTier } from '../types';
import { Lock, Sparkles } from 'lucide-react';

interface FeatureGateProps {
  children: React.ReactNode;
  requiredTier: SubscriptionTier;
  fallback?: React.ReactNode;
  featureName?: string;
  fullPage?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  children, 
  requiredTier, 
  fallback, 
  featureName = "Premium Feature",
  fullPage = false
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const tiers = [SubscriptionTier.FREE, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE];
  const userTierIndex = tiers.indexOf(user?.tier || SubscriptionTier.FREE);
  const requiredTierIndex = tiers.indexOf(requiredTier);

  if (userTierIndex >= requiredTierIndex) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  if (fullPage) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-in fade-in">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Lock size={40} className="text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {requiredTier} Plan Required
            </h2>
            <p className="text-slate-500 max-w-md mb-8">
                The <b>{featureName}</b> feature is available exclusively on the {requiredTier} plan. 
                Upgrade now to unlock full access.
            </p>
            <button 
                onClick={() => navigate('/pricing')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
                <Sparkles size={18} /> Upgrade Plan
            </button>
        </div>
      );
  }

  // Inline lock (e.g., for specific buttons) — don't mount children to prevent side-effects
  return (
    <div className="relative group cursor-not-allowed inline-block">
        <div className="flex items-center justify-center px-4 py-2">
            <div className="bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-sm transform transition-transform group-hover:scale-105">
                <Lock size={12} className="text-yellow-400" />
                <span className="font-bold">{requiredTier} — {featureName}</span>
            </div>
        </div>
        <div className="absolute inset-0 z-10" onClick={() => navigate('/pricing')}></div>
    </div>
  );
};
