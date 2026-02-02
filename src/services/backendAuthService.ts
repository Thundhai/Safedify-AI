// Backend-connected authentication service
import api, { tokenManager } from './apiService';
import { AuthUser, UserRole } from '../types';

interface LoginResponse {
  message: string;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface RegisterResponse {
  message: string;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const backendLogin = async (email: string, password: string): Promise<AuthUser | null> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { email, password }, false);

    // Store tokens
    tokenManager.setAccessToken(response.accessToken);
    tokenManager.setRefreshToken(response.refreshToken);

    // Store user data in localStorage for compatibility with existing code
    localStorage.setItem('hse_auth_user', JSON.stringify(response.user));

    return response.user;
  } catch (error) {
    console.error('Backend login error:', error);
    return null;
  }
};

export const backendRegister = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<AuthUser | null> => {
  try {
    const response = await api.post<RegisterResponse>(
      '/auth/register',
      { name, email, password, role },
      false
    );

    // Store tokens
    tokenManager.setAccessToken(response.accessToken);
    tokenManager.setRefreshToken(response.refreshToken);

    // Store user data
    localStorage.setItem('hse_auth_user', JSON.stringify(response.user));

    return response.user;
  } catch (error) {
    console.error('Backend registration error:', error);
    throw error;
  }
};

export const backendLogout = async (): Promise<void> => {
  try {
    const refreshToken = tokenManager.getRefreshToken();

    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Backend logout error:', error);
  } finally {
    // Clear tokens and user data
    tokenManager.clearTokens();
    localStorage.removeItem('hse_auth_user');
  }
};

export const backendGetProfile = async (): Promise<AuthUser | null> => {
  try {
    const response = await api.get<{ user: AuthUser }>('/auth/profile');
    return response.user;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

export const backendUpdateProfile = async (
  name?: string,
  email?: string
): Promise<AuthUser | null> => {
  try {
    const response = await api.put<{ user: AuthUser }>('/auth/profile', { name, email });

    // Update stored user data
    localStorage.setItem('hse_auth_user', JSON.stringify(response.user));

    return response.user;
  } catch (error) {
    console.error('Update profile error:', error);
    return null;
  }
};

export const backendChangePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<boolean> => {
  try {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    return true;
  } catch (error) {
    console.error('Change password error:', error);
    return false;
  }
};
