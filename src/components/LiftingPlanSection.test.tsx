import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiftingPlanSection } from './LiftingPlanSection';
import { LiftingEquipmentType, LiftingPlanStatus } from '../types';

const StatefulHarness: React.FC = () => {
  const [value, setValue] = useState({
    equipmentType: LiftingEquipmentType.MOBILE_CRANE,
    loadWeight: null as number | null,
    riggingWeight: null as number | null,
    dynamicFactor: 1.1,
    parameters: {
      boomLength: null as number | null,
      boomAngle: null as number | null,
      workingRadius: null as number | null,
      hookHeight: null as number | null,
      outriggerSpread: null as number | null,
      ratedCapacity: null as number | null
    },
    status: LiftingPlanStatus.DRAFT,
    attachedToPermit: false
  });

  return <LiftingPlanSection value={value} readOnly={false} onChange={setValue} />;
};

const setInputBySectionLabel = (label: string, value: string) => {
  const labelElement = screen.getAllByText(label).find(element => element.tagName.toLowerCase() === 'label');
  if (!labelElement) {
    throw new Error(`Label "${label}" not found`);
  }

  let current: Element | null = labelElement;
  let input: Element | null = null;

  while (current && !input) {
    input = current.querySelector('input');
    current = current.parentElement;
  }

  if (!input) {
    throw new Error(`Input for label "${label}" not found`);
  }
  fireEvent.change(input, { target: { value } });
};

describe('LiftingPlanSection', () => {
  it('renders lifting plan header and selected equipment type', () => {
    const onChange = vi.fn();

    render(
      <LiftingPlanSection
        value={{
          equipmentType: LiftingEquipmentType.MOBILE_CRANE,
          loadWeight: 10,
          riggingWeight: 1,
          dynamicFactor: 1.1,
          parameters: {
            boomLength: 25,
            boomAngle: 65,
            workingRadius: 12,
            hookHeight: 18,
            outriggerSpread: 7,
            ratedCapacity: 20
          },
          status: LiftingPlanStatus.DRAFT,
          attachedToPermit: false
        }}
        readOnly={false}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Lifting Plan')).toBeInTheDocument();
    expect(screen.getByDisplayValue(LiftingEquipmentType.MOBILE_CRANE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Lifting Calculation/i })).toBeInTheDocument();
  });

  it('shows validation notes when required lifting inputs are missing', () => {
    render(<StatefulHarness />);

    fireEvent.click(screen.getByRole('button', { name: /Run Lifting Calculation/i }));

    expect(screen.getByText(/Enter both load weight and rigging weight/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete required equipment values/i)).toBeInTheDocument();
  });

  it('supports full lifting workflow from calculation to HSE approval', () => {
    render(<StatefulHarness />);

    setInputBySectionLabel('Load (t)', '10');
    setInputBySectionLabel('Rigging (t)', '1');
    setInputBySectionLabel('Boom Length', '20');
    setInputBySectionLabel('Boom Angle', '65');
    setInputBySectionLabel('Working Radius', '8');
    setInputBySectionLabel('Hook Height', '15');
    setInputBySectionLabel('Outrigger Spread', '6');
    setInputBySectionLabel('Rated Capacity', '20');

    fireEvent.click(screen.getByRole('button', { name: /Run Lifting Calculation/i }));
    expect(screen.getByText(/All checks passed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Send for HSE Approval/i }));
    expect(screen.getByText('Pending HSE Approval')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Approve by HSE/i }));
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});
