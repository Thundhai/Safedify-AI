/**
 * API Client — connects the frontend to the Safedify backend server
 * In production, the backend serves the frontend, so API calls are same-origin (/api/...)
 * In development, Vite proxies /api to localhost:4500
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ---------- Token Management ----------

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('safedify_token', token);
  } else {
    localStorage.removeItem('safedify_token');
  }
};

export const getAuthToken = (): string | null => {
  if (!authToken) {
    authToken = localStorage.getItem('safedify_token');
  }
  return authToken;
};

// ---------- Fetch Wrapper ----------

import { queueOfflineRequest } from './offlineService';

const apiFetch = async (path: string, options: RequestInit = {}, timeoutMs = 30000): Promise<any> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      console.error(`[apiFetch] ${method} ${path} → HTTP ${res.status}`, JSON.stringify(body));
      // Provide user-friendly error messages
      if (res.status === 504) {
        throw new Error('Server is taking too long to respond. Please try again.');
      }
      if (res.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again in a moment.');
      }
      if (res.status === 401) {
        // Clear stale token on 401 to prevent repeated failed requests
        setAuthToken(null);
      }
      throw new Error(body.error || `API Error: ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    // Handle abort/timeout
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    // If offline and this is a mutating request, queue for later sync
    if (!navigator.onLine && ['POST', 'PUT', 'DELETE'].includes(method)) {
      const body = options.body ? JSON.parse(options.body as string) : null;
      queueOfflineRequest(method, path, body);
      // Return an optimistic placeholder so the UI flow continues
      return { id: `offline-${Date.now()}`, _offline: true };
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

// ---------- Auth API ----------

export const apiLogin = async (email: string, password: string) => {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data;
};

export const apiRegister = async (name: string, email: string, password: string, role?: string, organizationName?: string, inviteToken?: string) => {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, organizationName, inviteToken }),
  });
  if (data.token) setAuthToken(data.token);
  return data;
};

export const apiGetMe = () => apiFetch('/auth/me');

export const apiUpdateProfile = async (data: { name: string }) => {
  const result = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
  if (result.token) setAuthToken(result.token);
  return result;
};

export const apiChangePassword = (currentPassword: string, newPassword: string) =>
  apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });

// ---------- Data API ----------

export const apiGetIncidents = () => apiFetch('/incidents');
export const apiGetIncident = (id: string) => apiFetch(`/incidents/${id}`);
export const apiCreateIncident = (data: any) => apiFetch('/incidents', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateIncident = (id: string, data: any) => apiFetch(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteIncident = (id: string) => apiFetch(`/incidents/${id}`, { method: 'DELETE' });

export const apiGetActions = () => apiFetch('/actions');
export const apiCreateAction = (data: any) => apiFetch('/actions', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateAction = (id: string, data: any) => apiFetch(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteAction = (id: string) => apiFetch(`/actions/${id}`, { method: 'DELETE' });

export const apiGetObservations = () => apiFetch('/observations');
export const apiCreateObservation = (data: any) => apiFetch('/observations', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateObservation = (id: string, data: any) => apiFetch(`/observations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteObservation = (id: string) => apiFetch(`/observations/${id}`, { method: 'DELETE' });

export const apiGetInspections = () => apiFetch('/inspections');
export const apiCreateInspection = (data: any) => apiFetch('/inspections', { method: 'POST', body: JSON.stringify(data) });

export const apiGetPermits = () => apiFetch('/permits');
export const apiGetPermit = (id: string) => apiFetch(`/permits/${id}`);
export const apiCreatePermit = (data: any) => apiFetch('/permits', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdatePermit = (id: string, data: any) => apiFetch(`/permits/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeletePermit = (id: string) => apiFetch(`/permits/${id}`, { method: 'DELETE' });
export const apiGetPermitActions = (permitId: string) => apiFetch(`/permits/${permitId}/actions`);

export const apiGetWorkers = () => apiFetch('/workers');
export const apiGetWorker = (id: string) => apiFetch(`/workers/${id}`);
export const apiCreateWorker = (data: any) => apiFetch('/workers', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateWorker = (id: string, data: any) => apiFetch(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteWorker = (id: string) => apiFetch(`/workers/${id}`, { method: 'DELETE' });

export const apiGetContractors = () => apiFetch('/contractors');
export const apiGetContractor = (id: string) => apiFetch(`/contractors/${id}`);
export const apiCreateContractor = (data: any) => apiFetch('/contractors', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateContractor = (id: string, data: any) => apiFetch(`/contractors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteContractor = (id: string) => apiFetch(`/contractors/${id}`, { method: 'DELETE' });

export const apiGetAssets = () => apiFetch('/assets');
export const apiGetAsset = (id: string) => apiFetch(`/assets/${id}`);
export const apiCreateAsset = (data: any) => apiFetch('/assets', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateAsset = (id: string, data: any) => apiFetch(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteAsset = (id: string) => apiFetch(`/assets/${id}`, { method: 'DELETE' });

export const apiGetDocuments = () => apiFetch('/documents');
export const apiGetDocument = (id: string) => apiFetch(`/documents/${id}`);
export const apiCreateDocument = (data: any) => apiFetch('/documents', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateDocument = (id: string, data: any) => apiFetch(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteDocument = (id: string) => apiFetch(`/documents/${id}`, { method: 'DELETE' });

export const apiGetStats = () => apiFetch('/stats');
export const apiLogStats = (data: any) => apiFetch('/stats/log', { method: 'POST', body: JSON.stringify(data) });

export const apiGetEmergencyContacts = () => apiFetch('/emergency/contacts');
export const apiCreateEmergencyContact = (data: any) => apiFetch('/emergency/contacts', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteEmergencyContact = (id: string) => apiFetch(`/emergency/contacts/${id}`, { method: 'DELETE' });

export const apiGetEmergencyDrills = () => apiFetch('/emergency/drills');
export const apiCreateEmergencyDrill = (data: any) => apiFetch('/emergency/drills', { method: 'POST', body: JSON.stringify(data) });

// ---------- Risk Assessments API ----------

export const apiGetRiskAssessments = () => apiFetch('/risk-assessments');
export const apiGetRiskAssessment = (id: string) => apiFetch(`/risk-assessments/${id}`);
export const apiCreateRiskAssessment = (data: any) => apiFetch('/risk-assessments', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateRiskAssessment = (id: string, data: any) => apiFetch(`/risk-assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteRiskAssessment = (id: string) => apiFetch(`/risk-assessments/${id}`, { method: 'DELETE' });

// ---------- Inspection Templates API ----------

export const apiGetInspectionTemplates = () => apiFetch('/inspection-templates');
export const apiCreateInspectionTemplate = (data: any) => apiFetch('/inspection-templates', { method: 'POST', body: JSON.stringify(data) });

// ---------- Training API ----------

export const apiGetTrainingModules = () => apiFetch('/training-modules');
export const apiCreateTrainingModule = (data: any) => apiFetch('/training-modules', { method: 'POST', body: JSON.stringify(data) });
export const apiGetTrainingRecords = () => apiFetch('/training-records');
export const apiCreateTrainingRecord = (data: any) => apiFetch('/training-records', { method: 'POST', body: JSON.stringify(data) });

// ---------- PPE API ----------

export const apiGetPPEInventory = () => apiFetch('/ppe/inventory');
export const apiCreatePPEItem = (data: any) => apiFetch('/ppe/inventory', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdatePPEItem = (id: string, data: any) => apiFetch(`/ppe/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiGetPPEIssuance = () => apiFetch('/ppe/issuance');
export const apiCreatePPEIssuance = (data: any) => apiFetch('/ppe/issuance', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdatePPEIssuance = (id: string, data: any) => apiFetch(`/ppe/issuance/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ---------- Roles API ----------

export const apiGetRoles = () => apiFetch('/roles');
export const apiCreateRole = (data: any) => apiFetch('/roles', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteRole = (id: string) => apiFetch(`/roles/${id}`, { method: 'DELETE' });

// ---------- Safety Zones API ----------

export const apiGetSafetyZones = () => apiFetch('/safety-zones');
export const apiCreateSafetyZone = (data: any) => apiFetch('/safety-zones', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteSafetyZone = (id: string) => apiFetch(`/safety-zones/${id}`, { method: 'DELETE' });

// ---------- HSE Metrics API ----------

export const apiGetMetrics = () => apiFetch('/metrics');

// ---------- Agent API ----------

export const apiAgentChat = async (message: string, conversationId?: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for agent (may do multiple tool calls)
  try {
    const result = await apiFetch('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
      signal: controller.signal,
    });
    // Guard against offline placeholder response
    if (result._offline) {
      throw new Error('You appear to be offline. AI features require an internet connection.');
    }
    return result;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('AI request timed out. The server took too long to respond.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
};

export const apiGetAgentConversations = () => apiFetch('/agent/conversations');
export const apiGetAgentConversation = (id: string) => apiFetch(`/agent/conversations/${id}`);
export const apiDeleteAgentConversation = (id: string) => apiFetch(`/agent/conversations/${id}`, { method: 'DELETE' });

// ---------- File Upload API ----------

/**
 * Upload a base64 data URI to the server and get back a URL path.
 * Returns { id, url, filename, size, mimeType }
 */
