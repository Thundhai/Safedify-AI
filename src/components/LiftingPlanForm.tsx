import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, AlertTriangle, CheckCircle2, Cloud,
  User, FileText, Upload, Trash2, ExternalLink, ShieldCheck,
  HardHat, Loader2, Printer,
} from 'lucide-react';
import {
  getLiftingPlanById, saveLiftingPlan, generatePlanNumber,
  getRiskAssessments, getWorkers,
} from '../services/storageService';
import {
  LiftCategory, LiftingDocument,
  LiftingPlan, LiftingPlanRecord, LiftingPlanStatus,
  LiftingEquipmentType,
} from '../types';
import { LiftingPlanSection } from './LiftingPlanSection';

// ── helpers ───────────────────────────────────────────────────────────────────

const GROUND_CONDITIONS = ['Concrete', 'Compacted Soil', 'Asphalt', 'Soft Ground', 'Sand', 'Unknown'];
const DOC_CATEGORIES: LiftingDocument['category'][] = [
  'Crane Load Chart', 'Equipment Certificate', 'Lift Sketch', 'Method Statement', 'Other',
];

const createDefaultPlan = (): LiftingPlan => ({
  equipmentType: LiftingEquipmentType.MOBILE_CRANE,
  liftCategory: LiftCategory.ROUTINE,
  loadDescription: '',
  loadWeight: null,
  riggingWeight: null,
  loadDimensions: '',
  centerOfGravityKnown: true,
  fragileLoad: false,
  hazardousLoad: false,
  dynamicFactor: 1.1,
  parameters: {
    boomLength: null, boomAngle: null, workingRadius: null,
    hookHeight: null, outriggerSpread: null, ratedCapacity: null,
  },
  status: LiftingPlanStatus.DRAFT,
  attachedToPermit: false,
  outriggersRequired: false,
  exclusionZoneEstablished: false,
  weatherSuitable: true,
  weatherChecked: false,
  methodStatementAttached: false,
  documents: [],
});

