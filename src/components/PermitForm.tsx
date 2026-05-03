
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Sparkles, Loader2, AlertCircle, CheckCircle, Clock, ShieldAlert, CheckSquare, X, QrCode
} from 'lucide-react';
import { getPermitById, savePermit, getRiskAssessments } from '../services/storageService';
import { auditPermitAI, complianceGapAnalysisAI } from '../services/geminiService';
import { SmartTextInput, SmartTextArea } from './SmartTextInput';
import { Permit, PermitType, PermitStatus, RiskAssessment, ComplianceGap } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiCreateAction } from '../services/apiService';
import { CompliancePanel } from './CompliancePanel';
import toast from 'react-hot-toast';

export const PermitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';
  const isReadOnly = !isNew && id !== 'new'; // Simplification: Editing existing not full scope of MVP unless status is Draft

  // Form State
  const [formData, setFormData] = useState<Permit>({
    id: `ptw-${Date.now()}`,
    type: PermitType.HOT_WORK,
    location: '',
    description: '',
    validFrom: new Date().toISOString(), // Defaults to now
    validUntil: new Date(new Date().setHours(new Date().getHours() + 8)).toISOString(), // Defaults to +8h
    requestor: user?.name || 'Unknown',
    status: PermitStatus.DRAFT,
    controls: []
  });

  // Checklists based on type
  const checklistTemplates: Record<PermitType, string[]> = {
    [PermitType.HOT_WORK]: ['Fire Extinguisher on site', 'Fire Watch assigned', 'Combustibles removed (10m radius)', 'Welding equipment inspected'],
    [PermitType.CONFINED_SPACE]: ['Gas Test completed', 'Standby Man present', 'Rescue Plan available', 'Ventilation established', 'Communication system tested'],
    [PermitType.HEIGHT]: ['Harness inspected', 'Anchor points verified', 'Scaffolding tagged Green', 'Drop zone barricaded'],
    [PermitType.ELECTRICAL]: ['LOTO applied', 'Zero energy verified', 'Tools insulated', 'Arc flash PPE worn'],
    [PermitType.EXCAVATION]: ['Underground services scanned', 'Shoring/Benching in place', 'Access/Egress ladders provided'],
    [PermitType.LIFTING]: ['Load calculated', 'Rigging gear inspected', 'Crane operator certified', 'Wind speed checked'],
    [PermitType.COLD_WORK]: ['Area hazard assessment', 'PPE compliance check', 'Tools inspection']
  };

  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [complianceGaps, setComplianceGaps] = useState<ComplianceGap[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      // Load Risks
      setRiskAssessments(await getRiskAssessments());

      if (!isNew && id) {
        const existing = await getPermitById(id);
        if (existing) setFormData(existing);
      } else {
          // Initialize default checklist for new
          setFormData(prev => ({
              ...prev,
              controls: checklistTemplates[PermitType.HOT_WORK].map((l, i) => ({ id: `c-${i}`, label: l, checked: false }))
          }));
      }
    };
    load();
  }, [id, isNew]);

  const handleTypeChange = (newType: PermitType) => {
      setFormData(prev => ({
          ...prev,
          type: newType,
          controls: checklistTemplates[newType].map((l, i) => ({ id: `c-${i}`, label: l, checked: false }))
      }));
  };

  const handleRiskAssessmentChange = (raId: string) => {
    let updatedControls = [...formData.controls];
    
    const ra = riskAssessments.find(r => r.id === raId);
    if (ra) {
        // Import controls from the Risk Assessment
        const raControls = ra.hazards.flatMap(h => h.controls).map((c, i) => ({
            id: `ra-${ra.id}-${i}-${Date.now()}`,
            label: `[RA] ${c.description}`, // Mark source clearly
            checked: false
        }));
        
        // Append only if not already present to prevent duplicates
        const currentLabels = new Set(updatedControls.map(c => c.label));
        const toAdd = raControls.filter(c => !currentLabels.has(c.label));
        
        if (toAdd.length > 0) {
            updatedControls = [...updatedControls, ...toAdd];
        }
    }

    setFormData(prev => ({
        ...prev,
        riskAssessmentId: raId,
        controls: updatedControls
    }));
  };

  const handleControlToggle = (id: string) => {
      if (isReadOnly && formData.status !== PermitStatus.DRAFT) return;
      setFormData(prev => ({
          ...prev,
          controls: prev.controls.map(c => c.id === id ? { ...c, checked: !c.checked } : c)
      }));
  };

  // ---------- Compliance Scan ----------

  const handleRunComplianceScan = async () => {
    if (!formData.description) {
      toast.error("Add a work description first.");
      return;
    }
    setComplianceLoading(true);
    try {
      const ra = riskAssessments.find(r => r.id === formData.riskAssessmentId);
      const hazards = ra ? ra.hazards : [];
      const controlsText = formData.controls.map(c => `${c.checked ? '[✓]' : '[ ]'} ${c.label}`);
      const rawGaps = await complianceGapAnalysisAI(formData.type, formData.description, controlsText, hazards);
      setComplianceGaps(rawGaps.map(g => ({ ...g, applied: false })));
      if (rawGaps.length === 0) {
        toast.success("No compliance gaps detected — permit looks good!");
      } else {
        const fixable = rawGaps.filter(g => g.resolution === 'ai_fixable').length;
        const physical = rawGaps.filter(g => g.resolution === 'action_required').length;
        toast(`Found ${fixable} AI-fixable gap${fixable !== 1 ? 's' : ''} and ${physical} physical action${physical !== 1 ? 's' : ''} required.`, { icon: '🔍' });
      }
    } catch (e) {
      console.error("Compliance scan error:", e);
      toast.error("Compliance scan failed. You can still proceed manually.");
    } finally {
      setComplianceLoading(false);
    }
  };

  const handleApplyFix = (gapId: string) => {
    const gap = complianceGaps.find(g => g.id === gapId);
    if (!gap || !gap.aiSuggestion) return;
    const newControl = {
      id: `compliance-${gapId}`,
      label: `[AI Fix] ${gap.aiSuggestion}`,
      checked: true,
    };
    setFormData(prev => ({
      ...prev,
      controls: prev.controls.some(c => c.id === newControl.id)
        ? prev.controls
        : [...prev.controls, newControl],
    }));
    setComplianceGaps(prev => prev.map(g => g.id === gapId ? { ...g, applied: true } : g));
    toast.success("Control added to checklist.");
  };

  const handleApplyAll = () => {
    const fixable = complianceGaps.filter(g => g.resolution === 'ai_fixable' && !g.applied && g.aiSuggestion);
    const newControls = fixable.map(gap => ({
      id: `compliance-${gap.id}`,
      label: `[AI Fix] ${gap.aiSuggestion!}`,
      checked: true,
    }));
    setFormData(prev => {
      const existingIds = new Set(prev.controls.map(c => c.id));
      const toAdd = newControls.filter(c => !existingIds.has(c.id));
      return { ...prev, controls: [...prev.controls, ...toAdd] };
    });
    setComplianceGaps(prev => prev.map(g =>
      g.resolution === 'ai_fixable' && !g.applied ? { ...g, applied: true } : g
    ));
    toast.success(`${fixable.length} AI fixes applied to checklist.`);
  };

  const handleCreateActionItem = async (gap: ComplianceGap) => {
    const result = await apiCreateAction({
      title: gap.actionItemTitle || gap.description,
      description: `Compliance gap identified during permit audit (${formData.type}): ${gap.description}`,
      priority: 'High',
      status: 'Open',
      action_type: 'Corrective',
      category: 'Permit Compliance',
    });
    // Only runs on success (throws on failure — caught by CompliancePanel)
    setComplianceGaps(prev => prev.map(g =>
      g.id === gap.id ? { ...g, applied: true, actionItemId: result?.id } : g
    ));
    toast.success('Action Item created — permit will remain blocked until this is resolved.');
  };

  const performAudit = async (): Promise<boolean> => {
    if (!formData.description) {
        toast.error("Please enter a work description.");
        return false;
    }
    setLoadingAudit(true);
    try {
        // Find hazards from linked RA if selected
        let hazards: string[] = [];
        if (formData.riskAssessmentId) {
            const ra = riskAssessments.find(r => r.id === formData.riskAssessmentId);
            if (ra) hazards = ra.hazards.map(h => h.description);
        }

        const controlsText = formData.controls.filter(c => c.checked).map(c => c.label);
        
        const result = await auditPermitAI(formData.type, formData.description, controlsText, hazards);
        
        setFormData(prev => ({
            ...prev,
            aiAuditIssues: result.issues || []
        }));

        setLoadingAudit(false);

        // Only block on a hard "Fail" rating — "Pass" and "Conditional" allow submission
        if (result.overallRating === 'Fail') {
            return false;
        }
        return true;
    } catch (e) {
        console.error(e);
        toast.error("AI Audit failed. Proceeding without check.");
        setLoadingAudit(false);
        return true; // Allow proceed if AI fails (fail open or closed depends on policy, usually open for MVP)
    }
  };

  const handleRequestAudit = async () => {
      const passed = await performAudit();
      if (passed) {
          toast.success("AI Compliance Audit Passed: No missing critical controls detected.");
      }
  };

  const handleSave = async (status: PermitStatus) => {
      if (!formData.description) {
          toast.error("Please enter a work description.");
          return;
      }

      // If submitting for approval, run mandatory audit
      if (status === PermitStatus.PENDING) {
          // Block if any action_required compliance gaps haven't been addressed
          const unresolvedPhysical = complianceGaps.filter(g => g.resolution === 'action_required' && !g.applied);
          if (unresolvedPhysical.length > 0) {
            toast.error(`${unresolvedPhysical.length} physical action${unresolvedPhysical.length !== 1 ? 's' : ''} must be resolved before submitting. Create Action Items for each.`);
            return;
          }
          const passed = await performAudit();
          if (!passed) {
              toast.error("Compliance Check Failed. Please address the critical control gaps highlighted below before submitting.");
              return;
          }
      }

      try {
        const updated = { ...formData, status };
        await savePermit(updated);
        toast.success(`Permit ${status === PermitStatus.PENDING ? 'submitted for approval' : 'saved'}.`);
        navigate('/permits');
      } catch (err: any) {
        console.error("Save permit failed", err);
        toast.error(err?.message || "Failed to save permit. Please try again.");
      }
  };

  const handleApprove = async () => {
      try {
        // Simulation
        const updated = { ...formData, status: PermitStatus.APPROVED, approver: user?.name || 'Unknown' };
        await savePermit(updated);
        setFormData(updated);
        toast.success("Permit Approved and Active.");
      } catch (err: any) {
        console.error("Approve permit failed", err);
        toast.error(err?.message || "Failed to approve permit. Please try again.");
      }
  };

  // Generate QR Code URL if Approved
  const qrData = JSON.stringify({
      id: formData.id,
      type: formData.type,
      validUntil: formData.validUntil
  });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/permits')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'New Permit to Work' : `Permit #${formData.id}`}</h1>
                {!isNew && (
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        formData.status === PermitStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                        {formData.status}
                    </span>
                )}
            </div>
        </div>
        <div className="flex gap-2">
            {!isReadOnly || formData.status === PermitStatus.DRAFT ? (
                <>
                    <button onClick={() => handleSave(PermitStatus.DRAFT)} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">
                        Save Draft
                    </button>
                    <button 
                        onClick={() => handleSave(PermitStatus.PENDING)} 
                        disabled={loadingAudit}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-70"
                    >
                        {loadingAudit ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Submit
                    </button>
                </>
            ) : formData.status === PermitStatus.PENDING ? (
                <button onClick={handleApprove} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm">
                    <CheckCircle size={18} /> Approve Permit
                </button>
            ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Work Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Permit Type</label>
                          <select 
                            disabled={isReadOnly}
                            value={formData.type}
                            onChange={(e) => handleTypeChange(e.target.value as PermitType)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          >
                              {Object.values(PermitType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Assessment Ref</label>
                          <select 
                            disabled={isReadOnly}
                            value={formData.riskAssessmentId || ''}
                            onChange={(e) => handleRiskAssessmentChange(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          >
                              <option value="">-- None Linked --</option>
                              {riskAssessments.map(ra => <option key={ra.id} value={ra.id}>{ra.title} ({ra.status})</option>)}
                          </select>
                          
                          {/* Display Linked Hazards Context */}
                          {formData.riskAssessmentId && (
                              <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                  <span className="font-semibold text-slate-700 block mb-1">Identified Hazards from RA:</span>
                                  <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                                      {riskAssessments.find(r => r.id === formData.riskAssessmentId)?.hazards.map((h, i) => (
                                          <li key={i} className="leading-tight">{h.description}</li>
                                      ))}
                                  </ul>
                              </div>
                          )}
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                      <SmartTextInput 
                         disabled={isReadOnly}
                         value={formData.location}
                         onChange={(e) => setFormData({...formData, location: e.target.value})}
                         onValueChange={(v) => setFormData(d => ({...d, location: v}))}
                         className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                         placeholder="Specific location of work..."
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description of Work</label>
                      <SmartTextArea 
                         rows={3}
                         disabled={isReadOnly}
                         value={formData.description}
                         onChange={(e) => setFormData({...formData, description: e.target.value})}
                         onValueChange={(v) => setFormData(d => ({...d, description: v}))}
                         className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                         placeholder="Describe tasks, tools used, etc..."
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Valid From</label>
                          <input 
                             type="datetime-local"
                             disabled={isReadOnly}
                             value={formData.validFrom.slice(0, 16)}
                             onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                             className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Valid Until</label>
                          <input 
                             type="datetime-local"
                             disabled={isReadOnly}
                             value={formData.validUntil.slice(0, 16)}
                             onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                             className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          />
                      </div>
                  </div>
              </div>

              {/* Checklists */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800">Safety Controls & Checks</h3>
                    <div className="flex items-center gap-2">
                      <button 
                          onClick={handleRequestAudit}
                          disabled={loadingAudit}
                          className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                      >
                          {loadingAudit ? <Loader2 size={14} className="animate-spin"/> : <ShieldAlert size={14}/>}
                          Quick Check
                      </button>
                    </div>
                  </div>

                  {/* AI Audit Feedback (legacy simple view) */}
                  {formData.aiAuditIssues && formData.aiAuditIssues.length > 0 && complianceGaps.length === 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in">
                          <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-2">
                              <ShieldAlert size={16} /> AI Detected Gaps (Must Resolve)
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                              {formData.aiAuditIssues.map((issue, idx) => (
                                  <li key={idx} className="text-sm text-red-700">{issue}</li>
                              ))}
                          </ul>
                      </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formData.controls.map((control) => (
                          <label key={control.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${control.checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                              <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${control.checked ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300'}`}>
                                  {control.checked && <CheckSquare size={14} />}
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={control.checked} 
                                onChange={() => handleControlToggle(control.id)}
                                disabled={isReadOnly}
                              />
                              <span className={`text-sm ${control.checked ? 'text-green-900 font-medium' : 'text-slate-600'} ${control.label.startsWith('[RA]') ? 'text-blue-700' : ''}`}>
                                {control.label}
                              </span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* Compliance Panel */}
              <CompliancePanel
                gaps={complianceGaps}
                loading={complianceLoading}
                onRunScan={handleRunComplianceScan}
                onApplyFix={handleApplyFix}
                onApplyAll={handleApplyAll}
                onCreateActionItem={handleCreateActionItem}
                disabled={isReadOnly && formData.status !== PermitStatus.DRAFT}
              />
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md">
                 <h3 className="font-bold mb-4">Permit Status</h3>
                 <div className="space-y-4">
                     <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 ${formData.status !== PermitStatus.DRAFT ? 'text-green-400' : 'text-slate-400'}`}>1</div>
                         <div className="text-sm">
                             <p className="font-medium">Request Drafted</p>
                             <p className="text-slate-400 text-xs">{formData.requestor}</p>
                         </div>
                     </div>
                     <div className="w-0.5 h-6 bg-slate-700 ml-4"></div>
                     <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 ${formData.status === PermitStatus.APPROVED ? 'text-green-400' : 'text-slate-400'}`}>2</div>
                         <div className="text-sm">
                             <p className="font-medium">Approval</p>
                             <p className="text-slate-400 text-xs">{formData.approver || 'Pending Manager'}</p>
                         </div>
                     </div>
                     <div className="w-0.5 h-6 bg-slate-700 ml-4"></div>
                     <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 ${formData.status === PermitStatus.CLOSED ? 'text-green-400' : 'text-slate-400'}`}>3</div>
                         <div className="text-sm">
                             <p className="font-medium">Work Completion</p>
                             <p className="text-slate-400 text-xs">Closure required</p>
                         </div>
                     </div>
                 </div>
              </div>

              {/* QR Code for Approved Permits */}
              {formData.status === PermitStatus.APPROVED && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <QrCode size={18} /> Digital Permit
                      </h3>
                      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm mb-2">
                          <img src={qrUrl} alt="Permit QR Code" className="w-32 h-32" />
                      </div>
                      <p className="text-xs text-slate-500">Scan to verify validity</p>
                  </div>
              )}

              {/* Validity Check */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Clock size={18} /> Duration
                  </h3>
                  <div className="text-center bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-xs text-slate-500 uppercase font-bold">Total Validity</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">
                          {Math.max(0, (new Date(formData.validUntil).getTime() - new Date(formData.validFrom).getTime()) / (1000 * 60 * 60)).toFixed(1)} Hours
                      </p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
