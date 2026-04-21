
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Camera, MapPin, Mic, Loader2, Sparkles, AlertTriangle,
  CheckSquare, StopCircle, ArrowLeft, BrainCircuit, Target,
  GitBranch, Lock, Plus, Trash2, ChevronDown, ChevronUp,
  Shield, Users, CloudRain, HardHat, Siren, FileText
} from 'lucide-react';
import { classifyIncidentAI, getCorrectiveActionsAI } from '../services/geminiService';
import { saveIncident } from '../services/storageService';
import { SmartTextInput, SmartTextArea } from './SmartTextInput';
import { compressImage } from '../services/offlineService';
import {
  IncidentSeverity, IncidentType, IncidentCategory, Incident, SubscriptionTier,
  InjuredPerson, IncidentWitness,
  NATURE_OF_INJURY_OPTIONS, MECHANISM_OPTIONS, BODY_PART_OPTIONS,
  PPE_OPTIONS, DEPARTMENT_OPTIONS, SHIFT_OPTIONS, WEATHER_OPTIONS, EMPLOYMENT_TYPE_OPTIONS,
} from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window { webkitSpeechRecognition: any; SpeechRecognition: any; }
}

/* ── Collapsible Section ─────────────────────────────── */
const Section: React.FC<{
  title: string; icon: React.ReactNode; defaultOpen?: boolean;
  children: React.ReactNode; badge?: string; id?: string; hasError?: boolean;
}> = ({ title, icon, defaultOpen = true, children, badge, id, hasError }) => {
  const [open, setOpen] = useState(defaultOpen);
  // Auto-open when flagged with error
  React.useEffect(() => { if (hasError) setOpen(true); }, [hasError]);
  return (
    <div id={id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${hasError ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-4 transition-colors text-left ${hasError ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
        <div className="flex items-center gap-3">
          <div className={hasError ? 'text-red-500' : 'text-blue-600'}>{icon}</div>
          <h3 className={`font-bold ${hasError ? 'text-red-700' : 'text-slate-800'}`}>{title}</h3>
          {hasError && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">Required</span>}
          {!hasError && badge && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && <div className="p-5 pt-0 space-y-4 border-t border-slate-100">{children}</div>}
    </div>
  );
};

/* ── Select helper ────────────────────────────────────── */
const FormSelect: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}> = ({ label, value, onChange, options, required }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
    <select value={value} onChange={e => onChange(e.target.value)} title={label} required={required}
      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const EMPTY_INJURED: InjuredPerson = {
  name: '', employmentType: '', jobTitle: '', department: '',
  yearsExperience: 0, natureOfInjury: '', bodyPart: '', treatmentProvided: '',
  hospitalName: '', daysLost: 0,
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export const IncidentReport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── 1  Incident Description ── */
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [shift, setShift] = useState('');
  const [taskBeingPerformed, setTaskBeingPerformed] = useState('');

  /* ── 2  Classification ── */
  const [incidentCategory, setIncidentCategory] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('');

  /* ── 3  Mechanism & Conditions ── */
  const [weatherConditions, setWeatherConditions] = useState('');
  const [environmentalImpact, setEnvironmentalImpact] = useState('');
  const [mechanism, setMechanism] = useState('');

  /* ── 4  Injured Persons ── */
  const [injuredPersons, setInjuredPersons] = useState<InjuredPerson[]>([]);

  /* ── 5  Witnesses ── */
  const [witnesses, setWitnesses] = useState<IncidentWitness[]>([]);

  /* ── 6  PPE ── */
  const [ppeWorn, setPpeWorn] = useState<string[]>([]);
  const [ppeAdequate, setPpeAdequate] = useState<boolean | null>(null);

  /* ── 7  Immediate Response ── */
  const [immediateActionsTaken, setImmediateActionsTaken] = useState('');
  const [areaSecured, setAreaSecured] = useState(false);
  const [emergencyServicesNotified, setEmergencyServicesNotified] = useState(false);
  const [regulatoryNotification, setRegulatoryNotification] = useState(false);

  /* ── 8  Evidence ── */
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  /* ── AI ── */
  const [isClassifying, setIsClassifying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});
  const [aiResult, setAiResult] = useState<{
    type: IncidentType; severity: IncidentSeverity; confidence: number;
    reasoning: string; causes?: string[]; contributingFactors?: string[];
  } | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const isPro = user?.tier === SubscriptionTier.PRO || user?.tier === SubscriptionTier.ENTERPRISE;

  /* ── Speech Recognition ── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const inst = new SR();
      inst.continuous = true; inst.interimResults = true; inst.lang = 'en-US';
      inst.onresult = (ev: any) => {
        let t = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++)
          if (ev.results[i].isFinal) t += ev.results[i][0].transcript;
        if (t) setDescription(p => p ? `${p} ${t}` : t);
      };
      inst.onerror = (ev: any) => { if (ev.error === 'not-allowed') toast.error('Microphone access denied.'); setIsListening(false); };
      inst.onend = () => setIsListening(false);
      setRecognition(inst);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) { toast.error('Voice input not supported.'); return; }
    if (isListening) { recognition.stop(); setIsListening(false); }
    else { try { setIsListening(true); recognition.start(); } catch { setIsListening(false); } }
  };

  /* ── AI Classify ── */
  const handleClassify = async () => {
    if (!isPro) { navigate('/pricing'); return; }
    if (description.length < 5) { toast.error('Provide more detail.'); return; }
    setIsClassifying(true); setRecommendations([]); setAiResult(null);
    try {
      const r = await classifyIncidentAI(description);
      setAiResult(r);
      setIncidentType(r.type); setSeverity(r.severity);
      const recs = await getCorrectiveActionsAI(description, r.type, r.severity);
      if (recs?.actions) setRecommendations(recs.actions);
    } catch { toast.error('AI Classification failed.'); }
    finally { setIsClassifying(false); }
  };

  /* ── Images ── */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsCompressing(true);
    try {
      const compressed = await Promise.all(Array.from(e.target.files).map(f => compressImage(f)));
      setSelectedImages(p => [...p, ...compressed]);
    } catch { toast.error('Image processing failed.'); }
    finally { setIsCompressing(false); }
  };

  /* ── Injured persons helpers ── */
  const addInjured = () => setInjuredPersons(p => [...p, { ...EMPTY_INJURED }]);
  const updInjured = (i: number, f: keyof InjuredPerson, v: any) =>
    setInjuredPersons(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const rmInjured = (i: number) => setInjuredPersons(p => p.filter((_, j) => j !== i));

  /* ── Witness helpers ── */
  const addWitness = () => setWitnesses(p => [...p, { name: '', contactInfo: '', statement: '' }]);
  const updWitness = (i: number, f: keyof IncidentWitness, v: string) =>
    setWitnesses(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const rmWitness = (i: number) => setWitnesses(p => p.filter((_, j) => j !== i));

  /* ── PPE toggle ── */
  const togglePPE = (item: string) =>
    setPpeWorn(p => p.includes(item) ? p.filter(x => x !== item) : [...p, item]);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields and flag sections
    const errors: Record<string, boolean> = {};
    const missing: string[] = [];

    if (!description || description.length < 5) {
      errors.description = true;
      missing.push('Incident Description');
    }
    if (!location) {
      errors.description = true;
      missing.push('Exact Location');
    }
    if (!incidentCategory) {
      errors.classification = true;
      missing.push('Incident Category');
    }
    if (!incidentType) {
      errors.classification = true;
      missing.push('Incident Type');
    }
    if (!severity) {
      errors.classification = true;
      missing.push('Severity');
    }

    setSectionErrors(errors);

    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.join(', ')}`, { duration: 5000 });
      // Scroll to first flagged section
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        document.getElementById(`section-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const newInc: Incident = {
        id: `inc-${Date.now()}`,
        description,
        date: incidentDate || new Date().toISOString(),
        dateReported: new Date().toISOString(),
        location, department,
        type: (incidentType || aiResult?.type || IncidentType.NEAR_MISS) as IncidentType,
        category: (incidentCategory || IncidentCategory.NEAR_MISS) as IncidentCategory,
        severity: (severity || aiResult?.severity || IncidentSeverity.LOW) as IncidentSeverity,
        status: 'Open',
        images: selectedImages,
        reporter: user?.name || 'Current User',
        shift, weatherConditions, taskBeingPerformed,
        injuredPersons, witnesses,
        daysLost: injuredPersons.reduce((s, p) => s + (p.daysLost || 0), 0),
        bodyPart: injuredPersons[0]?.bodyPart || '',
        mechanism, immediateAction: immediateActionsTaken,
        ppeWorn, ppeAdequate, environmentalImpact,
        immediateActionsTaken, areaSecured, emergencyServicesNotified, regulatoryNotification,
        aiClassification: aiResult ? {
          confidence: aiResult.confidence, reasoning: aiResult.reasoning,
          causes: aiResult.causes, contributingFactors: aiResult.contributingFactors,
        } : undefined,
        aiRecommendations: recommendations.length > 0 ? recommendations : undefined,
      };

      const result = await saveIncident(newInc);
      const incNum = result?.incident_number;
      toast.success(incNum ? `Incident ${incNum} submitted successfully!` : 'Incident report submitted successfully!');
      navigate('/incidents');
    } catch (err: any) {
      console.error('Save incident error:', err);
      toast.error(err?.message || 'Failed to submit incident report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/incidents')}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Back">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-red-500" /> Report Incident
          </h2>
          <p className="text-slate-500 text-sm">Complete all applicable sections below</p>
        </div>
      </div>

      {/* ═══ 1  INCIDENT DESCRIPTION ═══ */}
      <Section title="Incident Description" icon={<FileText size={20} />} badge="Required" id="section-description" hasError={!!sectionErrors.description}>
        <div className="pt-3 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">What happened? <span className="text-red-500">*</span></label>
            <div className="relative">
              <SmartTextArea value={description} onChange={e => { setDescription(e.target.value); setSectionErrors(p => ({ ...p, description: false })); }} onValueChange={(v) => { setDescription(v); setSectionErrors(p => ({ ...p, description: false })); }}
                className="w-full p-3 border border-slate-300 rounded-xl h-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-12 text-slate-800 shadow-inner"
                placeholder="Describe in detail: what happened, who was involved, the sequence of events..." />
              <button type="button" onClick={toggleListening} title="Voice to Text"
                className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}>
                {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <button type="button" onClick={handleClassify} disabled={isPro && (isClassifying || description.length < 5)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-md text-sm ${isPro ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-50' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {isPro ? (isClassifying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />) : <Lock size={14} />}
                {isPro ? (isClassifying ? 'Analyzing...' : 'AI Auto-Classify') : 'Unlock AI'}
              </button>
            </div>
          </div>

          {/* AI Results */}
          {aiResult && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 space-y-4 relative overflow-hidden">
              <BrainCircuit className="absolute -top-4 -right-4 text-purple-200 w-32 h-32 opacity-20 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-purple-900 font-bold flex items-center gap-2 mb-3"><Sparkles size={18} /> AI Assessment</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                    <span className="text-xs text-purple-600 uppercase font-bold">Type</span>
                    <div className="font-bold text-slate-800">{aiResult.type}</div>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                    <span className="text-xs text-purple-600 uppercase font-bold">Severity</span>
                    <div className={`font-bold ${aiResult.severity === IncidentSeverity.CRITICAL ? 'text-red-600' : aiResult.severity === IncidentSeverity.HIGH ? 'text-orange-600' : 'text-slate-800'}`}>
                      {aiResult.severity}
                    </div>
                  </div>
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-purple-100 mb-4">
                  <span className="text-xs text-purple-600 uppercase font-bold mb-1 block">Reasoning</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{aiResult.reasoning}
                    <span className="text-xs text-purple-400 ml-2 font-mono">({(aiResult.confidence * 100).toFixed(0)}% Conf.)</span>
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult.causes && aiResult.causes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-red-700 uppercase flex items-center gap-1 mb-2"><Target size={14} /> Potential Causes</h4>
                      <div className="flex flex-wrap gap-2">{aiResult.causes.map((c, i) => <span key={i} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-md border border-red-200">{c}</span>)}</div>
                    </div>
                  )}
                  {aiResult.contributingFactors && aiResult.contributingFactors.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-orange-700 uppercase flex items-center gap-1 mb-2"><GitBranch size={14} /> Contributing Factors</h4>
                      <div className="flex flex-wrap gap-2">{aiResult.contributingFactors.map((f, i) => <span key={i} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md border border-orange-200">{f}</span>)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-3"><CheckSquare size={18} /> Recommended Immediate Actions</h3>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-blue-100">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>{rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Date · Location · Department · Shift · Task */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date & Time of Incident <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" title="Date and time" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Exact Location <span className="text-red-500">*</span></label>
              <div className="relative">
                <SmartTextInput value={location} onChange={e => setLocation(e.target.value)} onValueChange={setLocation}
                  placeholder="e.g. Zone B - Generator Room, Level 3"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
              </div>
            </div>
            <FormSelect label="Department / Area" value={department} onChange={setDepartment} options={DEPARTMENT_OPTIONS} />
            <FormSelect label="Shift" value={shift} onChange={setShift} options={SHIFT_OPTIONS} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Task Being Performed</label>
            <SmartTextInput value={taskBeingPerformed} onChange={e => setTaskBeingPerformed(e.target.value)} onValueChange={setTaskBeingPerformed}
              placeholder="Describe the task / activity at time of incident"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
        </div>
      </Section>

      {/* ═══ 2  CLASSIFICATION ═══ */}
      <Section title="Classification" icon={<Shield size={20} />} badge="Required" id="section-classification" hasError={!!sectionErrors.classification}>
        <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormSelect label="Incident Category" value={incidentCategory} onChange={setIncidentCategory} options={Object.values(IncidentCategory)} required />
          <FormSelect label="Incident Type" value={incidentType} onChange={setIncidentType} options={Object.values(IncidentType)} required />
          <FormSelect label="Severity" value={severity} onChange={setSeverity} options={Object.values(IncidentSeverity)} required />
        </div>
        {incidentCategory && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            ['Medical Treatment Case','Restricted Work Case','Lost Time Injury','Fatality','Occupational Illness','Dangerous Occurrence'].includes(incidentCategory)
              ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {['Medical Treatment Case','Restricted Work Case','Lost Time Injury','Fatality','Occupational Illness','Dangerous Occurrence'].includes(incidentCategory)
              ? '⚠ OSHA Recordable — meets recordkeeping criteria' : '✓ Non-recordable under OSHA criteria'}
          </div>
        )}
      </Section>

      {/* ═══ 3  MECHANISM & CONDITIONS ═══ */}
      <Section title="Mechanism & Conditions" icon={<CloudRain size={20} />} defaultOpen={false}>
        <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect label="Mechanism of Injury" value={mechanism} onChange={setMechanism} options={MECHANISM_OPTIONS} />
          <FormSelect label="Weather / Environmental Conditions" value={weatherConditions} onChange={setWeatherConditions} options={WEATHER_OPTIONS} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Environmental Impact (if any)</label>
          <SmartTextArea value={environmentalImpact} onChange={e => setEnvironmentalImpact(e.target.value)} onValueChange={setEnvironmentalImpact}
            placeholder="Spill volume, contaminated area, emissions, waste, etc."
            className="w-full p-3 border border-slate-300 rounded-xl h-20 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
      </Section>

      {/* ═══ 4  INJURED PERSONS ═══ */}
      <Section title="Injured / Affected Persons" icon={<Users size={20} />} badge={injuredPersons.length > 0 ? String(injuredPersons.length) : undefined} defaultOpen={false}>
        <div className="pt-3 space-y-4">
          {injuredPersons.length === 0 && <p className="text-sm text-slate-500 italic">No injured persons recorded. Click below to add if applicable.</p>}
          {injuredPersons.map((p, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-sm">Person {idx + 1}</span>
                <button type="button" onClick={() => rmInjured(idx)} className="text-slate-400 hover:text-red-500" title="Remove"><Trash2 size={16} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input value={p.name} onChange={e => updInjured(idx, 'name', e.target.value)} title="Name"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Full name" />
                </div>
                <FormSelect label="Employment Type" value={p.employmentType} onChange={v => updInjured(idx, 'employmentType', v)} options={EMPLOYMENT_TYPE_OPTIONS} />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Job Title / Role</label>
                  <input value={p.jobTitle} onChange={e => updInjured(idx, 'jobTitle', e.target.value)} title="Job title"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g. Electrician" />
                </div>
                <FormSelect label="Department" value={p.department} onChange={v => updInjured(idx, 'department', v)} options={DEPARTMENT_OPTIONS} />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Years of Experience</label>
                  <input type="number" min={0} value={p.yearsExperience} onChange={e => updInjured(idx, 'yearsExperience', parseInt(e.target.value) || 0)} title="Experience"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <FormSelect label="Nature of Injury" value={p.natureOfInjury} onChange={v => updInjured(idx, 'natureOfInjury', v)} options={NATURE_OF_INJURY_OPTIONS} />
                <FormSelect label="Body Part Affected" value={p.bodyPart} onChange={v => updInjured(idx, 'bodyPart', v)} options={BODY_PART_OPTIONS} />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Treatment Provided</label>
                  <input value={p.treatmentProvided} onChange={e => updInjured(idx, 'treatmentProvided', e.target.value)} title="Treatment"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g. First aid, sent to hospital" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hospital (if applicable)</label>
                  <input value={p.hospitalName || ''} onChange={e => updInjured(idx, 'hospitalName', e.target.value)} title="Hospital"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Hospital / Clinic" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Days Lost (LTI)</label>
                  <input type="number" min={0} value={p.daysLost} onChange={e => updInjured(idx, 'daysLost', parseInt(e.target.value) || 0)} title="Days lost"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addInjured} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus size={16} /> Add Injured Person
          </button>
        </div>
      </Section>

      {/* ═══ 5  WITNESSES ═══ */}
      <Section title="Witnesses" icon={<Users size={20} />} badge={witnesses.length > 0 ? String(witnesses.length) : undefined} defaultOpen={false}>
        <div className="pt-3 space-y-4">
          {witnesses.length === 0 && <p className="text-sm text-slate-500 italic">No witnesses recorded.</p>}
          {witnesses.map((w, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-sm">Witness {idx + 1}</span>
                <button type="button" onClick={() => rmWitness(idx)} className="text-slate-400 hover:text-red-500" title="Remove"><Trash2 size={16} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                  <input value={w.name} onChange={e => updWitness(idx, 'name', e.target.value)} title="Witness name"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Info</label>
                  <input value={w.contactInfo} onChange={e => updWitness(idx, 'contactInfo', e.target.value)} title="Contact"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Phone or email" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Statement</label>
                <textarea value={w.statement || ''} onChange={e => updWitness(idx, 'statement', e.target.value)} title="Statement"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm h-16" placeholder="Witness account of the event..." />
              </div>
            </div>
          ))}
          <button type="button" onClick={addWitness} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus size={16} /> Add Witness
          </button>
        </div>
      </Section>

      {/* ═══ 6  PPE ═══ */}
      <Section title="PPE Worn at Time of Incident" icon={<HardHat size={20} />} defaultOpen={false}>
        <div className="pt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PPE_OPTIONS.map(item => (
              <button key={item} type="button" onClick={() => togglePPE(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  ppeWorn.includes(item) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                {ppeWorn.includes(item) ? '✓ ' : ''}{item}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Was PPE adequate for the task?</label>
            <div className="flex gap-4">
              {(['Yes', 'No', 'N/A'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="ppeAdequate" title={`PPE adequate: ${opt}`}
                    checked={opt === 'Yes' ? ppeAdequate === true : opt === 'No' ? ppeAdequate === false : ppeAdequate === null}
                    onChange={() => setPpeAdequate(opt === 'Yes' ? true : opt === 'No' ? false : null)}
                    className="text-blue-600" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ 7  IMMEDIATE RESPONSE ═══ */}
      <Section title="Immediate Response" icon={<Siren size={20} />} defaultOpen={false}>
        <div className="pt-3 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Immediate Actions Taken</label>
            <SmartTextArea value={immediateActionsTaken} onChange={e => setImmediateActionsTaken(e.target.value)} onValueChange={setImmediateActionsTaken}
              placeholder="First aid, area isolation, equipment shutdown, notifications..."
              className="w-full p-3 border border-slate-300 rounded-xl h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={areaSecured} onChange={e => setAreaSecured(e.target.checked)} className="w-4 h-4 rounded text-blue-600" title="Area secured" />
              <span className="text-sm font-medium text-slate-700">Area Secured / Barricaded</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={emergencyServicesNotified} onChange={e => setEmergencyServicesNotified(e.target.checked)} className="w-4 h-4 rounded text-blue-600" title="Emergency services" />
              <span className="text-sm font-medium text-slate-700">Emergency Services Called</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={regulatoryNotification} onChange={e => setRegulatoryNotification(e.target.checked)} className="w-4 h-4 rounded text-blue-600" title="Regulatory" />
              <span className="text-sm font-medium text-slate-700">Regulatory Body Notified</span>
            </label>
          </div>
        </div>
      </Section>

      {/* ═══ 8  EVIDENCE ═══ */}
      <Section title="Photo Evidence & Attachments" icon={<Camera size={20} />} badge={selectedImages.length > 0 ? String(selectedImages.length) : undefined} defaultOpen={false}>
        <div className="pt-3 space-y-3">
          <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative">
            <input type="file" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImageChange} disabled={isCompressing} title="Upload photos" />
            {isCompressing
              ? <Loader2 size={24} className="animate-spin text-blue-500" />
              : <><Camera size={24} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500 font-medium">Click to upload photos (multiple allowed)</span></>}
          </label>
          {selectedImages.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {selectedImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt={`Evidence ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm" />
                  <button type="button" onClick={() => setSelectedImages(p => p.filter((_, j) => j !== i))} title="Remove"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ═══ SUBMIT ═══ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <button type="submit" disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckSquare size={20} />}
          {isSubmitting ? 'Submitting...' : 'Submit Incident Report'}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">Report will be saved and assigned for investigation. Optional sections can be completed later.</p>
      </div>
    </form>
  );
};