// ── sub-components ────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
    <div className="border-b border-slate-100 pb-3">
      <h3 className="font-bold text-slate-800 text-base">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const YesNo: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    <div className="flex gap-3">
      {[true, false].map(opt => (
        <button
          key={String(opt)}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(opt)}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${value === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {opt ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  </div>
);

// ── main component ────────────────────────────────────────────────────────────

export const LiftingPlanForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<LiftingPlanRecord>({
    id: `lift-${Date.now()}`,
    planNumber: '',
    title: '',
    project: '',
    location: '',
    description: '',
    date: new Date().toISOString(),
    author: 'Current User',
    plan: createDefaultPlan(),
  });

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [docCategory, setDocCategory] = useState<LiftingDocument['category']>('Other');

  const [riskAssessments] = useState(() => getRiskAssessments().filter((r: any) => r.status === 'Approved'));
  const [workers] = useState(() => getWorkers());

  useEffect(() => {
    if (!isNew && id) {
      const existing = getLiftingPlanById(id);
      if (existing) { setFormData(existing); return; }
    }
    setFormData(prev => ({ ...prev, planNumber: generatePlanNumber() }));
  }, [id, isNew]);

  const setRecord = (patch: Partial<LiftingPlanRecord>) =>
    setFormData(prev => ({ ...prev, ...patch }));

  const setPlan = (patch: Partial<LiftingPlan>) =>
    setFormData(prev => ({ ...prev, plan: { ...prev.plan, ...patch } }));

  const handleWeatherCheck = () => {
    setWeatherLoading(true);
    if (!navigator.geolocation) {
      setPlan({ weatherChecked: true, weatherSummary: 'Geolocation not supported.' });
      setWeatherLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation,cloud_cover&wind_speed_unit=kmh&timezone=auto`
          );
          const data = await res.json();
          const c = data.current;
          const summary = `${c.temperature_2m}°C · Wind ${c.wind_speed_10m} km/h · Precip ${c.precipitation} mm · Cloud ${c.cloud_cover}%`;
          setPlan({ weatherChecked: true, weatherSummary: summary });
        } catch {
          setPlan({ weatherChecked: true, weatherSummary: 'Could not retrieve weather data.' });
        } finally { setWeatherLoading(false); }
      },
      () => {
        setPlan({ weatherChecked: true, weatherSummary: 'Location access denied.' });
        setWeatherLoading(false);
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const doc: LiftingDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        category: docCategory,
        uploadedAt: new Date().toISOString(),
        dataUrl: ev.target?.result as string,
      };
      setPlan({ documents: [...(formData.plan.documents ?? []), doc] });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeDoc = (docId: string) =>
    setPlan({ documents: (formData.plan.documents ?? []).filter((d: LiftingDocument) => d.id !== docId) });

  const handleSave = () => {
    setSaveError('');
    if (!formData.title.trim()) { setSaveError('Plan title is required.'); return; }
    if (!formData.plan.riskAssessmentId) {
      setSaveError('A linked approved Risk Assessment is required before saving.');
      return;
    }
    saveLiftingPlan(formData);
    navigate('/lifting-plans');
  };

  const plan = formData.plan;
  const linkedRA = riskAssessments.find((r: any) => r.id === plan.riskAssessmentId);
  const readOnly = plan.status === LiftingPlanStatus.APPROVED;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/lifting-plans')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isNew ? 'New Lifting Plan' : 'Edit Lifting Plan'}</h1>
            {formData.planNumber && <p className="text-xs text-slate-500 font-mono mt-0.5">{formData.planNumber}</p>}
          </div>
        </div>
        <button onClick={handleSave} disabled={readOnly}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm">
          <Save size={16} /> Save Plan
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm print:hidden">
          <Printer size={15} /> Print
        </button>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {saveError}
        </div>
      )}

      {/* 1 — Plan Details */}
      <SectionCard title="Plan Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Number</label>
            <input readOnly value={formData.planNumber}
              className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-mono text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Title <span className="text-red-500">*</span></label>
            <input disabled={readOnly} value={formData.title}
              onChange={e => setRecord({ title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50"
              placeholder="e.g. Lift Generator to Roof Level 3" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Project</label>
            <input disabled={readOnly} value={formData.project ?? ''}
              onChange={e => setRecord({ project: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50"
              placeholder="Project name or number" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Site Location</label>
            <input disabled={readOnly} value={formData.location}
              onChange={e => setRecord({ location: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50"
              placeholder="Site or area" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
            <input type="date" disabled={readOnly} value={formData.date.split('T')[0]}
              onChange={e => setRecord({ date: new Date(e.target.value).toISOString() })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Prepared By</label>
            <input disabled={readOnly} value={formData.author}
              onChange={e => setRecord({ author: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
          <textarea disabled={readOnly} rows={2} value={formData.description}
            onChange={e => setRecord({ description: e.target.value })}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50 resize-none"
            placeholder="Brief description of lifting operation…" />
        </div>
      </SectionCard>

      {/* 2 — Lift Category */}
      <SectionCard title="Lift Category" subtitle="Select the category that applies to this lifting operation.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[LiftCategory.ROUTINE, LiftCategory.CRITICAL].map(cat => (
            <button key={cat} type="button" disabled={readOnly} onClick={() => setPlan({ liftCategory: cat })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${plan.liftCategory === cat
                ? cat === LiftCategory.CRITICAL ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
              } disabled:cursor-not-allowed`}>
              <div className="flex items-center gap-2 mb-1.5">
                {cat === LiftCategory.CRITICAL ? <AlertTriangle size={16} className="text-red-600" /> : <CheckCircle2 size={16} className="text-blue-600" />}
                <span className={`font-bold text-sm ${cat === LiftCategory.CRITICAL ? 'text-red-700' : 'text-blue-700'}`}>{cat}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {cat === LiftCategory.ROUTINE
                  ? 'Daily crane activities · Standard operations · Repetitive lifting tasks'
                  : 'Tandem lift · Over occupied buildings · Over live equipment · Near power lines · Personnel lifting · Hazardous or unusual loads'}
              </p>
            </button>
          ))}
        </div>
        {plan.liftCategory === LiftCategory.CRITICAL && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span><strong>Critical Lift.</strong> Requires enhanced planning, dedicated lift supervisor, and additional HSE scrutiny before approval.</span>
          </div>
        )}
      </SectionCard>

      {/* 3 — Linked Risk Assessment */}
      <SectionCard title="Linked Risk Assessment" subtitle="Select an approved Risk Assessment. Required before saving.">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Assessment <span className="text-red-500">*</span></label>
          <select disabled={readOnly} value={plan.riskAssessmentId ?? ''}
            onChange={e => setPlan({ riskAssessmentId: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50">
            <option value="">— Select an approved Risk Assessment —</option>
            {riskAssessments.map((ra: any) => (
              <option key={ra.id} value={ra.id}>{ra.title} ({ra.type}) — {ra.author}</option>
            ))}
          </select>
          {riskAssessments.length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={12} /> No approved Risk Assessments. Create and approve one first.
            </p>
          )}
        </div>
        {linkedRA ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">{(linkedRA as any).title}</p>
              <p className="text-xs text-green-700 mt-0.5">
                Type: {(linkedRA as any).type} · Author: {(linkedRA as any).author} · {new Date((linkedRA as any).date).toLocaleDateString()}
              </p>
              <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1"><ShieldCheck size={11} /> Approved</p>
            </div>
            <a href={`#/risk-assessments/${(linkedRA as any).id}`}
              className="flex-shrink-0 flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-semibold">
              <ExternalLink size={12} /> View
            </a>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No Risk Assessment selected.</p>
        )}
      </SectionCard>

      {/* 4 — Personnel */}
      <SectionCard title="Personnel" subtitle="Assign key personnel from the Workers register.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { field: 'liftingSupervisor', label: 'Lift Supervisor', icon: <HardHat size={13} /> },
            { field: 'craneOperator',     label: 'Crane Operator',  icon: <User size={13} /> },
            { field: 'rigger',            label: 'Rigger',          icon: <User size={13} /> },
            { field: 'banksman',          label: 'Banksman / Signalman', icon: <User size={13} /> },
            { field: 'hseRepresentative', label: 'HSE Representative (Optional)', icon: <ShieldCheck size={13} /> },
          ].map(({ field, label, icon }) => (
            <div key={field}>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">{icon} {label}</label>
              <select disabled={readOnly} value={(plan as any)[field] ?? ''}
                onChange={e => setPlan({ [field]: e.target.value || undefined } as any)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50">
                <option value="">— Select —</option>
                {(workers as any[]).map((w: any) => (
                  <option key={w.id} value={w.name}>{w.name} — {w.role}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {(workers as any[]).length === 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={12} /> No workers found. Add workers via the Workers module.
          </p>
        )}
      </SectionCard>

      {/* 5 — Load Details */}
      <SectionCard title="Load Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Load Description</label>
            <input disabled={readOnly} value={plan.loadDescription ?? ''}
              onChange={e => setPlan({ loadDescription: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50"
              placeholder="e.g. Diesel generator, skid-mounted" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Load Weight (tonnes)</label>
            <input type="number" min={0} step="0.01" disabled={readOnly} value={plan.loadWeight ?? ''}
              onChange={e => setPlan({ loadWeight: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Rigging Weight (tonnes)</label>
            <input type="number" min={0} step="0.01" disabled={readOnly} value={plan.riggingWeight ?? ''}
              onChange={e => setPlan({ riggingWeight: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50" placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Load Dimensions (Optional)</label>
            <input disabled={readOnly} value={plan.loadDimensions ?? ''}
              onChange={e => setPlan({ loadDimensions: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50"
              placeholder="e.g. 3.5m L × 2.0m W × 1.8m H" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <YesNo label="Centre of Gravity Known" value={plan.centerOfGravityKnown} onChange={v => setPlan({ centerOfGravityKnown: v })} disabled={readOnly} />
          <YesNo label="Fragile Load" value={plan.fragileLoad} onChange={v => setPlan({ fragileLoad: v })} disabled={readOnly} />
          <YesNo label="Hazardous Material" value={plan.hazardousLoad} onChange={v => setPlan({ hazardousLoad: v })} disabled={readOnly} />
        </div>
        {plan.hazardousLoad && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-700">
            <AlertTriangle size={13} /> Hazardous material — ensure MSDS/SDS is available and appropriate PPE is specified.
          </div>
        )}
      </SectionCard>

      {/* 6 — Site Conditions */}
      <SectionCard title="Site Conditions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ground Condition</label>
            <select disabled={readOnly} value={plan.groundCondition ?? ''}
              onChange={e => setPlan({ groundCondition: e.target.value || undefined })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50">
              <option value="">— Select —</option>
              {GROUND_CONDITIONS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <YesNo label="Outriggers Required" value={plan.outriggersRequired} onChange={v => setPlan({ outriggersRequired: v })} disabled={readOnly} />
          <YesNo label="Exclusion Zone Established" value={plan.exclusionZoneEstablished} onChange={v => setPlan({ exclusionZoneEstablished: v })} disabled={readOnly} />
          <YesNo label="Weather Suitable for Lifting" value={plan.weatherSuitable} onChange={v => setPlan({ weatherSuitable: v })} disabled={readOnly} />
        </div>
        {!plan.weatherSuitable && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-700">
            <AlertTriangle size={13} /> Weather conditions should be reassessed before HSE approval.
          </div>
        )}
        {/* Weather */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Cloud size={14} /> Current Weather</p>
              <p className="text-xs text-slate-400">Advisory only · via Open-Meteo using device location</p>
            </div>
            <button type="button" disabled={weatherLoading || readOnly} onClick={handleWeatherCheck}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex-shrink-0">
              {weatherLoading ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
              {weatherLoading ? 'Checking…' : 'Check Weather'}
            </button>
          </div>
          {plan.weatherSummary && (
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-600 flex-shrink-0" /> {plan.weatherSummary}
            </div>
          )}
        </div>
      </SectionCard>

      {/* 7 — Method Statement */}
      <SectionCard title="Method Statement">
        <YesNo label="Method Statement Attached?" value={plan.methodStatementAttached}
          onChange={v => setPlan({ methodStatementAttached: v })} disabled={readOnly} />
        {plan.methodStatementAttached && (
          <p className="text-xs text-slate-500">Upload the Method Statement in the Supporting Documents section below (select category "Method Statement").</p>
        )}
      </SectionCard>

      {/* 8 — Equipment & Calculation (existing engine, unchanged) */}
      <LiftingPlanSection
        value={formData.plan}
        readOnly={readOnly}
        showAttachmentControl={false}
        onChange={updatedPlan => setFormData(prev => ({ ...prev, plan: updatedPlan }))}
      />

      {/* 9 — Supporting Documents */}
      <SectionCard title="Supporting Documents" subtitle="Accepted: PDF, JPG, PNG, DOCX">
        {!readOnly && (
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={docCategory} onChange={e => setDocCategory(e.target.value as LiftingDocument['category'])}
              className="border border-slate-300 rounded-lg p-2.5 text-sm flex-1">
              {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex-shrink-0">
              <Upload size={14} /> Upload File
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleFileUpload} />
          </div>
        )}
        {(plan.documents ?? []).length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            <FileText size={28} className="mx-auto mb-2 opacity-30" /> No documents uploaded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {(plan.documents ?? []).map((doc: LiftingDocument) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-xs text-slate-400">{doc.category} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
                {!readOnly && (
                  <button type="button" onClick={() => removeDoc(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Bottom save bar */}
      {saveError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {saveError}
        </div>
      )}
      {!readOnly && (
        <div className="flex justify-end">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-md text-sm">
            <Save size={16} /> Save Lifting Plan
          </button>
        </div>
      )}

      {/* Mobile sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Printer size={15} /> Print
        </button>
        {!readOnly && (
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
            <Save size={15} /> Save Plan
          </button>
        )}
      </div>
      {/* Bottom padding for mobile sticky bar */}
      <div className="h-20 md:hidden" />
    </div>
  );
};
