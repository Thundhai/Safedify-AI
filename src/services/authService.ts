/**
 * Auth Service — Backend API authentication
 * 
 * All auth operations go through the Express backend which handles
 * JWT tokens, bcrypt password hashing, and SQLite user storage.
 */

import { AuthUser, UserRole, SubscriptionTier } from "../types";
import { apiLogin, apiRegister, apiGetMe, setAuthToken, getAuthToken, apiLoginWith2FA, apiUpdateProfile, apiChangePassword } from './apiService';

const AUTH_KEY = 'hse_auth_user';

// 2FA challenge state — stored temporarily when login requires 2FA
let pending2FAChallengeToken: string | null = null;
export const getPending2FAUserId = () => pending2FAChallengeToken;
export const clearPending2FA = () => { pending2FAChallengeToken = null; };

export const login = async (email: string, password: string): Promise<AuthUser | null | '2fa_required' | 'password_change_required'> => {
    try {
        const data = await apiLogin(email, password);

        // Handle 2FA challenge
        if (data.requires2FA && data.challengeToken) {
            pending2FAChallengeToken = data.challengeToken;
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
                org_id: data.user.org_id,
                org_name: data.user.org_name,
            };
            // Store token so change-password API call works
            setAuthToken(data.token);
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));

            // Handle forced password change for seeded/reset accounts
            if (data.requiresPasswordChange) {
                return 'password_change_required';
            }

            return user;
        }
        return null;
    } catch (error: any) {
        console.error('Login failed:', error.message);
        throw error;
    }
};

export const completeLoginWith2FA = async (token: string): Promise<AuthUser | null> => {
    if (!pending2FAChallengeToken) return null;
    try {
        const data = await apiLoginWith2FA(pending2FAChallengeToken, token);
        if (data.token && data.user) {
            const user: AuthUser = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                tier: (data.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
                avatar: data.user.avatar,
                org_id: data.user.org_id,
                org_name: data.user.org_name,
            };
            setAuthToken(data.token);
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            pending2FAChallengeToken = null;
            return user;
        }
        return null;
    } catch (error: any) {
        console.error('2FA login failed:', error.message);
        throw error;
    }
};

export const register = async (name: string, email: string, password: string, role: UserRole, organizationName?: string, inviteToken?: string): Promise<AuthUser | null | 'verification_required'> => {
    try {
        const data = await apiRegister(name, email, password, role, organizationName, inviteToken);
        
        // Email verification required — user must check inbox
        if (data.requiresVerification) {
            return 'verification_required';
        }
        
        if (data.token && data.user) {
            const user: AuthUser = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                tier: (data.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
                avatar: data.user.avatar,
                org_id: data.user.org_id,
                org_name: data.user.org_name,
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
    if (!token) {
        // No token in storage — ensure user data is also cleared
        logout();
        return null;
    }
    
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
                org_id: data.user.org_id,
                org_name: data.user.org_name,
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            return user;
        }
    } catch {
        // Token expired or invalid — force full logout so user is redirected to login
        logout();
        return null;
    }
    logout();
    return null;
};

export const updateProfile = async (data: { name: string }): Promise<AuthUser | null> => {
    const result = await apiUpdateProfile(data);
    if (result.user) {
        const user: AuthUser = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            tier: (result.user.tier as SubscriptionTier) || SubscriptionTier.FREE,
            avatar: result.user.avatar,
            org_id: result.user.org_id,
            org_name: result.user.org_name,
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return user;
    }
    return null;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<string> => {
    const result = await apiChangePassword(currentPassword, newPassword);
    return result.message;
};
