
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Sparkles, Loader2, Plus, Trash2, Printer, AlertTriangle, X, Info, CheckCircle2, Lock
} from 'lucide-react';
import { getRiskAssessmentById, saveRiskAssessment } from '../services/storageService';
import { identifyHazardsAI, suggestControlsAI, explainRiskScoreAI, reviewRiskAssessmentAI } from '../services/geminiService';
import { RiskAssessment, RiskHazard, RiskControl, RiskControlType, SubscriptionTier } from '../types';
import { useAuth } from '../context/AuthContext';
import { ContextSelector } from './ContextSelector';

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

  const [contextId, setContextId] = useState<string|undefined>();

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
    saveRiskAssessment({ ...formData, contextId });
    alert("Risk Assessment Saved!");
    navigate('/risk-assessments');
  };

  const handleApprove = () => {
    const updated = { ...formData, status: 'Approved' as const };
    setFormData(updated);
    saveRiskAssessment(updated);
  };

  const getRiskLevel = (score: number) => {
      if (score >= 15) return { label: 'Critical', color: 'bg-red-600', text: 'text-red-600', bg: 'bg-red-50', border: '#dc2626' };
      if (score >= 10) return { label: 'High',     color: 'bg-orange-500', text: 'text-orange-500', bg: 'bg-orange-50', border: '#f97316' };
      if (score >= 5)  return { label: 'Medium',   color: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50', border: '#eab308' };
      return                  { label: 'Low',      color: 'bg-green-500',  text: 'text-green-600', bg: 'bg-green-50', border: '#22c55e' };
  };

  const controlTypeColor = (type: string) => {
    const map: Record<string, string> = {
      Elimination: '#fef2f2|#dc2626', Substitution: '#fff7ed|#ea580c',
      Engineering: '#eff6ff|#2563eb', Administrative: '#fefce8|#ca8a04', PPE: '#f0fdf4|#16a34a',
    };
    const [bg, color] = (map[type] || '#f8fafc|#64748b').split('|');
    return { bg, color };
  };

  const handlePrint = () => {
    const now = new Date();
    const docNum = `RA-${formData.id.split('-').pop()?.slice(-6).toUpperCase()}`;
    const typeLabel: Record<string, string> = { JHA: 'Job Hazard Analysis (JHA)', HIRA: 'Hazard Identification & Risk Assessment (HIRA)', TRA: 'Task Risk Assessment (TRA)' };

    const hazardRows = formData.hazards.map((h, i) => {
      const rl = getRiskLevel(h.riskScore);
      const controlsHTML = h.controls.map(c => {
        const { bg, color } = controlTypeColor(c.type);
        return `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
          <span style="flex-shrink:0;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:${bg};color:${color};border:1px solid ${color};white-space:nowrap;">${c.type.toUpperCase()}</span>
          <span style="font-size:11px;color:#374151;line-height:1.4;">${c.description || '—'}</span>
        </div>`;
      }).join('');

      return `<tr style="break-inside:avoid;page-break-inside:avoid;">
        <td style="text-align:center;font-weight:700;color:#64748b;border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;">${i + 1}</td>
        <td style="border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;">
          <div style="font-weight:600;color:#1e293b;font-size:12px;line-height:1.5;">${h.description || '—'}</div>
        </td>
        <td style="text-align:center;border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;font-size:13px;font-weight:700;color:#334155;">${h.probability}</td>
        <td style="text-align:center;border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;font-size:13px;font-weight:700;color:#334155;">${h.severity}</td>
        <td style="text-align:center;border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;">
          <div style="font-size:16px;font-weight:800;color:#1e293b;">${h.riskScore}</div>
        </td>
        <td style="text-align:center;border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;">
          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;border:1.5px solid ${rl.border};color:${rl.border};background:${rl.bg.replace('bg-','').replace('-50','').replace('-','').length > 0 ? '#fff' : '#fff'};">${rl.label}</span>
        </td>
        <td style="border:1px solid #e2e8f0;padding:10px 8px;vertical-align:top;">${controlsHTML || '<span style="color:#94a3b8;font-size:11px;">No controls added</span>'}</td>
      </tr>`;
    }).join('');

    const approvedStamp = formData.status === 'Approved' ? `
      <div style="position:absolute;top:24px;right:24px;border:3px solid #16a34a;border-radius:8px;padding:8px 16px;text-align:center;transform:rotate(-5deg);opacity:0.85;">
        <div style="font-size:11px;font-weight:800;color:#16a34a;letter-spacing:2px;">APPROVED</div>
        <div style="font-size:10px;color:#15803d;">${now.toLocaleDateString()}</div>
      </div>` : `
      <div style="position:absolute;top:24px;right:24px;border:3px solid #64748b;border-radius:8px;padding:8px 16px;text-align:center;transform:rotate(-5deg);opacity:0.6;">
        <div style="font-size:11px;font-weight:800;color:#64748b;letter-spacing:2px;">DRAFT</div>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Risk Assessment — ${formData.title}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
    
    .page-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 3px solid #0f172a; margin-bottom: 20px; position: relative; }
    .logo-block { display: flex; flex-direction: column; }
    .logo-name { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .logo-sub { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .doc-title-block { text-align: right; }
    .doc-type { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
    .doc-num { font-size: 11px; color: #64748b; margin-top: 2px; }

    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    .info-table td { padding: 7px 10px; font-size: 11.5px; border: 1px solid #e2e8f0; }
    .info-table .lbl { font-weight: 700; color: #475569; background: #f8fafc; width: 22%; }
    .info-table .val { color: #1e293b; }

    .section-heading { font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; background: #0f172a; color: #fff; margin-bottom: 0; border-radius: 4px 4px 0 0; }
    .task-box { border: 1px solid #e2e8f0; border-top: none; padding: 12px 14px; background: #f8fafc; border-radius: 0 0 4px 4px; font-size: 12px; line-height: 1.7; color: #374151; margin-bottom: 18px; white-space: pre-wrap; }

    .hazard-section-heading { font-size: 13px; font-weight: 700; padding: 8px 12px; background: #1e3a5f; color: #fff; border-radius: 4px 4px 0 0; margin-bottom: 0; text-transform: uppercase; letter-spacing: 0.5px; }

    .hazard-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-top: none; margin-bottom: 20px; border-radius: 0 0 4px 4px; overflow: hidden; }
    .hazard-table th { background: #1e3a5f; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 8px; text-align: center; border: 1px solid #2d4f80; }
    .hazard-table th.left { text-align: left; }
    .hazard-table tr:nth-child(even) td { background: #f8fafc; }

    .risk-matrix { display: inline-grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 18px; }
    .risk-pill { padding: 6px 14px; border-radius: 20px; font-size: 10px; font-weight: 800; text-align: center; border: 1.5px solid; }

    .sig-section { margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 16px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 12px; }
    .sig-box { border-top: 1px solid #334155; padding-top: 6px; }
    .sig-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .sig-name { font-size: 12px; color: #1e293b; margin-top: 2px; font-weight: 600; }
    .sig-space { height: 32px; }

    .legend { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

    .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding: 6px; background: white; }
    .control-hierarchy { font-size: 9px; color: #64748b; font-style: italic; margin-bottom: 10px; }
    @media print { .footer { position: fixed; bottom: 0; } }
  </style>
</head>
<body>

  <!-- Page Header -->
  <div class="page-header">
    <div class="logo-block">
      <div class="logo-name">Safedify</div>
      <div class="logo-sub">HSE Management Platform</div>
    </div>
    <div class="doc-title-block">
      <div class="doc-type">Risk Assessment</div>
      <div class="doc-num">${docNum} &nbsp;|&nbsp; ${typeLabel[formData.type] || formData.type}</div>
    </div>
    ${approvedStamp}
  </div>

  <!-- Document Info -->
  <table class="info-table">
    <tr>
      <td class="lbl">Assessment Title</td>
      <td class="val" colspan="3" style="font-weight:700;font-size:13px;">${formData.title}</td>
    </tr>
    <tr>
      <td class="lbl">Type</td><td class="val">${typeLabel[formData.type] || formData.type}</td>
      <td class="lbl">Document No.</td><td class="val">${docNum}</td>
    </tr>
    <tr>
      <td class="lbl">Date</td><td class="val">${new Date(formData.date).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'})}</td>
      <td class="lbl">Prepared By</td><td class="val">${formData.author}</td>
    </tr>
    <tr>
      <td class="lbl">Status</td>
      <td class="val" style="font-weight:700;color:${formData.status === 'Approved' ? '#16a34a' : '#64748b'};">${formData.status.toUpperCase()}</td>
      <td class="lbl">Total Hazards</td><td class="val">${formData.hazards.length}</td>
    </tr>
  </table>

  <!-- Task Description -->
  <div class="section-heading">Task / Work Description</div>
  <div class="task-box">${formData.taskDescription || 'No task description provided.'}</div>

  <!-- Risk Legend -->
  <div class="legend">
    <strong style="font-size:10px;color:#475569;align-self:center;">RISK LEGEND:</strong>
    <div class="legend-item"><div class="legend-dot" style="background:#dc2626;"></div><span>Critical (≥15)</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#f97316;"></div><span>High (10–14)</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#eab308;"></div><span>Medium (5–9)</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#22c55e;"></div><span>Low (1–4)</span></div>
    <span style="margin-left:auto;font-size:10px;color:#64748b;font-style:italic;">Risk Score = Probability (1–5) × Severity (1–5)</span>
  </div>

  <!-- Hazard Table -->
  <div class="hazard-section-heading">Hazard Identification, Risk Assessment &amp; Controls</div>
  <table class="hazard-table">
    <thead>
      <tr>
        <th style="width:4%;">#</th>
        <th class="left" style="width:24%;">Hazard Description</th>
        <th style="width:6%;">Prob.</th>
        <th style="width:6%;">Sev.</th>
        <th style="width:7%;">Score</th>
        <th style="width:10%;">Risk Level</th>
        <th class="left" style="width:43%;">Control Measures</th>
      </tr>
    </thead>
    <tbody>
      ${hazardRows || `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">No hazards recorded.</td></tr>`}
    </tbody>
  </table>

  <div class="control-hierarchy">
    Control Hierarchy (highest to lowest preference): Elimination → Substitution → Engineering Controls → Administrative Controls → PPE
  </div>

  <!-- Signature Block -->
  <div class="sig-section">
    <div style="font-size:11px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Authorisation &amp; Signatures</div>
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="sig-label">Prepared By</div>
        <div class="sig-name">${formData.author}</div>
        <div style="font-size:10px;color:#94a3b8;">Date: ${new Date(formData.date).toLocaleDateString('en-GB')}</div>
      </div>
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="sig-label">Reviewed By</div>
        <div class="sig-name">&nbsp;</div>
        <div style="font-size:10px;color:#94a3b8;">Date: _______________</div>
      </div>
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="sig-label">Approved By (HSE)</div>
        <div class="sig-name">${formData.status === 'Approved' ? formData.author : '&nbsp;'}</div>
        <div style="font-size:10px;color:#94a3b8;">Date: ${formData.status === 'Approved' ? now.toLocaleDateString('en-GB') : '_______________'}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Safedify HSE Platform &nbsp;|&nbsp; ${docNum} &nbsp;|&nbsp; Generated: ${now.toLocaleString()} &nbsp;|&nbsp; CONFIDENTIAL — For authorised personnel only &nbsp;|&nbsp; Page <span class="pageNumber"></span>
  </div>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow popups to generate the PDF.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
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
                <Printer size={18} /> {formData.status === 'Approved' ? 'Download PDF' : 'Print PDF'}
            </button>
            {formData.status !== 'Approved' && (
              <button type="button" onClick={handleApprove} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm">
                <CheckCircle2 size={18} /> Approve
              </button>
            )}
            {formData.status === 'Approved' && (
              <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold border border-green-200">
                <CheckCircle2 size={18} /> Approved
              </span>
            )}
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
            <div className="space-y-2 print:hidden">
                <ContextSelector value={contextId} onChange={setContextId} />
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
