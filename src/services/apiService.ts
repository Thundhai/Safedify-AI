// API Service - Centralized HTTP client for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token management
const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

const setAccessToken = (token: string): void => {
  localStorage.setItem('access_token', token);
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

const setRefreshToken = (token: string): void => {
  localStorage.setItem('refresh_token', token);
};

const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Refresh access token
const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    return true;
  } catch (error) {
    clearTokens();
    return false;
  }
};

// Main API request handler
const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const {
    method = 'GET',
    headers = {},
    body,
    requiresAuth = true,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization header if required
  if (requiresAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    let response = await fetch(url, requestOptions);

    // If token expired, try to refresh
    if (response.status === 401 && requiresAuth) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry request with new token
        const newAccessToken = getAccessToken();
        if (newAccessToken) {
          requestHeaders['Authorization'] = `Bearer ${newAccessToken}`;
        }
        response = await fetch(url, { ...requestOptions, headers: requestHeaders });
      } else {
        // Redirect to login if refresh failed
        clearTokens();
        window.location.href = '/login';
        throw new ApiError(401, 'Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || errorData.message || 'Request failed',
        errorData.details
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, 'Network error. Please check your connection.');
  }
};

// Convenience methods
export const api = {
  get: <T>(endpoint: string, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'GET', requiresAuth }),

  post: <T>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'POST', body, requiresAuth }),

  put: <T>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, requiresAuth }),

  patch: <T>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, requiresAuth }),

  delete: <T>(endpoint: string, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'DELETE', requiresAuth }),

  // File upload helper
  uploadFile: async (endpoint: string, file: File, fieldName: string = 'file') => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const accessToken = getAccessToken();
    const headers: Record<string, string> = {};

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || 'Upload failed'
      );
    }

    return await response.json();
  },
};

// Export token management functions
export const tokenManager = {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
};

export { ApiError };
export default api;
