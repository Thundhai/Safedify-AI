// Backend-connected incident service
import api from './apiService';
import { Incident } from '../types';

interface IncidentsResponse {
  incidents: Incident[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface IncidentResponse {
  incident: Incident;
}

interface StatsResponse {
  stats: {
    total: number;
    open: number;
    investigating: number;
    closed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const backendGetIncidents = async (
  page: number = 1,
  limit: number = 50,
  status?: string,
  severity?: string
): Promise<IncidentsResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);

    return await api.get<IncidentsResponse>(`/incidents?${params.toString()}`);
  } catch (error) {
    console.error('Get incidents error:', error);
    throw error;
  }
};

export const backendGetIncidentById = async (id: string): Promise<Incident | null> => {
  try {
    const response = await api.get<IncidentResponse>(`/incidents/${id}`);
    return response.incident;
  } catch (error) {
    console.error('Get incident error:', error);
    return null;
  }
};

export const backendCreateIncident = async (incident: Omit<Incident, 'id'>): Promise<Incident | null> => {
  try {
    const response = await api.post<IncidentResponse>('/incidents', incident);
    return response.incident;
  } catch (error) {
    console.error('Create incident error:', error);
    throw error;
  }
};

export const backendUpdateIncident = async (incident: Incident): Promise<Incident | null> => {
  try {
    const response = await api.put<IncidentResponse>(`/incidents/${incident.id}`, incident);
    return response.incident;
  } catch (error) {
    console.error('Update incident error:', error);
    throw error;
  }
};

export const backendDeleteIncident = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`/incidents/${id}`);
    return true;
  } catch (error) {
    console.error('Delete incident error:', error);
    return false;
  }
};

export const backendGetIncidentStats = async (): Promise<StatsResponse['stats'] | null> => {
  try {
    const response = await api.get<StatsResponse>('/incidents/stats');
    return response.stats;
  } catch (error) {
    console.error('Get incident stats error:', error);
    return null;
  }
};
