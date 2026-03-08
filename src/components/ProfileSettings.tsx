
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { getStorageUsage, clearUserData } from '../services/storageService';
import { SubscriptionTier } from '../types';
import { User, Shield, HardDrive, AlertTriangle, Trash2, Pencil, Lock, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
const TwoFactorSetup = lazy(() => import('./TwoFactorSetup'));

export const ProfileSettings: React.FC = () => {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [usage, setUsage] = useState(0);
    const [usagePercent, setUsagePercent] = useState(0);

    // Profile editing
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(user?.name || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const LIMIT_FREE = 5 * 1024 * 1024;
    const LIMIT_PRO = 100 * 1024 * 1024;

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
            toast.success('All local data cleared.');
        }
    };

    const handleSaveName = async () => {
        if (!nameValue.trim() || nameValue.trim().length < 2) {
            toast.error('Name must be at least 2 characters');
            return;
        }
        setSavingProfile(true);
        try {
            const ok = await updateProfile({ name: nameValue.trim() });
            if (ok) {
                toast.success('Profile updated');
                setEditingName(false);
            } else {
                toast.error('Failed to update profile');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update profile');
        }
        setSavingProfile(false);
    };

    const handleChangePassword = async () => {
        if (!currentPassword) { toast.error('Enter current password'); return; }
        if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
        setChangingPassword(true);
        try {
            const msg = await changePassword(currentPassword, newPassword);
            toast.success(msg || 'Password changed');
            setShowPasswordForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to change password');
        }
        setChangingPassword(false);
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
                        <div className="flex-1 min-w-0">
                            {editingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={nameValue}
                                        onChange={e => setNameValue(e.target.value)}
                                        className="text-lg font-bold text-slate-800 border border-slate-300 rounded-lg px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(user?.name || ''); } }}
                                    />
                                    <button onClick={handleSaveName} disabled={savingProfile} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50">
                                        <Check size={16} />
                                    </button>
                                    <button onClick={() => { setEditingName(false); setNameValue(user?.name || ''); }} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-800 truncate">{user?.name}</h2>
                                    <button onClick={() => { setEditingName(true); setNameValue(user?.name || ''); }} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit name">
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            )}
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

                    {/* Change Password */}
                    <div className="border-t border-slate-100 pt-4 mt-4">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Lock size={16} /> Password
                        </h3>
                        {!showPasswordForm ? (
                            <button
                                onClick={() => setShowPasswordForm(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                                Change Password
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    placeholder="Current password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                    type="password"
                                    placeholder="New password (min 8 chars)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={changingPassword}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {changingPassword ? 'Saving...' : 'Update Password'}
                                    </button>
                                    <button
                                        onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                                        className="px-4 py-2 text-slate-600 text-sm rounded-lg font-medium hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
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
