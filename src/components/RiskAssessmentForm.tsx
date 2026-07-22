
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Sparkles, Loader2, Plus, Trash2, Printer, AlertTriangle, X, Info, CheckCircle2, Lock
} from 'lucide-react';
import { getRiskAssessmentById, saveRiskAssessment } from '../services/storageService';
import { identifyHazardsAI, suggestControlsAI, explainRiskScoreAI, reviewRiskAssessmentAI } from '../services/geminiService';
import { RiskAssessment, RiskHazard, RiskControl, RiskControlType, SubscriptionTier } from '../types';
import { useAuth } from '../context/AuthContext';

export const RiskAssessmentForm: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const isFree = user?.tier === SubscriptionTier.FREE;
  
  const [formData, setFormData] = useState<RiskAssessment>({
    id: `risk-${Date.now()}`,
    title: '',
    taskDescription: '',
    type: 'JHA',
    date: new Date().toISOString(),
    author: 'Current User',
    hazards: [],
    status: 'Draft'
  });

  const [loadingHazards, setLoadingHazards] = useState(false);
  const [loadingControls, setLoadingControls] = useState<string | null>(null);
  
  // State for AI Risk Explanations & Review
  const [riskExplanations, setRiskExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      const existing = getRiskAssessmentById(id);
      if (existing) setFormData(existing);
    }
  }, [id, isNew]);

  const handleSuggestHazards = async () => {
    if (isFree) return alert("Upgrade to Pro to use AI Hazard Identification.");
    if (!formData.taskDescription) return alert("Please enter a task description first.");
    setLoadingHazards(true);
    try {
        const result = await identifyHazardsAI(formData.taskDescription, formData.type);
        if (result.hazards && result.hazards.length > 0) {
            const newHazards: RiskHazard[] = result.hazards.map((desc: string) => ({
                id: `haz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                description: desc,
                probability: 3,
                severity: 3,
                riskScore: 9,
                controls: []
            }));
            setFormData(prev => ({ ...prev, hazards: [...prev.hazards, ...newHazards] }));
        }
    } catch (e) {
        console.error(e);
        alert("Failed to suggest hazards.");
    } finally {
        setLoadingHazards(false);
    }
  };

  const handleSuggestControls = async (hazardIndex: number) => {
    if (isFree) return alert("Upgrade to Pro for AI Controls.");
    const hazard = formData.hazards[hazardIndex];
    if (!hazard.description || hazard.description.trim().length < 3) {
      alert("Please enter a hazard description before generating controls.");
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
            updatedHazards[hazardIndex].controls = [...updatedHazards[hazardIndex].controls, ...newControls];
            setFormData({ ...formData, hazards: updatedHazards });
        } else {
          alert("AI could not generate specific controls for this hazard. Please try refining the description.");
        }
    } catch (e) {
        console.error(e);
        alert("Failed to suggest controls. Please check your connection.");
    } finally {
        setLoadingControls(null);
    }
  };

  const handleReviewRiskAssessment = async () => {
      if (isFree) return alert("Upgrade to Pro for AI Review.");
      if (!formData.taskDescription) return alert("Task description required for review.");
      setLoadingReview(true);
      try {
          const hazardsList = formData.hazards.map(h => h.description);
          const result = await reviewRiskAssessmentAI(formData.taskDescription, hazardsList);
          setAiReview(result);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingReview(false);
      }
  };

  const handleExplainRisk = async (hazard: RiskHazard) => {
    if (isFree) return alert("Upgrade to Pro for Risk Explanations.");
    if (riskExplanations[hazard.id]) return; // Already loaded or collapsed
    setLoadingExplanation(hazard.id);
    try {
      const explanation = await explainRiskScoreAI(hazard.riskScore, hazard.description, hazard.probability, hazard.severity);
      setRiskExplanations(prev => ({ ...prev, [hazard.id]: explanation }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExplanation(null);
    }
  };

  const updateHazard = (index: number, updates: Partial<RiskHazard>) => {
    const updatedHazards = [...formData.hazards];
    const current = updatedHazards[index];
    
    // Recalculate score if prob/sev changes
    if (updates.probability || updates.severity) {
        const p = updates.probability ?? current.probability;
        const s = updates.severity ?? current.severity;
        updates.riskScore = p * s;
        
        // Clear explanation if score changes significantly as it might not be valid
        if (riskExplanations[current.id]) {
            const newExplanations = {...riskExplanations};
            delete newExplanations[current.id];
            setRiskExplanations(newExplanations);
        }
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
    updatedHazards[hazardIndex].controls = updatedHazards[hazardIndex].controls.filter((_, i) => i !== controlIndex);
    setFormData({ ...formData, hazards: updatedHazards });
  };

  const addManualControl = (hazardIndex: number, type: RiskControlType = 'Administrative') => {
      const updatedHazards = [...formData.hazards];
      updatedHazards[hazardIndex].controls.push({
          id: `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: type,
          description: ''
      });
      setFormData({...formData, hazards: updatedHazards});
  };

  const updateControl = (hazardIndex: number, controlIndex: number, field: keyof RiskControl, value: string) => {
      const updatedHazards = [...formData.hazards];
      updatedHazards[hazardIndex].controls[controlIndex] = {
          ...updatedHazards[hazardIndex].controls[controlIndex],
          [field]: value
      };
      setFormData({...formData, hazards: updatedHazards});
  };

  const handleSave = () => {
    if (!formData.title) return alert("Title is required");
    saveRiskAssessment(formData);
    alert("Risk Assessment Saved!");
    navigate('/risk-assessments');
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
            <button type="button" onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                <Save size={18} /> Save
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
                    aria-label="Risk assessment title"
                />
            </div>
            <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">Type</label>
                 <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white print:border-0 print:p-0 print:appearance-none"
                    aria-label="Risk assessment type"
                 >
                     <option value="JHA">Job Hazard Analysis (JHA)</option>
                     <option value="HIRA">HIRA</option>
                     <option value="TRA">Task Risk Assessment (TRA)</option>
                 </select>
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Task Description</label>
                <div className="relative">
                    <textarea 
                        value={formData.taskDescription}
                        onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] print:border-0 print:p-0 print:resize-none"
                        placeholder="Describe the steps involved in the task..."
                        aria-label="Task description"
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2 print:hidden">
                        <button 
                            type="button"
                            onClick={handleReviewRiskAssessment}
                            disabled={loadingReview}
                            className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-50 transition-colors"
                        >
                            {loadingReview ? <Loader2 size={14} className="animate-spin" /> : (isFree ? <Lock size={14} /> : <Sparkles size={14} />)}
                            Review Quality
                        </button>
                        <button 
                            type="button"
                            onClick={handleSuggestHazards}
                            disabled={loadingHazards}
                            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-200 transition-colors"
                        >
                            {loadingHazards ? <Loader2 size={14} className="animate-spin" /> : (isFree ? <Lock size={14} /> : <Sparkles size={14} />)}
                            Suggest Hazards
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

            <div className="space-y-6">
                {formData.hazards.map((hazard, hIndex) => {
                    const riskLevel = getRiskLevel(hazard.riskScore);
                    return (
                        <div key={hazard.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 print:break-inside-avoid print:bg-white print:border-slate-300">
                            {/* Hazard Header */}
                            <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-slate-50">
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={hazard.description}
                                        onChange={(e) => updateHazard(hIndex, { description: e.target.value })}
                                        className="w-full bg-transparent font-medium text-slate-800 border-b border-transparent focus:border-slate-400 outline-none"
                                        placeholder="Describe Hazard..."
                                    />
                                </div>
                                <button type="button" onClick={() => removeHazard(hIndex)} className="text-slate-400 hover:text-red-500 print:hidden">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Risk Matrix Calculation */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase text-slate-500">Risk Assessment Matrix</h4>
                                    <div className="grid grid-cols-2 gap-4 print:hidden">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Probability (1-5)</label>
                                            <input 
                                                type="range" min="1" max="5" 
                                                value={hazard.probability} 
                                                onChange={(e) => updateHazard(hIndex, { probability: parseInt(e.target.value) })}
                                                className="w-full accent-blue-600 cursor-pointer"
                                            />
                                            <div className="text-center text-sm font-medium text-slate-700">{hazard.probability}</div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Severity (1-5)</label>
                                            <input 
                                                type="range" min="1" max="5" 
                                                value={hazard.severity} 
                                                onChange={(e) => updateHazard(hIndex, { severity: parseInt(e.target.value) })}
                                                className="w-full accent-blue-600 cursor-pointer"
                                            />
                                            <div className="text-center text-sm font-medium text-slate-700">{hazard.severity}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 print:border-0 print:p-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-600">
                                                Risk Score: <span className="font-bold text-slate-900">{hazard.riskScore}</span> (P:{hazard.probability} x S:{hazard.severity})
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => handleExplainRisk(hazard)}
                                                className="flex items-center gap-1 text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100 hover:bg-purple-100 transition-colors print:hidden"
                                                title="Get AI explanation of this risk score"
                                            >
                                                {isFree ? <Lock size={10} /> : <Sparkles size={10} />} Explain Score
                                            </button>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${riskLevel.color} text-white print:border print:border-slate-300 print:text-black print:bg-white`}>
                                            {riskLevel.label}
                                        </span>
                                    </div>

                                    {/* Explanation Box */}
                                    {(loadingExplanation === hazard.id || riskExplanations[hazard.id]) && (
                                        <div className="mt-2 text-xs bg-purple-50 text-purple-900 p-3 rounded-lg border border-purple-100 flex gap-2 animate-in fade-in slide-in-from-top-1 print:hidden relative">
                                            <Sparkles size={14} className="shrink-0 mt-0.5 text-purple-600" />
                                            <div className="flex-1">
                                                {loadingExplanation === hazard.id ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 size={12} className="animate-spin" /> Analyzing risk context...
                                                    </span>
                                                ) : (
                                                    <span className="leading-relaxed font-medium">{riskExplanations[hazard.id]}</span>
                                                )}
                                            </div>
                                            <button onClick={() => {
                                                const newExp = {...riskExplanations};
                                                delete newExp[hazard.id];
                                                setRiskExplanations(newExp);
                                            }} className="absolute top-1 right-1 text-purple-400 hover:text-purple-700">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase text-slate-500">Controls</h4>
                                        <button 
                                            type="button"
                                            onClick={() => handleSuggestControls(hIndex)}
                                            disabled={loadingControls === hazard.id}
                                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded border border-purple-100 hover:bg-purple-100 transition-colors print:hidden"
                                        >
                                            {loadingControls === hazard.id ? <Loader2 size={12} className="animate-spin" /> : (isFree ? <Lock size={12} /> : <Sparkles size={12} />)}
                                            AI Suggest Controls
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {hazard.controls.map((control, cIndex) => (
                                            <div key={control.id} className="flex items-start gap-2 bg-white p-3 rounded border border-slate-200 shadow-sm text-sm group hover:border-blue-300 transition-colors print:shadow-none print:border-slate-300">
                                                 {/* Type Badge / Select */}
                                                 <div className="shrink-0 relative">
                                                    <select 
                                                        value={control.type}
                                                        onChange={(e) => updateControl(hIndex, cIndex, 'type', e.target.value)}
                                                        className={`appearance-none pl-2 pr-6 py-1 rounded text-[10px] font-bold uppercase cursor-pointer outline-none border transition-colors print:border-0 print:p-0 print:appearance-none ${
                                                            control.type === 'Elimination' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            control.type === 'Substitution' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                            control.type === 'Engineering' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            control.type === 'Administrative' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                            'bg-green-50 text-green-700 border-green-100'
                                                        }`}
                                                     >
                                                         {['Elimination', 'Substitution', 'Engineering', 'Administrative', 'PPE'].map(t => (
                                                             <option key={t} value={t}>{t}</option>
                                                         ))}
                                                     </select>
                                                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 opacity-50 print:hidden">
                                                        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                                     </div>
                                                 </div>

                                                 <input 
                                                    type="text"
                                                    value={control.description}
                                                    onChange={(e) => updateControl(hIndex, cIndex, 'description', e.target.value)}
                                                    className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-slate-300 p-0 py-0.5 text-slate-700 focus:ring-0 placeholder:text-slate-300 transition-all text-sm print:text-black"
                                                    placeholder="Describe control measure..."
                                                 />
                                                 <button type="button" onClick={() => removeControl(hIndex, cIndex)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" aria-label="Remove this control">
                                                    <X size={16} />
                                                 </button>
                                            </div>
                                        ))}
                                        
                                        {/* Manual Add Buttons */}
                                        <div className="flex flex-wrap gap-2 pt-2 print:hidden">
                                            <span className="text-xs text-slate-400 self-center mr-1">Add Control:</span>
                                             <button type="button" onClick={() => addManualControl(hIndex, 'Elimination')} className="px-2 py-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors" aria-label="Add elimination control">Elimination</button>
                                             <button type="button" onClick={() => addManualControl(hIndex, 'Substitution')} className="px-2 py-1 text-[10px] uppercase font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors" aria-label="Add substitution control">Subst.</button>
                                             <button type="button" onClick={() => addManualControl(hIndex, 'Engineering')} className="px-2 py-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors" aria-label="Add engineering control">Engineering</button>
                                             <button type="button" onClick={() => addManualControl(hIndex, 'Administrative')} className="px-2 py-1 text-[10px] uppercase font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors" aria-label="Add administrative control">Admin</button>
                                             <button type="button" onClick={() => addManualControl(hIndex, 'PPE')} className="px-2 py-1 text-[10px] uppercase font-bold text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors">PPE</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, hazards: [...prev.hazards, {
                        id: `haz-${Date.now()}`, description: '', probability: 1, severity: 1, riskScore: 1, controls: []
                    }]}))}
                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:border-slate-400 font-medium transition-colors flex items-center justify-center gap-2 print:hidden"
                >
                    <Plus size={20} /> Add Hazard Manually
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
