
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Sparkles, Loader2, Plus, Trash2, Printer, AlertTriangle, X, Info, CheckCircle2
} from 'lucide-react';
import { getRiskAssessmentById, createRiskAssessment, updateRiskAssessment } from '../services/storageService';
import { identifyHazardsAI, suggestControlsAI, explainRiskScoreAI, reviewRiskAssessmentAI } from '../services/geminiService';
import { SmartTextArea } from './SmartTextInput';
import { RiskAssessment, RiskHazard, RiskControl, RiskControlType } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const RiskAssessmentForm: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  
  const [formData, setFormData] = useState<RiskAssessment>({
    id: `risk-${Date.now()}`,
    title: '',
    taskDescription: '',
    type: 'JHA',
    date: new Date().toISOString(),
    author: user?.name || 'Unknown',
    location: '',
    hazards: [],
    status: 'Draft'
  });

  const [loadingHazards, setLoadingHazards] = useState(false);
  const [loadingControls, setLoadingControls] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for AI Risk Explanations & Review
  const [riskExplanations, setRiskExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isNew && id) {
        const existing = await getRiskAssessmentById(id);
        if (existing) setFormData(existing);
      }
    };
    load();
  }, [id, isNew]);

  const handleSuggestHazards = async () => {

    if (!formData.taskDescription) { toast.error("Please enter a task description first."); return; }
    setLoadingHazards(true);
    try {
        const result = await identifyHazardsAI(formData.taskDescription, formData.type);
        if (result.rows && result.rows.length > 0) {
            const newHazards: RiskHazard[] = result.rows.map((row: any) => {
                const initP = Math.min(5, Math.max(1, parseInt(row.initialProbability) || 3));
                const initS = Math.min(5, Math.max(1, parseInt(row.initialSeverity) || 3));
                const actP  = Math.min(5, Math.max(1, parseInt(row.actualProbability)  || initP));
                const actS  = Math.min(5, Math.max(1, parseInt(row.actualSeverity)     || initS));
                return {
                    id: `haz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    workActivity:       row.workActivity      || '',
                    description:        row.hazard            || '',
                    personAtRisk:       row.personAtRisk      || '',
                    probability:        initP,
                    severity:           initS,
                    riskScore:          initP * initS,
                    controls:           (row.controls || []).map((c: any) => ({
                        id: `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
                        type: c.type || 'Administrative',
                        description: c.description || ''
                    })),
                    actualProbability:  actP,
                    actualSeverity:     actS,
                    actualRiskScore:    actP * actS,
                    additionalControls: row.additionalControls || '',
                    priority:           row.priority           || 'Medium',
                    actionBy:           row.actionBy           || '',
                    duration:           row.duration           || ''
                };
            });
            setFormData(prev => ({ ...prev, hazards: [...prev.hazards, ...newHazards] }));
            toast.success(`${newHazards.length} rows auto-filled from AI`);
        } else {
            toast.error("AI returned no hazards — try refining your task description.");
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to auto-fill hazards.");
    } finally {
        setLoadingHazards(false);
    }
  };

  const handleSuggestControls = async (hazardIndex: number) => {

    const hazard = formData.hazards[hazardIndex];
    if (!hazard || !hazard.description || hazard.description.trim().length < 3) {
      toast.error("Please enter a hazard description before generating controls.");
      return;
    }

    setLoadingControls(hazard.id);
    try {
        const result = await suggestControlsAI(hazard.description);
        if (result.controls && result.controls.length > 0) {
            const newControls: RiskControl[] = result.controls.map((c: any) => ({
                id: `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: c.type,
                description: c.description
            }));
            
            const updatedHazards = [...formData.hazards];
            updatedHazards[hazardIndex]!.controls = [...updatedHazards[hazardIndex]!.controls, ...newControls];
            setFormData({ ...formData, hazards: updatedHazards });
        } else {
          toast.error("AI could not generate specific controls for this hazard. Please try refining the description.");
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to suggest controls. Please check your connection.");
    } finally {
        setLoadingControls(null);
    }
  };

  const handleReviewRiskAssessment = async () => {

      if (!formData.taskDescription) { toast.error("Task description required for review."); return; }
      setLoadingReview(true);
      try {
          const hazardsList = formData.hazards.map(h => h.description);
          const result = await reviewRiskAssessmentAI(formData.taskDescription, hazardsList);
          setAiReview(result);
      } catch (e: any) {
          console.error(e);
          toast.error(`AI Review failed: ${e?.message || 'Unknown error'}`);
      } finally {
          setLoadingReview(false);
      }
  };

  const handleExplainRisk = async (hazard: RiskHazard) => {

    if (riskExplanations[hazard.id]) return; // Already loaded or collapsed
    setLoadingExplanation(hazard.id);
    try {
      const explanation = await explainRiskScoreAI(hazard.riskScore, hazard.description, hazard.probability, hazard.severity);
      setRiskExplanations(prev => ({ ...prev, [hazard.id]: explanation }));
    } catch (e: any) {
      console.error(e);
      toast.error(`AI Explanation failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoadingExplanation(null);
    }
  };

  const updateHazard = (index: number, updates: Partial<RiskHazard>) => {
    const updatedHazards = [...formData.hazards];
    const current = updatedHazards[index]!;
    
    // Recalculate initial score if prob/sev changes
    if (updates.probability !== undefined || updates.severity !== undefined) {
        const p = updates.probability ?? current.probability;
        const s = updates.severity ?? current.severity;
        updates.riskScore = p * s;
        if (riskExplanations[current.id]) {
            const newExplanations = {...riskExplanations};
            delete newExplanations[current.id];
            setRiskExplanations(newExplanations);
        }
    }

    // Recalculate actual risk score
    if (updates.actualProbability !== undefined || updates.actualSeverity !== undefined) {
        const p = updates.actualProbability ?? current.actualProbability ?? current.probability;
        const s = updates.actualSeverity ?? current.actualSeverity ?? current.severity;
        updates.actualRiskScore = p * s;
    }

    updatedHazards[index] = { ...current, ...updates };
    setFormData({ ...formData, hazards: updatedHazards });
  };

  const removeHazard = (index: number) => {
    const updated = formData.hazards.filter((_, i) => i !== index);
    setFormData({ ...formData, hazards: updated });
  };

  const removeControl = (hazardIndex: number, controlIndex: number) => {
    const updatedHazards = [...formData.hazards];
    updatedHazards[hazardIndex]!.controls = updatedHazards[hazardIndex]!.controls.filter((_, i) => i !== controlIndex);
    setFormData({ ...formData, hazards: updatedHazards });
  };

  const addManualControl = (hazardIndex: number, type: RiskControlType = 'Administrative') => {
      const updatedHazards = [...formData.hazards];
      updatedHazards[hazardIndex]!.controls.push({
          id: `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: type,
          description: ''
      });
      setFormData({...formData, hazards: updatedHazards});
  };

  const updateControl = (hazardIndex: number, controlIndex: number, field: keyof RiskControl, value: string) => {
      const updatedHazards = [...formData.hazards];
      updatedHazards[hazardIndex]!.controls[controlIndex] = {
          ...updatedHazards[hazardIndex]!.controls[controlIndex]!,
          [field]: value
      };
      setFormData({...formData, hazards: updatedHazards});
  };

  const handleSave = async () => {
    if (!formData.title) { toast.error("Title is required"); return; }
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isNew) {
        const savedId = await createRiskAssessment(formData);
        toast.success("Risk Assessment Saved!");
        // Navigate to the real server UUID so future saves hit PUT correctly
        navigate(`/risk-assessments/${savedId}`, { replace: true });
      } else {
        await updateRiskAssessment(formData);
        toast.success("Risk Assessment Updated!");
        navigate('/risk-assessments');
      }
    } catch (err: any) {
      console.error("Save risk assessment failed", err);
      toast.error(err?.message || "Failed to save risk assessment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const getRiskLevel = (score: number) => {
      if (score >= 15) return { label: 'Critical', color: 'bg-red-600', text: 'text-red-600', bg: 'bg-red-50' };
      if (score >= 10) return { label: 'High', color: 'bg-orange-500', text: 'text-orange-500', bg: 'bg-orange-50' };
      if (score >= 5) return { label: 'Medium', color: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' };
      return { label: 'Low', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' };
  };

  return (
    <div className="max-w-5xl mx-auto pb-10 print:p-0 print:max-w-none">
      
      {/* Print Only Header */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 uppercase">Risk Assessment Report - Safedify</h1>
                <p className="text-sm text-slate-500">Safedify Platform • Generated {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold">Ref: {formData.id}</p>
                <p className="text-sm text-slate-500">Status: {formData.status}</p>
            </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/risk-assessments')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'New Risk Assessment' : 'Edit Risk Assessment'}</h1>
        </div>
        <div className="flex gap-2">
            <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">
                <Printer size={18} /> Print PDF
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 print:shadow-none print:border-0 print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Assessment Title</label>
                <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none print:border-0 print:p-0 print:font-bold print:text-lg"
                    placeholder="e.g. Confined Space Entry - Tank A"
                />
            </div>
            <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">Type</label>
                 <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white print:border-0 print:p-0 print:appearance-none"
                 >
                     <option value="JHA">Job Hazard Analysis (JHA)</option>
                     <option value="HIRA">HIRA</option>
                     <option value="TRA">Task Risk Assessment (TRA)</option>
                 </select>
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Project / Location / Site</label>
                <input
                    type="text"
                    value={formData.location ?? ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none print:border-0 print:p-0"
                    placeholder="e.g. Site A – Block 3, Offshore Platform Alpha"
                />
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Task Description</label>
                <div className="relative">
                    <SmartTextArea 
                        value={formData.taskDescription}
                        onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                        onValueChange={(v) => setFormData(d => ({...d, taskDescription: v}))}
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] print:border-0 print:p-0 print:resize-none"
                        placeholder="Describe the steps involved in the task..."
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2 print:hidden">
                        <button 
                            type="button"
                            onClick={handleReviewRiskAssessment}
                            disabled={loadingReview}
                            className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-50 transition-colors"
                        >
                            {loadingReview ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Review Quality
                        </button>
                        <button 
                            type="button"
                            onClick={handleSuggestHazards}
                            disabled={loadingHazards}
                            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-200 transition-colors"
                        >
                            {loadingHazards ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            AI Auto-Fill Assessment
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* AI Review Result */}
        {aiReview && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 animate-in fade-in print:hidden">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                        <Sparkles size={16} /> AI Safety Review
                    </h4>
                    <button onClick={() => setAiReview(null)} className="text-purple-400 hover:text-purple-700"><X size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiReview.missingHazards?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-purple-800 uppercase mb-1">Missing Hazards Detected</p>
                            <ul className="list-disc pl-4 text-xs text-purple-700 space-y-1">
                                {aiReview.missingHazards.map((h: string, i: number) => <li key={i}>{h}</li>)}
                            </ul>
                        </div>
                    )}
                    {aiReview.improvements?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-purple-800 uppercase mb-1">Suggestions</p>
                            <ul className="list-disc pl-4 text-xs text-purple-700 space-y-1">
                                {aiReview.improvements.map((h: string, i: number) => <li key={i}>{h}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Hazards Section */}
        <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" /> Hazard Identification & Risk Control
            </h3>

            {/* Scrollable Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
                <table className="w-full text-sm border-collapse min-w-[1400px] print:min-w-0">
                    <thead>
                        <tr className="bg-slate-700 text-white text-xs">
                            <th className="p-2.5 text-center font-semibold w-8">#</th>
                            <th className="p-2.5 text-left font-semibold min-w-[150px]">Work Activity</th>
                            <th className="p-2.5 text-left font-semibold min-w-[190px]">Hazards / Risk</th>
                            <th className="p-2.5 text-left font-semibold min-w-[140px]">Person at Risk</th>
                            <th className="p-2.5 text-left font-semibold min-w-[160px]">Initial Risk Matrix</th>
                            <th className="p-2.5 text-left font-semibold min-w-[220px]">Control Measures</th>
                            <th className="p-2.5 text-left font-semibold min-w-[160px]">Actual Risk Matrix</th>
                            <th className="p-2.5 text-left font-semibold min-w-[190px]">Additional Control Measures</th>
                            <th className="p-2.5 text-left font-semibold min-w-[110px]">Priority</th>
                            <th className="p-2.5 text-left font-semibold min-w-[130px]">Action By</th>
                            <th className="p-2.5 text-left font-semibold min-w-[120px]">Duration</th>
                            <th className="p-2.5 w-8 print:hidden"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {formData.hazards.map((hazard, hIndex) => {
                            const initialLevel = getRiskLevel(hazard.riskScore);
                            const actualScore = hazard.actualRiskScore ?? hazard.riskScore;
                            const actualLevel = getRiskLevel(actualScore);
                            return (
                                <tr key={hazard.id} className={`align-top ${hIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} print:bg-white`}>
                                    {/* # */}
                                    <td className="p-2.5 text-center text-slate-400 font-semibold">{hIndex + 1}</td>

                                    {/* Work Activity */}
                                    <td className="p-2.5">
                                        <textarea rows={3} value={hazard.workActivity ?? ''} onChange={(e) => updateHazard(hIndex, { workActivity: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none resize-none print:border-0 print:p-0" placeholder="e.g. Lifting operations" />
                                    </td>

                                    {/* Hazards / Risk */}
                                    <td className="p-2.5">
                                        <textarea rows={3} value={hazard.description} onChange={(e) => updateHazard(hIndex, { description: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none resize-none print:border-0 print:p-0" placeholder="Describe hazard..." />
                                        <button type="button" onClick={() => handleSuggestControls(hIndex)} disabled={loadingControls === hazard.id} className="mt-1 text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium print:hidden">
                                            {loadingControls === hazard.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} AI Controls
                                        </button>
                                    </td>

                                    {/* Person at Risk */}
                                    <td className="p-2.5">
                                        <textarea rows={3} value={hazard.personAtRisk ?? ''} onChange={(e) => updateHazard(hIndex, { personAtRisk: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none resize-none print:border-0 print:p-0" placeholder="e.g. Rigger, Operator" />
                                    </td>

                                    {/* Initial Risk Matrix */}
                                    <td className="p-2.5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 print:hidden">
                                                <span className="text-[10px] text-slate-400 w-5">P:</span>
                                                <input type="range" min="1" max="5" value={hazard.probability} onChange={(e) => updateHazard(hIndex, { probability: parseInt(e.target.value) })} className="flex-1 accent-blue-600 h-1.5 cursor-pointer" title="Probability" aria-label="Probability" />
                                                <span className="text-xs font-bold text-slate-700 w-4">{hazard.probability}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 print:hidden">
                                                <span className="text-[10px] text-slate-400 w-5">S:</span>
                                                <input type="range" min="1" max="5" value={hazard.severity} onChange={(e) => updateHazard(hIndex, { severity: parseInt(e.target.value) })} className="flex-1 accent-blue-600 h-1.5 cursor-pointer" title="Severity" aria-label="Severity" />
                                                <span className="text-xs font-bold text-slate-700 w-4">{hazard.severity}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${initialLevel.color} text-white`}>{initialLevel.label}</span>
                                                <span className="text-xs text-slate-500">({hazard.riskScore})</span>
                                                <button type="button" onClick={() => handleExplainRisk(hazard)} className="text-purple-400 hover:text-purple-600 print:hidden" title="AI Explain">
                                                    {loadingExplanation === hazard.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                </button>
                                            </div>
                                            {riskExplanations[hazard.id] && (
                                                <div className="text-[10px] bg-purple-50 text-purple-800 p-1.5 rounded border border-purple-100 print:hidden relative">
                                                    <p className="pr-3">{riskExplanations[hazard.id]}</p>
                                                    <button onClick={() => { const n = {...riskExplanations}; delete n[hazard.id]; setRiskExplanations(n); }} className="absolute top-0.5 right-0.5 text-purple-400" title="Dismiss"><X size={10} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Control Measures */}
                                    <td className="p-2.5">
                                        <div className="space-y-1">
                                            {hazard.controls.map((control, cIndex) => (
                                                <div key={control.id} className="flex items-start gap-1 group">
                                                    <span title={control.type} className={`shrink-0 mt-0.5 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded ${control.type === 'Elimination' ? 'bg-red-100 text-red-700' : control.type === 'Substitution' ? 'bg-orange-100 text-orange-700' : control.type === 'Engineering' ? 'bg-blue-100 text-blue-700' : control.type === 'Administrative' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                        {control.type[0]}
                                                    </span>
                                                    <textarea rows={2} value={control.description} onChange={(e) => updateControl(hIndex, cIndex, 'description', e.target.value)} className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-400 resize-none min-w-0 print:border-0" placeholder="Describe control measure..." />
                                                    <button type="button" onClick={() => removeControl(hIndex, cIndex)} className="text-slate-300 hover:text-red-500 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 print:hidden" title="Remove control"><X size={11} /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => addManualControl(hIndex)} className="mt-0.5 text-[10px] flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium print:hidden">
                                                <Plus size={10} /> Add Control
                                            </button>
                                        </div>
                                    </td>

                                    {/* Actual Risk Matrix */}
                                    <td className="p-2.5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 print:hidden">
                                                <span className="text-[10px] text-slate-400 w-5">P:</span>
                                                <input type="range" min="1" max="5" value={hazard.actualProbability ?? hazard.probability} onChange={(e) => updateHazard(hIndex, { actualProbability: parseInt(e.target.value) })} className="flex-1 accent-green-600 h-1.5 cursor-pointer" title="Actual Probability" aria-label="Actual Probability" />
                                                <span className="text-xs font-bold text-slate-700 w-4">{hazard.actualProbability ?? hazard.probability}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 print:hidden">
                                                <span className="text-[10px] text-slate-400 w-5">S:</span>
                                                <input type="range" min="1" max="5" value={hazard.actualSeverity ?? hazard.severity} onChange={(e) => updateHazard(hIndex, { actualSeverity: parseInt(e.target.value) })} className="flex-1 accent-green-600 h-1.5 cursor-pointer" title="Actual Severity" aria-label="Actual Severity" />
                                                <span className="text-xs font-bold text-slate-700 w-4">{hazard.actualSeverity ?? hazard.severity}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${actualLevel.color} text-white`}>{actualLevel.label}</span>
                                                <span className="text-xs text-slate-500">({actualScore})</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Additional Control Measures */}
                                    <td className="p-2.5">
                                        <textarea rows={3} value={hazard.additionalControls ?? ''} onChange={(e) => updateHazard(hIndex, { additionalControls: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none resize-none print:border-0 print:p-0" placeholder="Additional measures..." />
                                    </td>

                                    {/* Priority */}
                                    <td className="p-2.5">
                                        <select value={hazard.priority ?? 'Medium'} onChange={(e) => updateHazard(hIndex, { priority: e.target.value })} title="Priority" className={`w-full border rounded p-1.5 text-xs font-bold uppercase outline-none print:border-0 ${hazard.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : hazard.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : hazard.priority === 'Low' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            <option value="Critical">Critical</option>
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </td>

                                    {/* Action By */}
                                    <td className="p-2.5">
                                        <input type="text" value={hazard.actionBy ?? ''} onChange={(e) => updateHazard(hIndex, { actionBy: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none print:border-0 print:p-0" placeholder="Name / Role" />
                                    </td>

                                    {/* Duration */}
                                    <td className="p-2.5">
                                        <input type="text" value={hazard.duration ?? ''} onChange={(e) => updateHazard(hIndex, { duration: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none print:border-0 print:p-0" placeholder="e.g. Immediate" />
                                    </td>

                                    {/* Delete */}
                                    <td className="p-2.5 print:hidden">
                                        <button type="button" onClick={() => removeHazard(hIndex)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete row"><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {formData.hazards.length === 0 && (
                            <tr>
                                <td colSpan={12} className="p-8 text-center text-slate-400">
                                    <AlertTriangle size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No hazards added yet. Use AI to suggest or add manually below.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, hazards: [...prev.hazards, {
                    id: `haz-${Date.now()}`,
                    workActivity: '', description: '', personAtRisk: '',
                    probability: 1, severity: 1, riskScore: 1,
                    controls: [],
                    actualProbability: 1, actualSeverity: 1, actualRiskScore: 1,
                    additionalControls: '', priority: 'Medium', actionBy: '', duration: ''
                }]}))}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:border-slate-400 font-medium transition-colors flex items-center justify-center gap-2 print:hidden text-sm"
            >
                <Plus size={18} /> Add Row
            </button>
        </div>
      </div>
    </div>
  );
};
