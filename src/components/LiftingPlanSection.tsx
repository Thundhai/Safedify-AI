import React, { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Send, AlertTriangle } from 'lucide-react';
import {
  LiftingEquipmentType,
  LiftingPlan,
  LiftingPlanStatus,
  LiftingCalculationResult
} from '../types';

type EquipmentFieldDefinition = {
  key: string;
  label: string;
  unit: string;
  description: string;
  min?: number;
};

type EquipmentConfig = {
  capacityField: string;
  fields: EquipmentFieldDefinition[];
  labels: { key: string; text: string; x: number; y: number }[];
};

const equipmentConfigs: Record<LiftingEquipmentType, EquipmentConfig> = {
  [LiftingEquipmentType.MOBILE_CRANE]: {
    capacityField: 'ratedCapacity',
    fields: [
      { key: 'boomLength', label: 'Boom Length', unit: 'm', description: 'Length from boom foot pin to boom tip.', min: 1 },
      { key: 'boomAngle', label: 'Boom Angle', unit: 'deg', description: 'Boom angle from horizontal.', min: 0 },
      { key: 'workingRadius', label: 'Working Radius', unit: 'm', description: 'Horizontal distance from crane center to load center.', min: 0.5 },
      { key: 'hookHeight', label: 'Hook Height', unit: 'm', description: 'Vertical hook height from ground level.', min: 0.5 },
      { key: 'outriggerSpread', label: 'Outrigger Spread', unit: 'm', description: 'Total stabilizer span used during lift.', min: 1 },
      { key: 'ratedCapacity', label: 'Rated Capacity', unit: 't', description: 'Chart capacity at selected boom/radius.', min: 0.1 }
    ],
    labels: [
      { key: 'boomLength', text: 'Boom Length', x: 64, y: 40 },
      { key: 'boomAngle', text: 'Boom Angle', x: 56, y: 70 },
      { key: 'workingRadius', text: 'Working Radius', x: 52, y: 98 },
      { key: 'hookHeight', text: 'Hook Height', x: 78, y: 62 },
      { key: 'outriggerSpread', text: 'Outrigger Spread', x: 30, y: 90 },
      { key: 'ratedCapacity', text: 'Rated Capacity', x: 22, y: 26 }
    ]
  },
  [LiftingEquipmentType.CRAWLER_CRANE]: {
    capacityField: 'ratedCapacity',
    fields: [
      { key: 'mainBoomLength', label: 'Main Boom Length', unit: 'm', description: 'Length of main boom.', min: 1 },
      { key: 'jibLength', label: 'Jib Length', unit: 'm', description: 'Length of luffing/fixed jib when fitted.', min: 0 },
      { key: 'workingRadius', label: 'Working Radius', unit: 'm', description: 'Horizontal reach to load center.', min: 0.5 },
      { key: 'hookHeight', label: 'Hook Height', unit: 'm', description: 'Required hook elevation.', min: 0.5 },
      { key: 'groundBearingArea', label: 'Ground Bearing Area', unit: 'm2', description: 'Track contact area used for pressure checks.', min: 0.1 },
      { key: 'ratedCapacity', label: 'Rated Capacity', unit: 't', description: 'Load chart capacity at selected configuration.', min: 0.1 }
    ],
    labels: [
      { key: 'mainBoomLength', text: 'Main Boom', x: 62, y: 40 },
      { key: 'jibLength', text: 'Jib Length', x: 78, y: 30 },
      { key: 'workingRadius', text: 'Radius', x: 54, y: 98 },
      { key: 'hookHeight', text: 'Hook Height', x: 84, y: 62 },
      { key: 'groundBearingArea', text: 'Track Area', x: 24, y: 92 },
      { key: 'ratedCapacity', text: 'Rated Capacity', x: 20, y: 26 }
    ]
  },
  [LiftingEquipmentType.TOWER_CRANE]: {
    capacityField: 'ratedCapacity',
    fields: [
      { key: 'jibLength', label: 'Jib Length', unit: 'm', description: 'Total jib length from mast center.', min: 1 },
      { key: 'trolleyPosition', label: 'Trolley Position', unit: 'm', description: 'Distance from mast to trolley/hook block.', min: 0.5 },
      { key: 'workingRadius', label: 'Working Radius', unit: 'm', description: 'Horizontal distance to load center.', min: 0.5 },
      { key: 'hookHeight', label: 'Hook Height', unit: 'm', description: 'Vertical hook elevation above pick level.', min: 0.5 },
      { key: 'towerHeight', label: 'Tower Height', unit: 'm', description: 'Free-standing or tied-in tower height.', min: 1 },
      { key: 'ratedCapacity', label: 'Rated Capacity', unit: 't', description: 'Capacity at selected trolley position.', min: 0.1 }
    ],
    labels: [
      { key: 'jibLength', text: 'Jib Length', x: 64, y: 28 },
      { key: 'trolleyPosition', text: 'Trolley Position', x: 76, y: 40 },
      { key: 'workingRadius', text: 'Radius', x: 56, y: 98 },
      { key: 'hookHeight', text: 'Hook Height', x: 80, y: 66 },
      { key: 'towerHeight', text: 'Tower Height', x: 36, y: 58 },
      { key: 'ratedCapacity', text: 'Rated Capacity', x: 18, y: 18 }
    ]
  },
  [LiftingEquipmentType.FORKLIFT]: {
    capacityField: 'ratedCapacity',
    fields: [
      { key: 'loadCenter', label: 'Load Center', unit: 'mm', description: 'Horizontal distance from fork face to load CoG.', min: 100 },
      { key: 'forkLength', label: 'Fork Length', unit: 'mm', description: 'Fork tine length in use.', min: 100 },
      { key: 'liftHeight', label: 'Lift Height', unit: 'm', description: 'Required lift elevation.', min: 0.1 },
      { key: 'mastTilt', label: 'Mast Tilt', unit: 'deg', description: 'Forward/backward mast tilt angle.', min: 0 },
      { key: 'routeGradient', label: 'Route Gradient', unit: '%', description: 'Maximum route slope during transport.', min: 0 },
      { key: 'ratedCapacity', label: 'Rated Capacity', unit: 't', description: 'Forklift rated capacity at selected load center.', min: 0.1 }
    ],
    labels: [
      { key: 'loadCenter', text: 'Load Center', x: 72, y: 54 },
      { key: 'forkLength', text: 'Fork Length', x: 74, y: 72 },
      { key: 'liftHeight', text: 'Lift Height', x: 64, y: 36 },
      { key: 'mastTilt', text: 'Mast Tilt', x: 56, y: 20 },
      { key: 'routeGradient', text: 'Route Gradient', x: 36, y: 94 },
      { key: 'ratedCapacity', text: 'Rated Capacity', x: 18, y: 26 }
    ]
  },
  [LiftingEquipmentType.CHAIN_BLOCK]: {
    capacityField: 'anchorWll',
    fields: [
      { key: 'anchorWll', label: 'Anchor WLL', unit: 't', description: 'Safe working load of beam/anchor point.', min: 0.1 },
      { key: 'headroom', label: 'Headroom', unit: 'm', description: 'Clearance between hook and anchorage.', min: 0.1 },
      { key: 'liftHeight', label: 'Lift Height', unit: 'm', description: 'Required vertical lift travel.', min: 0.1 },
      { key: 'slingAngle', label: 'Sling Angle', unit: 'deg', description: 'Angle from horizontal at connection.', min: 1 },
      { key: 'connectionWll', label: 'Connection WLL', unit: 't', description: 'Lowest WLL in hook/shackle chain.', min: 0.1 },
      { key: 'sidePullAngle', label: 'Side Pull Angle', unit: 'deg', description: 'Off-vertical pull angle of chain block.', min: 0 }
    ],
    labels: [
      { key: 'anchorWll', text: 'Anchor WLL', x: 18, y: 18 },
      { key: 'headroom', text: 'Headroom', x: 56, y: 26 },
      { key: 'liftHeight', text: 'Lift Height', x: 76, y: 56 },
      { key: 'slingAngle', text: 'Sling Angle', x: 56, y: 78 },
      { key: 'connectionWll', text: 'Connection WLL', x: 22, y: 82 },
      { key: 'sidePullAngle', text: 'Side Pull', x: 76, y: 84 }
    ]
  },
  [LiftingEquipmentType.GANTRY]: {
    capacityField: 'beamCapacity',
    fields: [
      { key: 'beamSpan', label: 'Beam Span', unit: 'm', description: 'Distance between gantry legs.', min: 0.5 },
      { key: 'legSpacing', label: 'Leg Spacing', unit: 'm', description: 'Front-to-back spacing between leg sets.', min: 0.5 },
      { key: 'beamCapacity', label: 'Beam Capacity', unit: 't', description: 'Rated capacity of gantry beam.', min: 0.1 },
      { key: 'hookPosition', label: 'Hook Position', unit: 'm', description: 'Distance from left leg to hook location.', min: 0 },
      { key: 'liftHeight', label: 'Lift Height', unit: 'm', description: 'Required hook height for placement.', min: 0.1 },
      { key: 'casterConditionScore', label: 'Caster Condition Score', unit: '1-5', description: 'Inspection score for wheel/caster condition.', min: 1 }
    ],
    labels: [
      { key: 'beamSpan', text: 'Beam Span', x: 58, y: 20 },
      { key: 'legSpacing', text: 'Leg Spacing', x: 24, y: 72 },
      { key: 'beamCapacity', text: 'Beam Capacity', x: 18, y: 30 },
      { key: 'hookPosition', text: 'Hook Position', x: 70, y: 44 },
      { key: 'liftHeight', text: 'Lift Height', x: 82, y: 62 },
      { key: 'casterConditionScore', text: 'Caster Check', x: 42, y: 96 }
    ]
  },
  [LiftingEquipmentType.OVERHEAD_CRANE]: {
    capacityField: 'ratedCapacity',
    fields: [
      { key: 'bridgeTravel', label: 'Bridge Travel', unit: 'm', description: 'Travel distance of crane bridge.', min: 0.1 },
      { key: 'trolleyTravel', label: 'Trolley Travel', unit: 'm', description: 'Travel distance of trolley on beam.', min: 0.1 },
      { key: 'hookHeight', label: 'Hook Height', unit: 'm', description: 'Required vertical hook elevation.', min: 0.1 },
      { key: 'liftZoneWidth', label: 'Lift Zone Width', unit: 'm', description: 'Width of bay/lift operating zone.', min: 0.1 },
      { key: 'approachClearance', label: 'Approach Clearance', unit: 'm', description: 'End clearance from stop limit.', min: 0 },
      { key: 'ratedCapacity', label: 'Rated Capacity', unit: 't', description: 'SWL for selected bay/crane.', min: 0.1 }
    ],
    labels: [
      { key: 'bridgeTravel', text: 'Bridge Travel', x: 56, y: 22 },
      { key: 'trolleyTravel', text: 'Trolley Travel', x: 72, y: 38 },
      { key: 'hookHeight', text: 'Hook Height', x: 74, y: 66 },
      { key: 'liftZoneWidth', text: 'Lift Zone', x: 26, y: 84 },
      { key: 'approachClearance', text: 'Approach', x: 18, y: 46 },
      { key: 'ratedCapacity', text: 'Rated Capacity', x: 20, y: 18 }
    ]
  }
};

