import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PermitForm } from './PermitForm';
import { PermitType } from '../types';

const navigateMock = vi.fn();
const savePermitMock = vi.fn();
const auditPermitAIMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'new' }),
    useNavigate: () => navigateMock
  };
});

vi.mock('../services/storageService', () => ({
  getPermitById: vi.fn(() => undefined),
  savePermit: (...args: unknown[]) => savePermitMock(...args),
  getRiskAssessments: vi.fn(() => []),
  getLiftingPlans: vi.fn(() => [])
}));

vi.mock('../services/geminiService', () => ({
  auditPermitAI: (...args: unknown[]) => auditPermitAIMock(...args)
}));

describe('PermitForm lifting submission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditPermitAIMock.mockResolvedValue({ issues: [] });
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('blocks lifting permit submission when no lifting plan is referenced', async () => {
    render(
      <MemoryRouter>
        <PermitForm />
      </MemoryRouter>
    );

    const permitTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(permitTypeSelect, { target: { value: PermitType.LIFTING } });

    expect(screen.getByText('No approved lifting plans found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Lifting Plan' })).toBeInTheDocument();

    const description = screen.getByPlaceholderText('Describe tasks, tools used, etc...');
    fireEvent.change(description, { target: { value: 'Lift steel bundle from yard to slab.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(window.alert).toHaveBeenCalledWith('Please reference an approved lifting plan before submitting this lifting permit.');
    expect(savePermitMock).not.toHaveBeenCalled();
    expect(auditPermitAIMock).not.toHaveBeenCalled();
  });
});
