
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Loader2, ShieldAlert, CheckSquare, QrCode,
  Clock, CheckCircle, XCircle, AlertTriangle, ClipboardList,
  ExternalLink, RefreshCw, User, Calendar
} from 'lucide-react';
import { getPermitById, savePermit, getRiskAssessments, getPermitActions } from '../services/storageService';
import { auditPermitAI, complianceGapAnalysisAI } from '../services/geminiService';
import { SmartTextInput, SmartTextArea } from './SmartTextInput';
import { Permit, PermitType, PermitStatus, RiskAssessment, ComplianceGap, ActionItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiCreateAction, apiUpdateAction } from '../services/apiService';
import { CompliancePanel } from './CompliancePanel';
import toast from 'react-hot-toast';

// Roles that can approve / reject permits (UI-level check; server enforces too)
const APPROVER_ROLES = ['Admin', 'HSE Manager', 'HSE Supervisor', 'Construction Manager', 'Operations Manager'];

type ActionItemStatus = ActionItem['status'];

const ACTION_STATUS_CYCLE: Record<string, ActionItemStatus> = {
  'Open': 'In Progress',
  'In Progress': 'Done',
  // 'Done'/'Verified': require explicit reopen — no auto-cycle
  'Overdue': 'In Progress',
};

const ACTION_STATUS_COLOR: Record<string, string> = {
  'Open': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'Done': 'bg-green-100 text-green-800 border-green-200',
  'Overdue': 'bg-red-100 text-red-800 border-red-200',
  'Verified': 'bg-purple-100 text-purple-800 border-purple-200',
};

