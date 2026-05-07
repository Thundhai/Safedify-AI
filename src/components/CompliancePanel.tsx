/**
 * CompliancePanel — shows compliance gaps from the AI scan with one-click fixes.
 *
 * Design principles (as discussed):
 *  - ai_fixable gaps: AI proposes a control text → user reviews → clicks Apply
 *  - action_required gaps: physical work needed → user clicks "Create Action Item"
 *  - "Apply All" button with confirmation step before committing
 *  - Every applied fix is shown as struck-through so the audit trail is visible
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Wrench, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Loader2, ClipboardList, Zap, ExternalLink,
} from 'lucide-react';
import { ComplianceGap } from '../types';

interface CompliancePanelProps {
  gaps: ComplianceGap[];
  loading: boolean;
  onRunScan: () => void;
  onApplyFix: (gapId: string) => void;
  onApplyAll: () => void;
  onCreateActionItem: (gap: ComplianceGap) => Promise<void>;
  disabled?: boolean; // true when permit is read-only
}

export const CompliancePanel: React.FC<CompliancePanelProps> = ({
  gaps,
  loading,
  onRunScan,
  onApplyFix,
  onApplyAll,
  onCreateActionItem,
  disabled = false,
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creatingAction, setCreatingAction] = useState<Record<string, boolean>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);

  const fixableGaps = gaps.filter(g => g.resolution === 'ai_fixable' && !g.applied);
  const actionGaps  = gaps.filter(g => g.resolution === 'action_required' && !g.applied);
  const resolvedCount = gaps.filter(g => g.applied).length;

  const toggleExpand = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCreateAction = async (gap: ComplianceGap) => {
    setCreatingAction(prev => ({ ...prev, [gap.id]: true }));
    setActionErrors(prev => ({ ...prev, [gap.id]: '' }));
    try {
      await onCreateActionItem(gap);
      toast.success(
        (t) => (
          <span className="flex items-center gap-2">
            Action Item created!
            <button
              onClick={() => { toast.dismiss(t.id); navigate('/actions'); }}
              className="underline font-semibold text-blue-600 hover:text-blue-800"
            >
              View in Actions →
            </button>
          </span>
        ),
        { duration: 6000 }
      );
    } catch (e: any) {
      const msg = e?.message || 'Failed to create Action Item. Please try again.';
      setActionErrors(prev => ({ ...prev, [gap.id]: msg }));
    } finally {
      setCreatingAction(prev => ({ ...prev, [gap.id]: false }));
    }
  };

  const handleApplyAll = () => {
    if (!showApplyAllConfirm) {
      setShowApplyAllConfirm(true);
      return;
    }
    setShowApplyAllConfirm(false);
    onApplyAll();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600" />
          <span className="font-bold text-slate-800 text-sm">AI Compliance Scan</span>
          {gaps.length > 0 && (
            <span className="ml-1 text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
            </span>
          )}
          {resolvedCount > 0 && (
            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {resolvedCount} resolved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {fixableGaps.length > 0 && !disabled && (
            <button
              onClick={handleApplyAll}
              className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                showApplyAllConfirm
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Zap size={12} />
              {showApplyAllConfirm ? `Confirm Apply ${fixableGaps.length} fixes` : `Apply All AI Fixes (${fixableGaps.length})`}
            </button>
          )}
          <button
            onClick={onRunScan}
            disabled={loading || disabled}
            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-purple-100 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? 'Scanning…' : gaps.length > 0 ? 'Re-scan' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
          <Loader2 size={20} className="animate-spin text-purple-600" />
          <span className="text-sm">Analysing permit against HSE standards…</span>
        </div>
      )}

      {!loading && gaps.length === 0 && (
        <div className="py-8 text-center text-slate-500 text-sm">
          {resolvedCount > 0
            ? <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-green-500" />
                <p className="font-medium text-green-700">All gaps resolved — permit is compliant.</p>
              </div>
            : <p className="text-slate-400 italic">Run a scan to check this permit for compliance gaps.</p>
          }
        </div>
      )}

      {!loading && gaps.length > 0 && (
        <div className="divide-y divide-slate-100">

          {/* AI-Fixable section */}
          {gaps.filter(g => g.resolution === 'ai_fixable').length > 0 && (
            <div>
              <div className="px-5 py-2 bg-blue-50">
                <span className="text-xs font-bold uppercase text-blue-700 tracking-wide">
                  AI-Fixable Gaps — can be resolved by adding a control
                </span>
              </div>
              {gaps.filter(g => g.resolution === 'ai_fixable').map(gap => (
                <div
                  key={gap.id}
                  className={`px-5 py-4 transition-colors ${gap.applied ? 'bg-green-50 opacity-70' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Wrench size={15} className={`mt-0.5 shrink-0 ${gap.applied ? 'text-green-500' : 'text-blue-500'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${gap.applied ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {gap.description}
                        </p>
                        {gap.applied && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">✓ Control added to checklist</p>
                        )}
                        {!gap.applied && gap.aiSuggestion && (
                          <button
                            onClick={() => toggleExpand(gap.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 transition-colors"
                          >
                            {expanded[gap.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expanded[gap.id] ? 'Hide' : 'Preview'} AI suggestion
                          </button>
                        )}
                        {expanded[gap.id] && gap.aiSuggestion && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900 leading-relaxed">
                            <span className="font-semibold block mb-1">Proposed control to add:</span>
                            {gap.aiSuggestion}
                          </div>
                        )}
                      </div>
                    </div>
                    {!gap.applied && !disabled && (
                      <button
                        onClick={() => onApplyFix(gap.id)}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                    {gap.applied && (
                      <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action-Required section */}
          {gaps.filter(g => g.resolution === 'action_required').length > 0 && (
            <div>
              <div className="px-5 py-2 bg-amber-50">
                <span className="text-xs font-bold uppercase text-amber-700 tracking-wide">
                  Physical Action Required — must be done on-site
                </span>
              </div>
              {gaps.filter(g => g.resolution === 'action_required').map(gap => (
                <div
                  key={gap.id}
                  className={`px-5 py-4 transition-colors ${gap.applied ? 'bg-green-50 opacity-70' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${gap.applied ? 'text-green-500' : 'text-amber-500'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${gap.applied ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {gap.description}
                        </p>
                        {gap.applied && gap.actionItemId && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-green-600 font-medium">✓ Action Item created</p>
                            <button
                              onClick={() => navigate('/actions')}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                              <ExternalLink size={11} />
                              View in Actions
                            </button>
                          </div>
                        )}
                        {!gap.applied && gap.actionItemTitle && (
                          <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                            Action required: <span className="font-medium">{gap.actionItemTitle}</span>
                          </p>
                        )}
                        {!gap.applied && (
                          <p className="text-xs text-slate-500 mt-1">
                            This permit will remain blocked until this action is completed.
                          </p>
                        )}
                        {actionErrors[gap.id] && (
                          <p className="text-xs text-red-600 font-medium mt-2 bg-red-50 border border-red-200 rounded px-2 py-1">
                            ✗ {actionErrors[gap.id]}
                          </p>
                        )}
                      </div>
                    </div>
                    {!gap.applied && !disabled && (
                      <button
                        onClick={() => handleCreateAction(gap)}
                        disabled={!!creatingAction[gap.id]}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
                      >
                        {creatingAction[gap.id]
                          ? <Loader2 size={12} className="animate-spin" />
                          : <ClipboardList size={12} />
                        }
                        Create Action
                      </button>
                    )}
                    {gap.applied && (
                      <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved gaps summary */}
          {resolvedCount > 0 && resolvedCount < gaps.length && (
            <div className="px-5 py-3 bg-green-50 text-xs text-green-700 font-medium">
              {resolvedCount} of {gaps.length} gaps resolved. Address remaining gaps before submitting.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
