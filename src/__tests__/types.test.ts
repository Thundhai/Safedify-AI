import { describe, it, expect } from 'vitest';
import {
  IncidentType, IncidentSeverity, IncidentCategory,
  PermitStatus
} from '../types';

/**
 * Smoke tests for core type enums — ensures the type system stays
 * consistent after refactors.
 */

describe('types', () => {
  it('IncidentType enum has expected values', () => {
    expect(IncidentType.NEAR_MISS).toBe('Near Miss');
    expect(IncidentType.FIRST_AID).toBe('First Aid');
    expect(IncidentType.ENVIRONMENTAL).toBe('Environmental');
    expect(Object.keys(IncidentType).length).toBeGreaterThanOrEqual(5);
  });

  it('IncidentSeverity enum has Low through Critical', () => {
    expect(IncidentSeverity.LOW).toBe('Low');
    expect(IncidentSeverity.MEDIUM).toBe('Medium');
    expect(IncidentSeverity.HIGH).toBe('High');
    expect(IncidentSeverity.CRITICAL).toBe('Critical');
  });

  it('IncidentCategory enum has OSHA pyramid values', () => {
    expect(IncidentCategory.NEAR_MISS).toBe('Near Miss');
    expect(IncidentCategory.FIRST_AID_CASE).toBe('First Aid Case');
    expect(IncidentCategory.FATALITY).toBe('Fatality');
    expect(Object.keys(IncidentCategory).length).toBeGreaterThanOrEqual(6);
  });

  it('PermitStatus has expected values', () => {
    expect(PermitStatus.PENDING).toBe('Pending Approval');
    expect(PermitStatus.APPROVED).toBe('Active');
    expect(PermitStatus.EXPIRED).toBe('Expired');
    expect(PermitStatus.REJECTED).toBe('Rejected');
  });
});