function useCountdown(validUntil: string, active: boolean) {
  const [remaining, setRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const diff = new Date(validUntil).getTime() - Date.now();
      if (diff <= 0) { setIsExpired(true); setRemaining('Expired'); return; }
      setIsExpired(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [validUntil, active]);
  return { remaining, isExpired };
}

export const PermitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';
  const canApprove = APPROVER_ROLES.includes(user?.role || '');

  const [formData, setFormData] = useState<Permit>({
    id: `ptw-${Date.now()}`,
    type: PermitType.HOT_WORK,
    location: '',
    description: '',
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    requestor: user?.name || 'Unknown',
    status: PermitStatus.DRAFT,
    controls: [],
  });

  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [complianceGaps, setComplianceGaps] = useState<ComplianceGap[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [linkedActions, setLinkedActions] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeChecklist, setCloseChecklist] = useState<Record<string, boolean>>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approverComment, setApproverComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const gapsStorageKey = `safedify_compliance_gaps_${formData.id}`;

  useEffect(() => {
    if (complianceGaps.length > 0) {
      try { localStorage.setItem(gapsStorageKey, JSON.stringify(complianceGaps)); } catch { /* quota */ }
    }
  }, [complianceGaps, gapsStorageKey]);

  const checklistTemplates: Record<PermitType, string[]> = {
    [PermitType.HOT_WORK]: ['Fire Extinguisher on site', 'Fire Watch assigned', 'Combustibles removed (10m radius)', 'Welding equipment inspected'],
    [PermitType.CONFINED_SPACE]: ['Gas Test completed', 'Standby Man present', 'Rescue Plan available', 'Ventilation established', 'Communication system tested'],
    [PermitType.HEIGHT]: ['Harness inspected', 'Anchor points verified', 'Scaffolding tagged Green', 'Drop zone barricaded'],
    [PermitType.ELECTRICAL]: ['LOTO applied', 'Zero energy verified', 'Tools insulated', 'Arc flash PPE worn'],
    [PermitType.EXCAVATION]: ['Underground services scanned', 'Shoring/Benching in place', 'Access/Egress ladders provided'],
    [PermitType.LIFTING]: ['Load calculated', 'Rigging gear inspected', 'Crane operator certified', 'Wind speed checked'],
    [PermitType.COLD_WORK]: ['Area hazard assessment', 'PPE compliance check', 'Tools inspection'],
  };

  const loadLinkedActions = useCallback(async (permitId: string) => {
    setLoadingActions(true);
    try { setLinkedActions(await getPermitActions(permitId)); }
    finally { setLoadingActions(false); }
  }, []);

  useEffect(() => {
    const load = async () => {
      setRiskAssessments(await getRiskAssessments());
      if (!isNew && id) {
        const existing = await getPermitById(id);
        if (existing) {
          setFormData(existing);
          try {
            const saved = localStorage.getItem(`safedify_compliance_gaps_${existing.id}`);
            if (saved) setComplianceGaps(JSON.parse(saved));
          } catch { /* ignore */ }
          await loadLinkedActions(id);
        }
      } else {
        setFormData(prev => ({
          ...prev,
          controls: checklistTemplates[PermitType.HOT_WORK].map((l, i) => ({ id: `c-${i}`, label: l, checked: false })),
        }));
        try {
          const saved = localStorage.getItem(gapsStorageKey);
          if (saved) setComplianceGaps(JSON.parse(saved));
        } catch { /* ignore */ }
      }
    };
    load();
  }, [id, isNew]);

  const isCreator = formData.requestor === user?.name || user?.role === 'Admin';
  const isEditable = isNew || ((formData.status === PermitStatus.DRAFT || formData.status === PermitStatus.REJECTED) && isCreator);

  const { remaining: countdown, isExpired } = useCountdown(formData.validUntil, formData.status === PermitStatus.APPROVED);

  const handleTypeChange = (newType: PermitType) => {
    setFormData(prev => ({
      ...prev, type: newType,
      controls: checklistTemplates[newType].map((l, i) => ({ id: `c-${i}`, label: l, checked: false })),
    }));
  };

  const handleRiskAssessmentChange = (raId: string) => {
    const ra = riskAssessments.find(r => r.id === raId);
    let updatedControls = [...formData.controls];
    if (ra) {
      const raControls = ra.hazards.flatMap(h => h.controls).map((c, i) => ({
        id: `ra-${ra.id}-${i}-${Date.now()}`, label: `[RA] ${c.description}`, checked: false,
      }));
      const currentLabels = new Set(updatedControls.map(c => c.label));
      updatedControls = [...updatedControls, ...raControls.filter(c => !currentLabels.has(c.label))];
    }
    setFormData(prev => ({ ...prev, riskAssessmentId: raId, controls: updatedControls }));
  };

  const handleControlToggle = (controlId: string) => {
    if (!isEditable) return;
    setFormData(prev => ({
      ...prev, controls: prev.controls.map(c => c.id === controlId ? { ...c, checked: !c.checked } : c),
    }));
  };

  const handleRunComplianceScan = async () => {
    if (!formData.description) { toast.error('Add a work description first.'); return; }
    setComplianceLoading(true);
    try {
      const ra = riskAssessments.find(r => r.id === formData.riskAssessmentId);
      const rawGaps = await complianceGapAnalysisAI(
        formData.type, formData.description,
        formData.controls.map(c => `${c.checked ? '[âœ“]' : '[ ]'} ${c.label}`),
        ra ? ra.hazards : []
      );
      setComplianceGaps(rawGaps.map(g => ({ ...g, applied: false })));
      if (rawGaps.length === 0) {
        toast.success('No compliance gaps detected â€” permit looks good!');
      } else {
        const fixable = rawGaps.filter(g => g.resolution === 'ai_fixable').length;
        const physical = rawGaps.filter(g => g.resolution === 'action_required').length;
        toast(`Found ${fixable} AI-fixable gap${fixable !== 1 ? 's' : ''} and ${physical} physical action${physical !== 1 ? 's' : ''} required.`, { icon: 'ðŸ”' });
      }
    } catch { toast.error('Compliance scan failed. You can still proceed manually.'); }
    finally { setComplianceLoading(false); }
  };

  const handleApplyFix = (gapId: string) => {
    const gap = complianceGaps.find(g => g.id === gapId);
    if (!gap?.aiSuggestion) return;
    const newControl = { id: `compliance-${gapId}`, label: `[AI Fix] ${gap.aiSuggestion}`, checked: true };
    setFormData(prev => ({
      ...prev, controls: prev.controls.some(c => c.id === newControl.id) ? prev.controls : [...prev.controls, newControl],
    }));
    setComplianceGaps(prev => prev.map(g => g.id === gapId ? { ...g, applied: true } : g));
    toast.success('Control added to checklist.');
  };

  const handleApplyAll = () => {
    const fixable = complianceGaps.filter(g => g.resolution === 'ai_fixable' && !g.applied && g.aiSuggestion);
    const newControls = fixable.map(gap => ({ id: `compliance-${gap.id}`, label: `[AI Fix] ${gap.aiSuggestion!}`, checked: true }));
    setFormData(prev => {
      const existingIds = new Set(prev.controls.map(c => c.id));
      return { ...prev, controls: [...prev.controls, ...newControls.filter(c => !existingIds.has(c.id))] };
    });
    setComplianceGaps(prev => prev.map(g => g.resolution === 'ai_fixable' && !g.applied ? { ...g, applied: true } : g));
    toast.success(`${fixable.length} AI fixes applied to checklist.`);
  };

  const handleCreateActionItem = async (gap: ComplianceGap) => {
    const result = await apiCreateAction({
      title: gap.actionItemTitle || gap.description,
      description: `[Permit: ${formData.id}] Compliance gap identified during ${formData.type} permit audit: ${gap.description}`,
      priority: 'High', status: 'Open', action_type: 'Corrective',
      category: 'Permit Compliance', related_permit_id: formData.id,
    });
    setComplianceGaps(prev => prev.map(g => g.id === gap.id ? { ...g, applied: true, actionItemId: result?.id } : g));
    if (!isNew && id) await loadLinkedActions(id);
  };

  const performAudit = async (): Promise<boolean> => {
    if (!formData.description) { toast.error('Please enter a work description.'); return false; }
    setLoadingAudit(true);
    try {
      let hazards: string[] = [];
      if (formData.riskAssessmentId) {
        const ra = riskAssessments.find(r => r.id === formData.riskAssessmentId);
        if (ra) hazards = ra.hazards.map(h => h.description);
      }
      const result = await auditPermitAI(formData.type, formData.description, formData.controls.filter(c => c.checked).map(c => c.label), hazards);
      setFormData(prev => ({ ...prev, aiAuditIssues: result.issues || [] }));
      setLoadingAudit(false);
      return result.overallRating !== 'Fail';
    } catch { toast.error('AI Audit failed. Proceeding without check.'); setLoadingAudit(false); return true; }
  };

  const handleRequestAudit = async () => {
    const passed = await performAudit();
    if (passed) toast.success('AI Compliance Audit Passed: No missing critical controls detected.');
  };

  const handleSave = async (status: PermitStatus) => {
    if (status === PermitStatus.PENDING && !formData.description) {
      toast.error('Please enter a work description before submitting for approval.');
      return;
    }
    if (status === PermitStatus.PENDING) {
      // Block if compliance scan found unresolved physical action requirements
      const unresolvedPhysical = complianceGaps.filter(g => g.resolution === 'action_required' && !g.applied);
      if (unresolvedPhysical.length > 0) {
        toast.error(`${unresolvedPhysical.length} compliance gap${unresolvedPhysical.length !== 1 ? 's' : ''} require action items. Click "Create Action Item" for each before submitting.`);
        return;
      }
      // Block if any linked actions are not yet resolved
      const openActions = linkedActions.filter(a => a.status !== 'Done' && a.status !== 'Verified');
      if (openActions.length > 0) {
        toast.error(`${openActions.length} linked action${openActions.length !== 1 ? 's' : ''} ${openActions.length !== 1 ? 'are' : 'is'} not yet resolved. Complete all actions before submitting.`);
        return;
      }
      // Run AI audit BEFORE saving (so user sees any issues)
      const auditOk = await performAudit();
      if (!auditOk) {
        const proceed = window.confirm('AI Audit detected critical issues. Do you still want to submit this permit?');
        if (!proceed) return;
      }
    }
    setIsSaving(true);
    try {
      await savePermit({ ...formData, status });
      try { localStorage.removeItem(gapsStorageKey); } catch { /* ignore */ }
      toast.success(status === PermitStatus.PENDING ? 'Permit submitted for approval.' : 'Permit saved as draft.');
      navigate('/permits');
    } catch (err) {
      toast.error((err as any)?.message || 'Failed to save permit. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const updated: Permit = { ...formData, status: PermitStatus.APPROVED, approver: user?.name || 'Unknown', approverComments: approverComment.trim() || undefined };
      await savePermit(updated);
      setFormData(updated);
      setShowApproveModal(false);
      setApproverComment('');
      toast.success('Permit approved and now Active.');
    } catch (err: any) { toast.error(err?.message || 'Failed to approve permit.'); }
    finally { setIsSaving(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason.'); return; }
    setIsSaving(true);
    try {
      const updated: Permit = { ...formData, status: PermitStatus.REJECTED, approver: user?.name || 'Unknown', approverComments: rejectReason.trim() };
      await savePermit(updated);
      setFormData(updated);
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('Permit rejected. Requestor has been notified.');
    } catch (err: any) { toast.error(err?.message || 'Failed to reject permit.'); }
    finally { setIsSaving(false); }
  };

  const closeChecklistItems: Record<string, string[]> = {
    [PermitType.HOT_WORK]: [
      'All ignition sources removed from site',
      'Fire extinguishers returned to storage',
      'Hot surfaces have cooled to safe temperature',
      'Fire watch completed and sign-off obtained',
      'Work area inspected — no smouldering materials',
    ],
    [PermitType.CONFINED_SPACE]: [
      'All personnel have exited the confined space',
      'Atmosphere re-tested and confirmed safe',
      'Ventilation equipment removed',
      'Entry points sealed and secured',
      'All tools and materials accounted for',
    ],
    [PermitType.HEIGHT]: [
      'All personnel safely descended to ground level',
      'Fall arrest equipment inspected and stored',
      'Elevated work platform or scaffolding secured',
      'Work area below cleared of dropped objects',
    ],
    [PermitType.ELECTRICAL]: [
      'Electrical equipment re-energised safely',
      'LOTO locks removed by authorised persons',
      'Insulation and covers replaced',
      'All temporary grounding removed',
      'Electrical isolation register updated',
    ],
    [PermitType.EXCAVATION]: [
      'Excavation backfilled or securely barricaded',
      'Shoring / supports removed safely',
      'Underground services verified undamaged',
      'Site reinstated to original condition',
    ],
    [PermitType.LIFTING]: [
      'Load safely landed and secured',
      'Rigging and lifting gear removed and inspected',
      'Crane / lifting equipment de-rigged',
      'Exclusion zone removed',
    ],
    [PermitType.COLD_WORK]: [
      'Work area cleaned and restored',
      'All tools and materials removed',
      'Waste disposed of safely',
      'Site handover completed',
    ],
  };

  const handleClose = () => {
    setCloseChecklist({});
    setShowCloseModal(true);
  };

  const handleConfirmClose = async () => {
    const items = closeChecklistItems[formData.type] ?? closeChecklistItems[PermitType.COLD_WORK] ?? [];
    const allChecked = items.every((_: string, i: number) => closeChecklist[`item-${i}`]);
    if (!allChecked) {
      toast.error('Complete all close-out checklist items before closing.');
      return;
    }
    setIsSaving(true);
    try {
      const updated: Permit = { ...formData, status: PermitStatus.CLOSED };
      await savePermit(updated);
      setFormData(updated);
      setShowCloseModal(false);
      toast.success('Permit closed. Work completion confirmed and recorded.');
    } catch (err: unknown) { toast.error((err as any)?.message || 'Failed to close permit.'); }
    finally { setIsSaving(false); }
  };

  const handleToggleActionStatus = async (action: ActionItem) => {
    const nextStatus = ACTION_STATUS_CYCLE[action.status];
    if (!nextStatus) {
      // Done/Verified: require explicit confirmation before reopening
      const reopen = window.confirm(`This action is "${action.status}". Do you want to reopen it?`);
      if (!reopen) return;
    }
    const finalStatus = (nextStatus || "Open") as ActionItemStatus;
    setUpdatingActionId(action.id);
    try {
      await apiUpdateAction(action.id, { status: finalStatus });
      setLinkedActions(prev => prev.map(a => a.id === action.id ? { ...a, status: finalStatus } : a));
      toast.success(`Action marked as ${finalStatus}.`);
    } catch { toast.error("Failed to update action status."); }
    finally { setUpdatingActionId(null); }
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    [PermitStatus.DRAFT]: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <ClipboardList size={14} />, label: 'Draft' },
    [PermitStatus.PENDING]: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock size={14} />, label: 'Pending Approval' },
    [PermitStatus.APPROVED]: { color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle size={14} />, label: 'Active' },
    [PermitStatus.REJECTED]: { color: 'bg-red-100 text-red-800 border-red-300', icon: <XCircle size={14} />, label: 'Rejected' },
    [PermitStatus.CLOSED]: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <CheckSquare size={14} />, label: 'Closed' },
    [PermitStatus.EXPIRED]: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: <AlertTriangle size={14} />, label: 'Expired' },
  };
  const currentStatus = statusConfig[formData.status] ?? statusConfig[PermitStatus.DRAFT]!;

  const qrData = JSON.stringify({ id: formData.id, type: formData.type, validUntil: formData.validUntil });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  const workflowSteps = [
    { label: 'Draft', key: PermitStatus.DRAFT },
    { label: 'Approval', key: PermitStatus.PENDING },
    { label: 'Active', key: PermitStatus.APPROVED },
    { label: 'Closed', key: PermitStatus.CLOSED },
  ];
  const stepIndex = formData.status === PermitStatus.REJECTED ? 1 : workflowSteps.findIndex(s => s.key === formData.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/permits')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? 'New Permit to Work' : `Permit #${formData.id.slice(0, 8).toUpperCase()}`}
            </h1>
            {!isNew && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full border mt-1 ${currentStatus.color}`}>
                {currentStatus.icon} {currentStatus.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* DRAFT / REJECTED: editable actions */}
          {isEditable && (
            <>
              <button
                onClick={() => handleSave(PermitStatus.DRAFT)}
                disabled={isSaving}
                className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-60 text-sm"
              >
                {isSaving ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}Save Draft
              </button>
              <button
                onClick={() => handleSave(PermitStatus.PENDING)}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-70 text-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {formData.status === PermitStatus.REJECTED ? 'Resubmit for Approval' : 'Submit for Approval'}
              </button>
            </>
          )}

          {/* PENDING: approve/reject for managers */}
          {formData.status === PermitStatus.PENDING && canApprove && (
            <>
              <button onClick={() => setShowRejectModal(true)} disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm disabled:opacity-70 text-sm">
                <XCircle size={16} /> Reject
              </button>
              <button onClick={() => setShowApproveModal(true)} disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm disabled:opacity-70 text-sm">
                <CheckCircle size={16} /> Approve
              </button>
            </>
          )}

          {/* PENDING: non-manager waiting indicator */}
          {formData.status === PermitStatus.PENDING && !canApprove && !isNew && (
            <span className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
              <Clock size={14} /> Awaiting manager approval
            </span>
          )}

          {/* ACTIVE: close permit */}
          {formData.status === PermitStatus.APPROVED && (isCreator || canApprove) && (
            <button onClick={handleClose} disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm disabled:opacity-70 text-sm">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
              Close Permit
            </button>
          )}
        </div>
      </div>

            {/* Auto-expiry banner for Active permits past validUntil */}
            {formData.status === PermitStatus.APPROVED && isExpired && (
              <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-orange-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-800 text-sm">This permit has expired</p>
                  <p className="text-orange-700 text-xs mt-0.5">The permit validity period has passed. Please close this permit to confirm all work has been completed safely.</p>
                </div>
                {(isCreator || canApprove) && (
                  <button onClick={handleClose} disabled={isSaving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shrink-0">
                    Close Now
                  </button>
                )}
              </div>
            )}
      
            {/* All actions resolved banner — show on Rejected permits with 0 open actions */}
            {formData.status === PermitStatus.REJECTED && linkedActions.length > 0 && linkedActions.every(a => a.status === "Done" || a.status === "Verified") && (
              <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">All required actions are resolved</p>
                  <p className="text-green-700 text-xs mt-0.5">All linked action items are Done or Verified. You can now resubmit this permit for approval.</p>
                </div>
              </div>
            )}
      
            {/* Workflow progress bar */}
      {!isNew && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200 z-0" />
            {workflowSteps.map((step, idx) => {
              const isActive = idx === stepIndex && formData.status !== PermitStatus.REJECTED;
              const isDone = stepIndex > idx && formData.status !== PermitStatus.REJECTED;
              const isRejectedStep = formData.status === PermitStatus.REJECTED && idx === 1;
              return (
                <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    isRejectedStep ? 'bg-red-100 border-red-400 text-red-700' :
                    isDone ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-blue-600 border-blue-600 text-white' :
                    'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isRejectedStep ? 'âœ•' : isDone ? 'âœ“' : idx + 1}
                  </div>
                  <span className={`mt-1.5 text-xs font-medium text-center ${
                    isRejectedStep ? 'text-red-600' : isDone ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}>{isRejectedStep ? 'Rejected' : step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rejection banner */}
      {formData.status === PermitStatus.REJECTED && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Permit Rejected by {formData.approver}</p>
            {formData.approverComments && <p className="text-red-700 text-sm mt-0.5">"{formData.approverComments}"</p>}
            {isCreator && <p className="text-red-600 text-xs mt-1">Edit the details below and resubmit for approval.</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Work Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Permit Type</label>
                <select disabled={!isEditable} value={formData.type} onChange={(e) => handleTypeChange(e.target.value as PermitType)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500">
                  {Object.values(PermitType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Assessment Ref</label>
                <select disabled={!isEditable} value={formData.riskAssessmentId || ''} onChange={(e) => handleRiskAssessmentChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500">
                  <option value="">-- None Linked --</option>
                  {riskAssessments.map(ra => <option key={ra.id} value={ra.id}>{ra.title} ({ra.status})</option>)}
                </select>
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
              <SmartTextInput disabled={!isEditable} value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                onValueChange={(v) => setFormData(d => ({ ...d, location: v }))}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="Specific location of work..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description of Work</label>
              <SmartTextArea rows={3} disabled={!isEditable} value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onValueChange={(v) => setFormData(d => ({ ...d, description: v }))}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="Describe tasks, tools used, etc..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Valid From</label>
                <input type="datetime-local" disabled={!isEditable} value={formData.validFrom.slice(0, 16)}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Valid Until</label>
                <input type="datetime-local" disabled={!isEditable} value={formData.validUntil.slice(0, 16)}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-50" />
              </div>
            </div>
          </div>

          {/* Safety Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">Safety Controls & Checks</h3>
              {isEditable && (
                <button onClick={handleRequestAudit} disabled={loadingAudit}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
                  {loadingAudit ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />} Quick Check
                </button>
              )}
            </div>
            {formData.aiAuditIssues && formData.aiAuditIssues.length > 0 && complianceGaps.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-2"><ShieldAlert size={16} /> AI Detected Gaps</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {formData.aiAuditIssues.map((issue, idx) => <li key={idx} className="text-sm text-red-700">{issue}</li>)}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.controls.map((control) => (
                <label key={control.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  control.checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                } ${!isEditable ? 'cursor-default' : 'cursor-pointer'}`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    control.checked ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300'
                  }`}>
                    {control.checked && <CheckSquare size={14} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={control.checked} onChange={() => handleControlToggle(control.id)} disabled={!isEditable} />
                  <span className={`text-sm ${control.checked ? 'text-green-900 font-medium' : 'text-slate-600'} ${control.label.startsWith('[RA]') ? 'text-blue-700' : ''}`}>
                    {control.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Compliance Panel â€” only when editable */}
          {isEditable && (
            <CompliancePanel
              gaps={complianceGaps}
              loading={complianceLoading}
              onRunScan={handleRunComplianceScan}
              onApplyFix={handleApplyFix}
              onApplyAll={handleApplyAll}
              onCreateActionItem={handleCreateActionItem}
              disabled={false}
            />
          )}

          {/* Linked Actions Panel */}
          {!isNew && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-500" />
                  Linked Action Items
                  {linkedActions.length > 0 && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{linkedActions.length}</span>
                  )}
                </h3>
                <button onClick={() => id && loadLinkedActions(id)} disabled={loadingActions}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <RefreshCw size={12} className={loadingActions ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              {loadingActions ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
              ) : linkedActions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No action items linked to this permit yet.</p>
                  {isEditable && <p className="text-xs text-slate-400 mt-1">Run a compliance scan to generate action items.</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedActions.map(action => (
                    <div key={action.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{action.title}</p>
                        {action.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{action.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {action.assignee && (
                            <span className="flex items-center gap-1 text-xs text-slate-500"><User size={10} /> {action.assignee}</span>
                          )}
                          {action.dueDate && (
                            <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar size={10} /> {new Date(action.dueDate).toLocaleDateString()}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            action.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                            action.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>{action.priority}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleActionStatus(action)}
                          disabled={updatingActionId === action.id}
                          title={`Click to mark as ${ACTION_STATUS_CYCLE[action.status] || 'Open'}`}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all hover:opacity-80 ${ACTION_STATUS_COLOR[action.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                        >
                          {updatingActionId === action.id ? <Loader2 size={10} className="animate-spin inline" /> : action.status}
                        </button>
                        <button onClick={() => navigate(`/actions/${action.id}`)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                          View <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow tracker */}
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md">
            <h3 className="font-bold mb-4 text-xs uppercase tracking-wide text-slate-400">Permit Workflow</h3>
            <div className="space-y-1">
              {[
                { num: 1, label: 'Request Drafted', sub: formData.requestor, done: formData.status !== PermitStatus.DRAFT },
                { num: 2, label: 'Approval', sub: formData.approver || 'Awaiting manager', done: formData.status === PermitStatus.APPROVED || formData.status === PermitStatus.CLOSED },
                { num: 3, label: 'Active Work', sub: formData.status === PermitStatus.APPROVED ? 'Permit is active' : 'After approval', done: formData.status === PermitStatus.CLOSED },
                { num: 4, label: 'Closed', sub: 'Work completion', done: formData.status === PermitStatus.CLOSED },
              ].map((step, idx) => (
                <div key={idx}>
                  {idx > 0 && <div className="w-0.5 h-4 bg-slate-700 ml-4 my-1" />}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      {step.done ? 'âœ“' : step.num}
                    </div>
                    <div className="text-sm min-w-0">
                      <p className="font-medium text-slate-100">{step.label}</p>
                      <p className="text-slate-400 text-xs truncate">{step.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approval / Rejection details */}
          {(formData.status === PermitStatus.APPROVED || formData.status === PermitStatus.REJECTED || formData.status === PermitStatus.CLOSED) && formData.approver && (
            <div className={`p-5 rounded-xl shadow-sm border ${formData.status === PermitStatus.REJECTED ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${formData.status === PermitStatus.REJECTED ? 'text-red-800' : 'text-green-800'}`}>
                {formData.status === PermitStatus.REJECTED ? <XCircle size={16} /> : <CheckCircle size={16} />}
                {formData.status === PermitStatus.REJECTED ? 'Rejection Details' : 'Approval Details'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-700"><User size={12} className="text-slate-400" /><span className="font-medium">{formData.approver}</span></div>
                {formData.approverComments && (
                  <p className="text-slate-600 text-xs bg-white/60 rounded p-2 border border-white/50">"{formData.approverComments}"</p>
                )}
              </div>
            </div>
          )}

          {/* Duration & countdown */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm"><Clock size={16} className="text-blue-500" /> Duration & Validity</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">From:</span>
                <span className="font-medium">{new Date(formData.validFrom).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Until:</span>
                <span className="font-medium">{new Date(formData.validUntil).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-medium">{Math.max(0, (new Date(formData.validUntil).getTime() - new Date(formData.validFrom).getTime()) / 3600000).toFixed(1)} hrs</span>
              </div>
            </div>
            {formData.status === PermitStatus.APPROVED && (
              <div className={`mt-3 rounded-lg p-3 text-center border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Time Remaining</p>
                <p className={`text-lg font-bold font-mono ${isExpired ? 'text-red-600' : 'text-green-700'}`}>{countdown}</p>
              </div>
            )}
          </div>

          {/* QR Code for Active permits */}
          {formData.status === PermitStatus.APPROVED && !isExpired && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm"><QrCode size={16} /> Digital Permit</h3>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm mb-2">
                <img src={qrUrl} alt="Permit QR Code" className="w-32 h-32" />
              </div>
              <p className="text-xs text-slate-500">Scan to verify validity</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Approve Modal ---- */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle size={20} className="text-green-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Approve Permit</h2>
                <p className="text-sm text-slate-500">{formData.type} â€” {formData.location}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Approval Comments (optional)</label>
              <textarea value={approverComment} onChange={(e) => setApproverComment(e.target.value)} rows={3}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                placeholder="Any conditions or instructions for the work team..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowApproveModal(false); setApproverComment(''); }}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Cancel</button>
              <button onClick={handleApprove} disabled={isSaving}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Reject Modal ---- */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><XCircle size={20} className="text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Reject Permit</h2>
                <p className="text-sm text-slate-500">{formData.type} â€” {formData.location}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                className="w-full border border-red-300 rounded-lg p-2.5 text-sm"
                placeholder="Explain why this permit is being rejected and what must be corrected..." />
              {!rejectReason.trim() && <p className="text-xs text-red-500 mt-1">A rejection reason is required.</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Cancel</button>
              <button onClick={handleReject} disabled={isSaving || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Close-out Checklist Modal ---- */}
      {showCloseModal && (() => {
        const items = closeChecklistItems[formData.type] ?? closeChecklistItems[PermitType.COLD_WORK] ?? [];
        const allChecked = items.every((_: string, i: number) => closeChecklist[`item-${i}`]);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><CheckSquare size={20} className="text-slate-600" /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Close-Out Checklist</h2>
                  <p className="text-sm text-slate-500">{formData.type} — {formData.location}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">Confirm all close-out requirements are met before closing this permit:</p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${closeChecklist[`item-${i}`] ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                    <input type="checkbox" checked={!!closeChecklist[`item-${i}`]} onChange={(e) => setCloseChecklist(prev => ({ ...prev, [`item-${i}`]: e.target.checked }))}
                      className="w-4 h-4 accent-green-600" />
                    <span className={`text-sm ${closeChecklist[`item-${i}`] ? "text-green-800 font-medium" : "text-slate-700"}`}>{item}</span>
                  </label>
                ))}
              </div>
              {!allChecked && <p className="text-xs text-red-500">Complete all items above to enable close-out.</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCloseModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Cancel</button>
                <button onClick={handleConfirmClose} disabled={isSaving || !allChecked}
                  className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />} Confirm Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

