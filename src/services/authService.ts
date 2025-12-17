
import { AuthUser, UserRole, UserRoles, SubscriptionTier } from "../types";

const AUTH_KEY = 'hse_auth_user';
const REGISTERED_USERS_KEY = 'hse_registered_users';

// Mock credentials database
const MOCK_USERS = [
    {
        email: 'admin@safedify.com',
        password: 'password',
        user: {
            id: 'u-001',
            name: 'John Doe',
            email: 'admin@safedify.com',
            role: UserRoles.MANAGER, // John Doe is HSE Manager in Layout
            tier: SubscriptionTier.ENTERPRISE,
            avatar: 'JD'
        }
    },
    {
        email: 'worker@safedify.com',
        password: 'password',
        user: {
            id: 'u-002',
            name: 'Robert Fox',
            email: 'worker@safedify.com',
            role: UserRoles.WORKER,
            tier: SubscriptionTier.FREE,
            avatar: 'RF'
        }
    },
    {
        email: 'supervisor@safedify.com',
        password: 'password',
        user: {
            id: 'u-003',
            name: 'Sarah Connor',
            email: 'supervisor@safedify.com',
            role: UserRoles.SUPERVISOR,
            tier: SubscriptionTier.PRO,
            avatar: 'SC'
        }
    }
];

const getRegisteredUsers = () => {
    const stored = localStorage.getItem(REGISTERED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
};

const getAllUsers = () => {
    return [...MOCK_USERS, ...getRegisteredUsers()];
};

export const login = async (email: string, password: string): Promise<AuthUser | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const allUsers = getAllUsers();
    const account = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (account) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(account.user));
        return account.user;
    }
    
    return null;
};

export const register = async (name: string, email: string, password: string, role: UserRole): Promise<AuthUser | null> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const allUsers = getAllUsers();
    if (allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("Email already registered");
    }

    const newUser = {
        email,
        password,
        user: {
            id: `u-${Date.now()}`,
            name,
            email,
            role,
            tier: SubscriptionTier.FREE, // Default to Free
            avatar: name.charAt(0).toUpperCase()
        }
    };

    // Save to local storage persistence
    const currentRegistered = getRegisteredUsers();
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([...currentRegistered, newUser]));

    // Log them in immediately
    localStorage.setItem(AUTH_KEY, JSON.stringify(newUser.user));
    return newUser.user;
};

export const logout = () => {
    localStorage.removeItem(AUTH_KEY);
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