export const apiUploadImage = async (dataUri: string): Promise<{ id: string; url: string; filename: string; size: number; mimeType: string }> => {
  return apiFetch('/uploads', {
    method: 'POST',
    body: JSON.stringify({ data: dataUri }),
  });
};

/**
 * Upload multiple base64 data URIs at once.
 * Returns array of { id, url, filename, size, mimeType }
 */
export const apiUploadImages = async (dataUris: string[]): Promise<Array<{ id: string; url: string; filename: string; size: number; mimeType: string }>> => {
  return apiFetch('/uploads', {
    method: 'POST',
    body: JSON.stringify({ files: dataUris }),
  });
};

// ---------- Health Check ----------

export const apiHealthCheck = async (): Promise<boolean> => {
  try {
    const data = await apiFetch('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
};

// ---------- Notifications API ----------

export const apiGetNotifications = (limit = 50) => apiFetch(`/notifications?limit=${limit}`);
export const apiGetUnreadCount = () => apiFetch('/notifications/unread');
export const apiMarkNotificationRead = (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
export const apiMarkAllNotificationsRead = () => apiFetch('/notifications/read-all', { method: 'PUT' });
export const apiDeleteNotification = (id: string) => apiFetch(`/notifications/${id}`, { method: 'DELETE' });

// ---------- Environmental API ----------

export const apiGetWeather = (lat?: number, lng?: number) => {
  const params = new URLSearchParams();
  if (lat != null) params.set('lat', String(lat));
  if (lng != null) params.set('lng', String(lng));
  const qs = params.toString();
  return apiFetch(`/environmental/weather${qs ? `?${qs}` : ''}`);
};

export const apiRefreshWeatherCache = () => apiFetch('/environmental/weather/refresh', { method: 'POST' });

export const apiGetEnvironmentalReadings = (type?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return apiFetch(`/environmental/readings${qs ? `?${qs}` : ''}`);
};

export const apiGetLatestReadings = () => apiFetch('/environmental/readings/latest');

export const apiGetReadingHistory = (type: string, hours = 24) =>
  apiFetch(`/environmental/readings/history?type=${type}&hours=${hours}`);

export const apiLogEnvironmentalReading = (data: {
  reading_type: string;
  value: number;
  unit?: string;
  location?: string;
  zone?: string;
  source?: string;
  notes?: string;
}) => apiFetch('/environmental/readings', { method: 'POST', body: JSON.stringify(data) });

export const apiGetSiteLocations = () => apiFetch('/environmental/locations');

export const apiCreateSiteLocation = (data: { name: string; latitude?: number; longitude?: number; is_default?: boolean }) =>
  apiFetch('/environmental/locations', { method: 'POST', body: JSON.stringify(data) });

// ---------- Search API ----------

export const apiSearch = (query: string, types?: string[], limit = 30) => {
  const params = new URLSearchParams({ q: query });
  if (types?.length) params.set('type', types.join(','));
  if (limit !== 30) params.set('limit', String(limit));
  return apiFetch(`/search?${params}`);
};

// ---------- Export API ----------

export const apiExportData = async (entity: string, format: 'csv' | 'json' = 'csv', from?: string, to?: string) => {
  const params = new URLSearchParams({ format });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/export/${entity}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entity}-export.${format}`;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------- Audit Logs API ----------

export const apiGetAuditLogs = (params?: { page?: number; per_page?: number; action?: string; entity_type?: string; from?: string; to?: string }) => {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) qs.set(k, String(v)); });
  return apiFetch(`/audit-logs?${qs}`);
};

// ---------- Admin / Backup API ----------

export const apiCreateBackup = () => apiFetch('/admin/backup', { method: 'POST' });
export const apiGetBackups = () => apiFetch('/admin/backups');

// ---------- Password API ----------

export const apiForgotPassword = (email: string) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const apiResetPassword = (token: string, password: string) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });

// ---------- Two-Factor Auth API ----------

export const api2FASetup = () => apiFetch('/auth/2fa/setup', { method: 'POST' });
export const api2FAVerify = (token: string) => apiFetch('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ token }) });
export const api2FAStatus = () => apiFetch('/auth/2fa/status');
export const api2FADisable = () => apiFetch('/auth/2fa', { method: 'DELETE' });
export const apiLoginWith2FA = async (challengeToken: string, token: string) => {
  const data = await apiFetch('/auth/login/2fa', { method: 'POST', body: JSON.stringify({ challengeToken, token }) });
  setAuthToken(data.token);
  return data;
};

// ---------- Bulk Operations API ----------

export const apiBulkDeleteIncidents = (ids: string[]) =>
  apiFetch('/incidents/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });

export const apiBulkUpdateIncidentStatus = (ids: string[], status: string) =>
  apiFetch('/incidents/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) });

export const apiBulkDeleteActions = (ids: string[]) =>
  apiFetch('/actions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });

export const apiBulkCompleteActions = (ids: string[]) =>
  apiFetch('/actions/bulk-complete', { method: 'POST', body: JSON.stringify({ ids }) });

export const apiBulkDeleteObservations = (ids: string[]) =>
  apiFetch('/observations/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });

export const apiBulkExport = (entity: string, ids: string[]) =>
  apiFetch('/bulk-export', { method: 'POST', body: JSON.stringify({ entity, ids }) });

// ---------- Notification Preferences API ----------

export const apiGetNotificationPreferences = () => apiFetch('/notifications/preferences');

export const apiUpdateNotificationPreferences = (prefs: {
  email_incidents?: boolean;
  email_permits?: boolean;
  email_actions?: boolean;
  email_training?: boolean;
  email_observations?: boolean;
  email_digest?: boolean;
  in_app_all?: boolean;
}) => apiFetch('/notifications/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
