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

const apiFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (options.method || 'GET').toUpperCase();

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `API Error: ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    // If offline and this is a mutating request, queue for later sync
    if (!navigator.onLine && ['POST', 'PUT', 'DELETE'].includes(method)) {
      const body = options.body ? JSON.parse(options.body as string) : null;
      queueOfflineRequest(method, path, body);
      // Return an optimistic placeholder so the UI flow continues
      return { id: `offline-${Date.now()}`, _offline: true };
    }
    throw err;
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

export const apiRegister = async (name: string, email: string, password: string, role?: string) => {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
  setAuthToken(data.token);
  return data;
};

export const apiGetMe = () => apiFetch('/auth/me');

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

export const apiGetInspections = () => apiFetch('/inspections');
export const apiCreateInspection = (data: any) => apiFetch('/inspections', { method: 'POST', body: JSON.stringify(data) });

export const apiGetPermits = () => apiFetch('/permits');
export const apiCreatePermit = (data: any) => apiFetch('/permits', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdatePermit = (id: string, data: any) => apiFetch(`/permits/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const apiGetWorkers = () => apiFetch('/workers');
export const apiCreateWorker = (data: any) => apiFetch('/workers', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateWorker = (id: string, data: any) => apiFetch(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const apiGetContractors = () => apiFetch('/contractors');
export const apiCreateContractor = (data: any) => apiFetch('/contractors', { method: 'POST', body: JSON.stringify(data) });

export const apiGetAssets = () => apiFetch('/assets');
export const apiCreateAsset = (data: any) => apiFetch('/assets', { method: 'POST', body: JSON.stringify(data) });

export const apiGetDocuments = () => apiFetch('/documents');
export const apiCreateDocument = (data: any) => apiFetch('/documents', { method: 'POST', body: JSON.stringify(data) });

export const apiGetStats = () => apiFetch('/stats');
export const apiLogStats = (data: any) => apiFetch('/stats/log', { method: 'POST', body: JSON.stringify(data) });

export const apiGetEmergencyContacts = () => apiFetch('/emergency/contacts');
export const apiCreateEmergencyContact = (data: any) => apiFetch('/emergency/contacts', { method: 'POST', body: JSON.stringify(data) });

export const apiGetEmergencyDrills = () => apiFetch('/emergency/drills');
export const apiCreateEmergencyDrill = (data: any) => apiFetch('/emergency/drills', { method: 'POST', body: JSON.stringify(data) });

// ---------- Risk Assessments API ----------

export const apiGetRiskAssessments = () => apiFetch('/risk-assessments');
export const apiGetRiskAssessment = (id: string) => apiFetch(`/risk-assessments/${id}`);
export const apiCreateRiskAssessment = (data: any) => apiFetch('/risk-assessments', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateRiskAssessment = (id: string, data: any) => apiFetch(`/risk-assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) });

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
  return apiFetch('/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId }),
  });
};

export const apiGetAgentConversations = () => apiFetch('/agent/conversations');
export const apiGetAgentConversation = (id: string) => apiFetch(`/agent/conversations/${id}`);
export const apiDeleteAgentConversation = (id: string) => apiFetch(`/agent/conversations/${id}`, { method: 'DELETE' });

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