const asNumber = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value : null;

const calculateLiftingPlan = (plan: LiftingPlan): LiftingCalculationResult => {
  const config = equipmentConfigs[plan.equipmentType];
  const notes: string[] = [];
  const loadWeight = asNumber(plan.loadWeight);
  const riggingWeight = asNumber(plan.riggingWeight);
  const dynamicFactor = asNumber(plan.dynamicFactor) ?? 1.1;
  const missingFields = config.fields.filter(field => asNumber(plan.parameters[field.key]) === null);

  if (loadWeight === null || riggingWeight === null) {
    notes.push('Enter both load weight and rigging weight before running calculation.');
  }
  if (missingFields.length > 0) {
    notes.push(`Complete required equipment values: ${missingFields.map(field => field.label).join(', ')}.`);
  }

  const totalLiftedLoad = (loadWeight ?? 0) + (riggingWeight ?? 0);
  const requiredCapacity = totalLiftedLoad * dynamicFactor;
  const ratedCapacity = asNumber(plan.parameters[config.capacityField]) ?? 0;
  const utilizationPercent = ratedCapacity > 0 ? (requiredCapacity / ratedCapacity) * 100 : 0;
  let pass = notes.length === 0 && ratedCapacity > 0;

  if (ratedCapacity <= 0) {
    notes.push('Rated capacity/WLL must be greater than zero.');
    pass = false;
  } else if (utilizationPercent > 85) {
    notes.push('Utilization exceeds recommended 85% threshold for planned lift.');
    pass = false;
  }

  const slingAngle = asNumber(plan.parameters.slingAngle);
  if (slingAngle !== null && slingAngle < 30) {
    notes.push('Sling angle below 30 deg is not acceptable.');
    pass = false;
  }

  const sidePull = asNumber(plan.parameters.sidePullAngle);
  if (sidePull !== null && sidePull > 5) {
    notes.push('Side pull angle is too high. Keep side pull near vertical.');
    pass = false;
  }

  const routeGradient = asNumber(plan.parameters.routeGradient);
  if (routeGradient !== null && routeGradient > 10) {
    notes.push('Route gradient above 10% requires additional controls/engineering review.');
    pass = false;
  }

  if (pass) {
    notes.push('All checks passed. Lifting plan can be submitted for HSE approval.');
  }

  return {
    totalLiftedLoad,
    requiredCapacity,
    ratedCapacity,
    utilizationPercent,
    pass,
    notes,
    calculatedAt: new Date().toISOString()
  };
};

