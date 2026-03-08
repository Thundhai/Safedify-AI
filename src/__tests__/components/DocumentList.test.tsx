import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// Mock auth context
const mockCheckPermission = vi.fn().mockReturnValue(true);
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test', email: 'test@test.com', role: 'Admin', tier: 'Pro' },
    checkPermission: mockCheckPermission,
    logout: vi.fn(),
  }),
}));

// Mock storageService for documents — use vi.hoisted to avoid reference-before-init with vi.mock hoisting
const { mockDocuments } = vi.hoisted(() => ({
  mockDocuments: [
    {
      id: 'doc-1',
      title: 'Safety Policy Manual',
      category: 'Policy',
      version: 'v2.1',
      status: 'Approved',
      uploadDate: '2024-01-15',
      author: 'John Safety',
      description: 'Company-wide safety policy document',
      tags: ['safety', 'policy'],
    },
    {
      id: 'doc-2',
      title: 'MSDS - Acetone',
      category: 'MSDS',
      version: 'v1.0',
      status: 'Draft',
      uploadDate: '2024-02-01',
      author: 'Lab Manager',
      description: 'Material safety data sheet for acetone',
      expiryDate: '2024-03-01', // expired
    },
  ],
}));

vi.mock('../../services/storageService', () => ({
  getDocuments: vi.fn().mockResolvedValue(mockDocuments),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
}));

import { DocumentList } from '../../components/DocumentList';

const renderDocumentList = () =>
  render(
    <MemoryRouter>
      <DocumentList />
    </MemoryRouter>
  );

describe('DocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders document management heading', async () => {
    renderDocumentList();
    await waitFor(() => {
      expect(screen.getByText('Document Management')).toBeInTheDocument();
    });
  });

  it('displays document cards after loading', async () => {
    renderDocumentList();
    await waitFor(() => {
      expect(screen.getByText('Safety Policy Manual')).toBeInTheDocument();
      expect(screen.getByText('MSDS - Acetone')).toBeInTheDocument();
    });
  });

  it('shows category filter buttons', async () => {
    renderDocumentList();
    await waitFor(() => {
      expect(screen.getByText('All Docs')).toBeInTheDocument();
      // Category names may appear both as filter buttons and on document cards
      expect(screen.getAllByText('Policy').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('SOP')).toBeInTheDocument();
      expect(screen.getAllByText('MSDS').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows tags on document cards', async () => {
    renderDocumentList();
    await waitFor(() => {
      expect(screen.getByText('safety')).toBeInTheDocument();
      expect(screen.getByText('policy')).toBeInTheDocument();
    });
  });

  it('shows upload document link', async () => {
    renderDocumentList();
    await waitFor(() => {
      expect(screen.getByText('Upload Document')).toBeInTheDocument();
    });
  });

  it('displays status badges', async () => {
    renderDocumentList();
    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });
});
