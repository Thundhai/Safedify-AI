
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Sparkles, Loader2, CheckCircle, Clock, ShieldAlert, CheckSquare, QrCode
} from 'lucide-react';
import { getPermitById, savePermit, getRiskAssessments, getLiftingPlans } from '../services/storageService';
import { auditPermitAI } from '../services/geminiService';
import {
  Permit,
  PermitType,
  PermitStatus,
  RiskAssessment,
  LiftingPlanRecord,
  LiftingPlanStatus
} from '../types';

export const PermitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    requestor: 'Current User',
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
    [PermitType.LIFTING]: ['Load calculated', 'Rigging gear inspected', 'Crane operator certified', 'Wind speed checked', 'HSE-approved lifting plan attached'],
    [PermitType.COLD_WORK]: ['Area hazard assessment', 'PPE compliance check', 'Tools inspection']
  };

  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [liftingPlans, setLiftingPlans] = useState<LiftingPlanRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const approvedLiftingPlans = useMemo(
    () => liftingPlans.filter(plan => plan.plan.status === LiftingPlanStatus.APPROVED),
    [liftingPlans]
  );
  const selectedLiftingPlan = useMemo(
    () => liftingPlans.find(plan => plan.id === formData.liftingPlanId),
    [liftingPlans, formData.liftingPlanId]
  );
  
  useEffect(() => {
    // Load Risks
    setRiskAssessments(getRiskAssessments());
    setLiftingPlans(getLiftingPlans());

    if (!isNew && id) {
      const existing = getPermitById(id);
      if (existing) {
        setFormData(existing);
      }
    } else {
        // Initialize default checklist for new
        setFormData(prev => ({
            ...prev,
            controls: checklistTemplates[PermitType.HOT_WORK].map((l, i) => ({ id: `c-${i}`, label: l, checked: false }))
        }));
    }
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

  const performAudit = async (): Promise<boolean> => {
    if (!formData.description) {
        alert("Please enter a work description.");
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

        if (!result.issues || result.issues.length === 0) {
            return true; // Passed
        } else {
            return false; // Failed
        }
    } catch (e) {
        console.error(e);
        alert("AI Audit failed. Proceeding without check.");
        setLoadingAudit(false);
        return true; // Allow proceed if AI fails (fail open or closed depends on policy, usually open for MVP)
    }
  };

  const handleRequestAudit = async () => {
      const passed = await performAudit();
      if (passed) {
          alert("AI Compliance Audit Passed: No missing critical controls detected.");
      }
  };

  const handleSave = async (status: PermitStatus) => {
      if (!formData.description) {
          alert("Please enter a work description.");
          return;
      }

      // If submitting for approval, run mandatory audit
      if (status === PermitStatus.PENDING) {
          if (formData.type === PermitType.LIFTING) {
             if (!formData.liftingPlanId) {
                 alert("Please reference an approved lifting plan before submitting this lifting permit.");
                 return;
             }

             const selectedPlan = liftingPlans.find(plan => plan.id === formData.liftingPlanId);
             if (!selectedPlan) {
                 alert("Selected lifting plan was not found.");
                 return;
             }

             if (selectedPlan.plan.status !== LiftingPlanStatus.APPROVED) {
                 alert("Referenced lifting plan must be approved by HSE before permit submission.");
                 return;
             }
          }

          const passed = await performAudit();
          if (!passed) {
              alert("Compliance Check Failed. Please address the critical control gaps highlighted below before submitting.");
              return;
          }
      }

      const updated = { ...formData, status };
      savePermit(updated);
      alert(`Permit ${status === PermitStatus.PENDING ? 'submitted for approval' : 'saved'}.`);
      navigate('/permits');
  };

  const handleApprove = () => {
      // Simulation
      const updated = { ...formData, status: PermitStatus.APPROVED, approver: 'Current User' };
      savePermit(updated);
      setFormData(updated);
      alert("Permit Approved and Active.");
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
                      <input 
                         type="text"
                         disabled={isReadOnly}
                         value={formData.location}
                         onChange={(e) => setFormData({...formData, location: e.target.value})}
                         className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                         placeholder="Specific location of work..."
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description of Work</label>
                      <textarea 
                         rows={3}
                         disabled={isReadOnly}
                         value={formData.description}
                         onChange={(e) => setFormData({...formData, description: e.target.value})}
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

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Lifting Plan Reference (Optional)</h3>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Approved Lifting Plan</label>
                  <select
                    disabled={isReadOnly || approvedLiftingPlans.length === 0}
                    value={formData.liftingPlanId || ''}
                    onChange={(e) => setFormData({ ...formData, liftingPlanId: e.target.value || undefined })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  >
                    <option value="">-- Select approved lifting plan (if applicable) --</option>
                    {approvedLiftingPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title} - {plan.plan.status}
                      </option>
                    ))}
                  </select>
                  {approvedLiftingPlans.length === 0 && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <p className="font-semibold">No approved lifting plans found.</p>
                      <p className="text-xs mt-1">Create and approve a lifting plan first, then reference it in this permit.</p>
                      <Link
                        to="/lifting-plans/new"
                        className="inline-flex items-center mt-2 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        Create Lifting Plan
                      </Link>
                    </div>
                  )}
                  {formData.liftingPlanId && (
                    <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                      {!selectedLiftingPlan ? (
                        <span>Selected lifting plan not found.</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p><span className="font-semibold text-slate-700">Ref:</span> {selectedLiftingPlan.id}</p>
                            {selectedLiftingPlan.plan.status === LiftingPlanStatus.APPROVED && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">
                                Approved
                              </span>
                            )}
                          </div>
                          <p><span className="font-semibold text-slate-700">Equipment:</span> {selectedLiftingPlan.plan.equipmentType}</p>
                          <p><span className="font-semibold text-slate-700">Status:</span> {selectedLiftingPlan.plan.status}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Apply only when required for the selected work scope. For Lifting permits, an approved plan is mandatory.
                </p>
              </div>

              {/* Checklists */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800">Safety Controls & Checks</h3>
                    <button 
                        onClick={handleRequestAudit}
                        disabled={loadingAudit}
                        className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-purple-100"
                    >
                        {loadingAudit ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                        Manual AI Check
                    </button>
                  </div>

                  {/* AI Audit Feedback */}
                  {formData.aiAuditIssues && formData.aiAuditIssues.length > 0 && (
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
