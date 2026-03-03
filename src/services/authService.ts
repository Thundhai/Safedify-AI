/**
 * Auth Service — Backend API authentication
 * 
 * All auth operations go through the Express backend which handles
 * JWT tokens, bcrypt password hashing, and SQLite user storage.
 */

import { AuthUser, UserRole, SubscriptionTier } from "../types";
import { apiLogin, apiRegister, apiGetMe, setAuthToken, getAuthToken, apiLoginWith2FA } from './apiService';

const AUTH_KEY = 'hse_auth_user';

// 2FA challenge state — stored temporarily when login requires 2FA
let pending2FAUserId: string | null = null;
export const getPending2FAUserId = () => pending2FAUserId;
export const clearPending2FA = () => { pending2FAUserId = null; };

export const login = async (email: string, password: string): Promise<AuthUser | null | '2fa_required'> => {
    try {
        const data = await apiLogin(email, password);

        // Handle 2FA challenge
        if (data.requires2FA && data.userId) {
            pending2FAUserId = data.userId;
            return '2fa_required';
        }

        if (data.token && data.user) {
            const user: AuthUser = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                tier: (data.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
                avatar: data.user.avatar,
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            return user;
        }
        return null;
    } catch (error: any) {
        console.error('Login failed:', error.message);
        return null;
    }
};

export const completeLoginWith2FA = async (token: string): Promise<AuthUser | null> => {
    if (!pending2FAUserId) return null;
    try {
        const data = await apiLoginWith2FA(pending2FAUserId, token);
        if (data.token && data.user) {
            const user: AuthUser = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                tier: (data.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
                avatar: data.user.avatar,
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            pending2FAUserId = null;
            return user;
        }
        return null;
    } catch (error: any) {
        console.error('2FA login failed:', error.message);
        throw error;
    }
};

export const register = async (name: string, email: string, password: string, role: UserRole): Promise<AuthUser | null> => {
    try {
        const data = await apiRegister(name, email, password, role);
        if (data.token && data.user) {
            const user: AuthUser = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                tier: (data.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
                avatar: data.user.avatar,
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            return user;
        }
        return null;
    } catch (error: any) {
        console.error('Registration failed:', error.message);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthToken(null);
};

export const getCurrentUser = (): AuthUser | null => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return null;
        }
    }
    return null;
};

/**
 * Verify current token is still valid with the backend
 */
export const verifySession = async (): Promise<AuthUser | null> => {
    const token = getAuthToken();
    if (!token) return getCurrentUser();
    
    try {
        const data = await apiGetMe();
        if (data.user) {
            const user: AuthUser = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                tier: (data.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
                avatar: data.user.avatar,
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            return user;
        }
    } catch {
        // Token expired or invalid — keep local user for now
    }
    return getCurrentUser();
};
