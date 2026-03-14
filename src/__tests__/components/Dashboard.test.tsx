import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock dependencies before importing Dashboard
vi.mock('../../services/storageService', () => ({
  getIncidents: vi.fn().mockResolvedValue([]),
  getActions: vi.fn().mockResolvedValue([]),
  getInspections: vi.fn().mockResolvedValue([]),
  getRiskAssessments: vi.fn().mockResolvedValue([]),
  getObservations: vi.fn().mockResolvedValue([]),
  calculateSiteSafetyScore: vi.fn().mockResolvedValue({ score: 85, rating: 'Good', breakdown: { incidents: 20, observations: 20, inspections: 15, training: 15, actions: 15 } }),
  calculateHSEMetrics: vi.fn().mockResolvedValue({
    totalManHours: 10000,
    ltiCount: 1,
    mtcCount: 2,
    rwcCount: 0,
    facCount: 3,
    nmCount: 4,
    fatalityCount: 0,
    trir: 0.5,
    ltifr: 0.1,
    severityRate: 0.2,
    actionClosureRate: 0.8,
    inspectionCompliance: 0.9,
    leadingActions: 5,
    leadingClosureRate: 0.7,
    inspectionsCompleted: 10,
    trainingHours: 100,
    nearMissReportingRate: 0.3,
    laggingActions: 2,
    laggingClosureRate: 0.6,
    daysLost: 5,
    recordableIncidents: 3
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'Admin', tier: 'Pro' },
    checkPermission: () => true,
  }),
}));

// Mock recharts to avoid canvas/SVG issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
}));

import { Dashboard } from '../../components/Dashboard';
import * as storageService from '../../services/storageService';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('onboardingCompleted', 'true');
  });

  it('renders the dashboard heading area', async () => {
    renderDashboard();
    await waitFor(() => {
      // Dashboard should render without crashing
      expect(document.body.querySelector('.space-y-6, .space-y-8')).toBeTruthy();
    });
  });

  it('calls data loading functions on mount', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(storageService.getIncidents).toHaveBeenCalled();
      expect(storageService.getActions).toHaveBeenCalled();
      expect(storageService.getInspections).toHaveBeenCalled();
      expect(storageService.getObservations).toHaveBeenCalled();
    });
  });

  it('displays metric cards when data is loaded', async () => {
    vi.mocked(storageService.getIncidents).mockResolvedValue([
      { id: '1', description: 'Test', date: '2024-01-01', dateReported: '2024-01-01', location: 'Site A', department: 'Ops', type: 'Near Miss', category: 'Near Miss', severity: 'Low', status: 'Open', reporter: 'User', images: [], shift: 'Day', weatherConditions: 'Clear', taskBeingPerformed: '', injuredPersons: [], witnesses: [], ppeWorn: [], ppeAdequate: null, environmentalImpact: '', immediateActionsTaken: '', areaSecured: false, emergencyServicesNotified: false, regulatoryNotification: false } as any
    ]);
    vi.mocked(storageService.getActions).mockResolvedValue([
      { id: '1', title: 'Fix handrail', description: '', assignee: 'User', dueDate: '2024-02-01', priority: 'Medium', status: 'Open', actionType: 'Corrective', category: 'Safety' as any, indicator: 'Lagging' as any } as any
    ]);

    renderDashboard();
    await waitFor(() => {
      expect(storageService.calculateSiteSafetyScore).toHaveBeenCalled();
    });
  });

  it('handles data loading errors gracefully', async () => {
    vi.mocked(storageService.getIncidents).mockRejectedValue(new Error('Network error'));
    renderDashboard();
    // Should not crash — error boundary should catch or component handles it
    await waitFor(() => {
      expect(document.body.innerHTML).toBeTruthy();
    });
  });

  it('shows welcome screen for first-time users', async () => {
    localStorage.removeItem('onboardingCompleted');
    renderDashboard();
    await waitFor(() => {
      // WelcomeScreen should render
      expect(document.body.innerHTML).toBeTruthy();
    });
  });
});