const formatNumber = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '-';

const DiagramBase: React.FC<{ equipmentType: LiftingEquipmentType; activeField: string | null; labels: EquipmentConfig['labels']; }> = ({ equipmentType, activeField, labels }) => {
  const isActive = (key: string) => activeField === key;

  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-xl h-64 bg-slate-50 rounded-lg border border-slate-200">
      {equipmentType === LiftingEquipmentType.FORKLIFT ? (
        <>
          <rect x="20" y="55" width="30" height="18" fill="#334155" />
          <rect x="50" y="34" width="6" height="39" fill="#64748b" />
          <rect x="56" y="70" width="20" height="4" fill="#64748b" />
          <rect x="56" y="66" width="18" height="3" fill="#94a3b8" />
          <circle cx="28" cy="77" r="4" fill="#1e293b" />
          <circle cx="46" cy="77" r="4" fill="#1e293b" />
          <line x1="56" y1="34" x2="76" y2="34" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="78" y1="32" x2="78" y2="72" stroke="#0f172a" strokeWidth="1.2" />
        </>
      ) : equipmentType === LiftingEquipmentType.CHAIN_BLOCK ? (
        <>
          <rect x="18" y="20" width="64" height="4" fill="#334155" />
          <circle cx="50" cy="28" r="4" fill="#475569" />
          <line x1="50" y1="32" x2="50" y2="65" stroke="#0f172a" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
          <polygon points="46,66 54,66 58,76 42,76" fill="#64748b" />
          <line x1="50" y1="54" x2="67" y2="62" stroke="#94a3b8" strokeWidth="1.2" />
        </>
      ) : equipmentType === LiftingEquipmentType.GANTRY ? (
        <>
          <line x1="25" y1="72" x2="35" y2="30" stroke="#334155" strokeWidth="2" />
          <line x1="75" y1="72" x2="65" y2="30" stroke="#334155" strokeWidth="2" />
          <rect x="33" y="28" width="34" height="4" fill="#334155" />
          <line x1="50" y1="32" x2="50" y2="60" stroke="#0f172a" strokeWidth="1.3" />
          <polygon points="46,60 54,60 56,68 44,68" fill="#64748b" />
          <circle cx="25" cy="75" r="3" fill="#1e293b" />
          <circle cx="75" cy="75" r="3" fill="#1e293b" />
        </>
      ) : equipmentType === LiftingEquipmentType.OVERHEAD_CRANE ? (
        <>
          <rect x="16" y="22" width="68" height="5" fill="#334155" />
          <rect x="44" y="27" width="12" height="5" fill="#64748b" />
          <line x1="50" y1="32" x2="50" y2="62" stroke="#0f172a" strokeWidth="1.3" />
          <polygon points="46,62 54,62 56,72 44,72" fill="#64748b" />
          <line x1="20" y1="80" x2="80" y2="80" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 2" />
        </>
      ) : (
        <>
          <rect x="20" y="72" width="24" height="6" fill="#334155" />
          <line x1="32" y1="72" x2="68" y2="28" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="68" y1="28" x2="68" y2="58" stroke="#0f172a" strokeWidth="1.4" />
          <polygon points="64,58 72,58 74,66 62,66" fill="#64748b" />
          <line x1="32" y1="78" x2="68" y2="78" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 2" />
          <path d="M32,72 A17,17 0 0 1 48,55" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
        </>
      )}

      {labels.map(label => (
        <text
          key={label.key}
          x={label.x}
          y={label.y}
          fontSize="4.4"
          fill={isActive(label.key) ? '#dc2626' : '#0f172a'}
          fontWeight={isActive(label.key) ? '700' : '600'}
          textAnchor="middle"
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
};

interface LiftingPlanSectionProps {
  value: LiftingPlan;
  readOnly: boolean;
  onChange: (nextPlan: LiftingPlan) => void;
  showAttachmentControl?: boolean;
}

export const LiftingPlanSection: React.FC<LiftingPlanSectionProps> = ({ value, readOnly, onChange, showAttachmentControl = true }) => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const config = useMemo(() => equipmentConfigs[value.equipmentType], [value.equipmentType]);

  const updatePlan = (next: Partial<LiftingPlan>, invalidate: boolean = true) => {
    const basePlan = {
      ...value,
      ...next
    };

    if (invalidate) {
      onChange({
        ...basePlan,
        calculation: undefined,
        status: LiftingPlanStatus.DRAFT,
        sentForApprovalAt: undefined,
        approvedAt: undefined,
        hseApprover: undefined,
        approvalComments: undefined,
        attachedToPermit: false
      });
      return;
    }

    onChange(basePlan);
  };

  const handleEquipmentChange = (equipmentType: LiftingEquipmentType) => {
    const nextConfig = equipmentConfigs[equipmentType];
    const nextParameters = nextConfig.fields.reduce<Record<string, number | null>>((acc, field) => {
      acc[field.key] = null;
      return acc;
    }, {});

    updatePlan({
      equipmentType,
      parameters: nextParameters
    });
  };

  const setNumericField = (fieldKey: string, valueText: string, topLevel: boolean = false) => {
    const parsed = valueText === '' ? null : Number(valueText);
    if (parsed !== null && Number.isNaN(parsed)) {
      return;
    }

    if (topLevel) {
      updatePlan({ [fieldKey]: parsed } as Partial<LiftingPlan>);
      return;
    }

    updatePlan({
      parameters: {
        ...value.parameters,
        [fieldKey]: parsed
      }
    });
  };

  const runCalculation = () => {
    const calculation = calculateLiftingPlan(value);
    onChange({
      ...value,
      calculation,
      status: LiftingPlanStatus.DRAFT,
      sentForApprovalAt: undefined,
      approvedAt: undefined,
      hseApprover: undefined,
      approvalComments: undefined,
      attachedToPermit: false
    });
  };

  const sendForApproval = () => {
    if (!value.calculation?.pass) {
      return;
    }
    onChange({
      ...value,
      status: LiftingPlanStatus.PENDING_HSE,
      sentForApprovalAt: new Date().toISOString()
    });
  };

  const approveByHse = () => {
    if (!value.calculation?.pass) {
      return;
    }
    onChange({
      ...value,
      status: LiftingPlanStatus.APPROVED,
      approvedAt: new Date().toISOString(),
      hseApprover: 'Current User',
      attachedToPermit: true
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="font-bold text-slate-800">Lifting Plan</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {showAttachmentControl
              ? 'Calculate lift parameters, submit for HSE approval, then attach to permit.'
              : 'Calculate lift parameters and progress the plan through HSE approval.'}
          </p>
        </div>
        <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
          value.status === LiftingPlanStatus.APPROVED
            ? 'bg-green-100 text-green-700'
            : value.status === LiftingPlanStatus.PENDING_HSE
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-slate-100 text-slate-600'
        }`}>
          {value.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Equipment Type</label>
          <select
            disabled={readOnly}
            value={value.equipmentType}
            onChange={e => handleEquipmentChange(e.target.value as LiftingEquipmentType)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
            aria-label="Equipment Type"
          >
            {Object.values(LiftingEquipmentType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Load (t)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              value={value.loadWeight ?? ''}
              onChange={e => setNumericField('loadWeight', e.target.value, true)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              aria-label="Load Weight (t)"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Rigging (t)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              value={value.riggingWeight ?? ''}
              onChange={e => setNumericField('riggingWeight', e.target.value, true)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              aria-label="Rigging Weight (t)"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Dyn. Factor</label>
            <input
              type="number"
              min={1}
              step="0.05"
              disabled={readOnly}
              value={value.dynamicFactor}
              onChange={e => setNumericField('dynamicFactor', e.target.value, true)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              aria-label="Dynamic Factor"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-bold text-blue-900 mb-2">Quick Calculation Guide</h4>
        <ul className="text-xs text-blue-900 space-y-1 list-disc pl-4">
          <li>Total Lifted Load = Load Weight + Rigging Weight</li>
          <li>Required Capacity = Total Lifted Load x Dynamic Factor</li>
          <li>Utilization (%) = (Required Capacity / Rated Capacity) x 100</li>
          <li>Target utilization: 85% or below</li>
          <li>For rigging checks: sling angle should be 30 deg or higher</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DiagramBase equipmentType={value.equipmentType} activeField={activeField} labels={config.labels} />
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {config.fields.map(field => (
            <div key={field.key} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                <span className="text-[11px] text-slate-500">{field.unit}</span>
              </div>
              <input
                type="number"
                min={field.min}
                step="0.01"
                disabled={readOnly}
                value={value.parameters[field.key] ?? ''}
                onFocus={() => setActiveField(field.key)}
                onBlur={() => setActiveField(null)}
                onChange={e => setNumericField(field.key, e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm"
                aria-label={field.label}
              />
              <p className="text-xs text-slate-500 mt-1">{field.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={runCalculation}
          disabled={readOnly}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
        >
          <Calculator size={16} /> Run Lifting Calculation
        </button>
        <button
          onClick={sendForApproval}
          disabled={readOnly || !value.calculation?.pass || value.status !== LiftingPlanStatus.DRAFT}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 flex items-center gap-2"
        >
          <Send size={16} /> Send for HSE Approval
        </button>
        <button
          onClick={approveByHse}
          disabled={readOnly || value.status !== LiftingPlanStatus.PENDING_HSE}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
        >
          <CheckCircle2 size={16} /> Approve by HSE
        </button>
      </div>

      {value.calculation && (
        <div className={`rounded-lg border p-4 ${
          value.calculation.pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded border border-slate-200 p-2">
              <p className="text-[11px] text-slate-500 uppercase">Total Load</p>
              <p className="font-bold text-slate-800">{formatNumber(value.calculation.totalLiftedLoad)} t</p>
            </div>
            <div className="bg-white rounded border border-slate-200 p-2">
              <p className="text-[11px] text-slate-500 uppercase">Required Cap.</p>
              <p className="font-bold text-slate-800">{formatNumber(value.calculation.requiredCapacity)} t</p>
            </div>
            <div className="bg-white rounded border border-slate-200 p-2">
              <p className="text-[11px] text-slate-500 uppercase">Rated Cap.</p>
              <p className="font-bold text-slate-800">{formatNumber(value.calculation.ratedCapacity)} t</p>
            </div>
            <div className="bg-white rounded border border-slate-200 p-2">
              <p className="text-[11px] text-slate-500 uppercase">Utilization</p>
              <p className={`font-bold ${value.calculation.utilizationPercent > 85 ? 'text-red-700' : 'text-slate-800'}`}>
                {formatNumber(value.calculation.utilizationPercent)}%
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {value.calculation.notes.map((note, idx) => (
              <div key={idx} className="text-sm flex items-start gap-2 text-slate-700">
                {value.calculation.pass ? <CheckCircle2 size={15} className="mt-0.5 text-green-700" /> : <AlertTriangle size={15} className="mt-0.5 text-red-700" />}
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAttachmentControl && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={value.attachedToPermit}
              disabled={readOnly || value.status !== LiftingPlanStatus.APPROVED}
              onChange={e => onChange({ ...value, attachedToPermit: e.target.checked })}
              aria-label="Attach approved lifting plan to permit package"
            />
            Attach approved lifting plan to lifting permit package
          </label>
          {value.status === LiftingPlanStatus.APPROVED && (
            <p className="text-xs text-slate-500 mt-1">
              Approved by {value.hseApprover || 'HSE'} on {value.approvedAt ? new Date(value.approvedAt).toLocaleString() : '-'}.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
