
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStorageUsage, clearUserData } from '../services/storageService';
import { SubscriptionTier } from '../types';
import { User, Shield, CreditCard, HardDrive, AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const TwoFactorSetup = lazy(() => import('./TwoFactorSetup'));

export const ProfileSettings: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [usage, setUsage] = useState(0);
    const [usagePercent, setUsagePercent] = useState(0);

    const LIMIT_FREE = 5 * 1024 * 1024; // 5MB
    const LIMIT_PRO = 100 * 1024 * 1024; // 100MB (Mock)

    useEffect(() => {
        const bytes = getStorageUsage();
        setUsage(bytes);
        const limit = user?.tier === SubscriptionTier.FREE ? LIMIT_FREE : LIMIT_PRO;
        setUsagePercent(Math.min(100, (bytes / limit) * 100));
    }, [user]);

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleClearData = () => {
        if (confirm("WARNING: This will delete ALL local data (Incidents, Photos, etc). This action cannot be undone. Are you sure?")) {
            clearUserData();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
                            {user?.avatar || user?.name?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{user?.name}</h2>
                            <p className="text-slate-500">{user?.email}</p>
                            <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded uppercase font-bold">
                                {user?.role}
                            </span>
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Shield size={16} /> Plan Details
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-700">{user?.tier} Plan</p>
                                <p className="text-xs text-slate-500">
                                    {user?.tier === SubscriptionTier.FREE ? 'Basic features active' : 'All features unlocked'}
                                </p>
                            </div>
                            {user?.tier === SubscriptionTier.FREE && (
                                <button 
                                    onClick={() => navigate('/pricing')}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-700"
                                >
                                    Upgrade
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Storage & Data */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <HardDrive size={16} /> Storage Usage (Local)
                        </h3>
                        
                        <div className="mb-2 flex justify-between text-xs text-slate-600 font-medium">
                            <span>{formatBytes(usage)} used</span>
                            <span>{user?.tier === SubscriptionTier.FREE ? '5 MB Limit' : '100 MB Limit'}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4">
                            <div 
                                className={`h-2.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-orange-500' : 'bg-blue-600'}`} 
                                style={{ width: `${usagePercent}%` }}
                            ></div>
                        </div>
                        
                        {usagePercent > 80 && (
                            <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>You are running low on storage space. Consider syncing or deleting old records.</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
                        <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                            <Trash2 size={16} /> Danger Zone
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Clear all local data stored on this device. This cannot be undone.
                        </p>
                        <button 
                            onClick={handleClearData}
                            className="w-full border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                            Reset All Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Two-Factor Authentication */}
            <Suspense fallback={<div className="animate-pulse bg-slate-100 rounded-xl h-40" />}>
              <TwoFactorSetup />
            </Suspense>
        </div>
    );
};
