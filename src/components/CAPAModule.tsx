import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ActionItem, CAPAType, CAPASource, CAPAEffectiveness,
  Incident, Inspection, Observation, RiskAssessment,
} from '../types';
import {
  getActions, saveAction, updateAction, deleteAction,
  getIncidents, getInspections, getObservations, getRiskAssessments,
} from '../services/storageService';
import {
  Plus, Search, X, AlertTriangle, CheckCircle2, Clock,
  User, Calendar, LinkIcon, Pencil, Trash2, ShieldAlert,
  ShieldCheck, ChevronRight, BarChart3, BadgeCheck,
  ClipboardList, Eye, FileSearch,
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const isOverdue = (item: ActionItem) =>
  item.status !== 'Done' && item.status !== 'Verified' &&
  new Date(item.dueDate) < new Date(todayStr());

const priorityStyles: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-orange-100 text-orange-700 border border-orange-200',
  Low: 'bg-green-100 text-green-700 border border-green-200',
};

const statusStyles: Record<string, string> = {
  Open: 'bg-slate-100 text-slate-600 border border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border border-blue-200',
  Done: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Verified: 'bg-purple-100 text-purple-700 border border-purple-200',
};

const typeStyles: Record<CAPAType, string> = {
  Corrective: 'bg-red-50 text-red-600 border border-red-200',
  Preventive: 'bg-purple-50 text-purple-600 border border-purple-200',
};

const effectivenessStyles: Record<CAPAEffectiveness, string> = {
  Effective: 'bg-green-100 text-green-700 border border-green-200',
  'Partially Effective': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Ineffective: 'bg-red-100 text-red-700 border border-red-200',
};

const SOURCE_ICONS: Record<CAPASource, React.ReactNode> = {
  Incident: <AlertTriangle size={11} />,
  Inspection: <ClipboardList size={11} />,
  Observation: <Eye size={11} />,
  'Risk Assessment': <FileSearch size={11} />,
  Audit: <BadgeCheck size={11} />,
  Other: <ShieldAlert size={11} />,
};

const TypeIcon: React.FC<{ type: CAPAType; size?: number }> = ({ type, size = 13 }) =>
  type === 'Corrective' ? <ShieldAlert size={size} /> : <ShieldCheck size={size} />;

// Days remaining helper
const getDaysInfo = (item: ActionItem) => {
  if (item.status === 'Done' || item.status === 'Verified') return null;
  const diff = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'bg-red-100 text-red-700 border-red-200' };
  if (diff === 0) return { label: 'Due today', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (diff <= 3) return { label: `${diff}d left`, cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: `${diff}d left`, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
};

const COLUMNS: { key: ActionItem['status']; label: string; headerCls: string; countCls: string; emptyTxt: string }[] = [
  { key: 'Open',        label: 'Open',        headerCls: 'bg-blue-50 border-blue-200 text-blue-700',    countCls: 'bg-blue-600 text-white',    emptyTxt: 'No open actions' },
  { key: 'In Progress', label: 'In Progress', headerCls: 'bg-orange-50 border-orange-200 text-orange-700', countCls: 'bg-orange-500 text-white',  emptyTxt: 'Nothing in progress' },
  { key: 'Done',        label: 'Closed',      headerCls: 'bg-emerald-50 border-emerald-200 text-emerald-700', countCls: 'bg-emerald-600 text-white', emptyTxt: 'No closed actions' },
  { key: 'Verified',   label: 'Verified',    headerCls: 'bg-purple-50 border-purple-200 text-purple-700',  countCls: 'bg-purple-600 text-white',  emptyTxt: 'Nothing verified yet' },
];

// ── blank form ─────────────────────────────────────────────────────────────────

type FormState = {
  type: CAPAType;
  source: CAPASource;
  title: string;
  description: string;
  rootCause: string;
  assignee: string;
  priority: ActionItem['priority'];
  dueDate: string;
  relatedIncidentId: string;
  relatedInspectionId: string;
  relatedObservationId: string;
  relatedRiskAssessmentId: string;
};

const blankForm = (prefill?: Partial<FormState>): FormState => ({
  type: 'Corrective',
  source: 'Incident',
  title: '',
  description: '',
  rootCause: '',
  assignee: '',
  priority: 'Medium',
  dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  relatedIncidentId: '',
  relatedInspectionId: '',
  relatedObservationId: '',
  relatedRiskAssessmentId: '',
  ...prefill,
});

type VerifyState = {
  verifiedBy: string;
  effectivenessRating: CAPAEffectiveness;
  effectivenessNotes: string;
};

const blankVerify = (): VerifyState => ({
  verifiedBy: '',
  effectivenessRating: 'Effective',
  effectivenessNotes: '',
});

// ── main component ─────────────────────────────────────────────────────────────

export const CAPAModule: React.FC = () => {
  const location = useLocation();
  const prefill = (location.state as any)?.prefill as Partial<FormState> | undefined;

  const [items, setItems] = useState<ActionItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ActionItem | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

  const [verifyTarget, setVerifyTarget] = useState<ActionItem | null>(null);
  const [verifyForm, setVerifyForm] = useState<VerifyState>(blankVerify());

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  useEffect(() => {
    setItems(getActions());
    setIncidents(getIncidents());
    setInspections(getInspections());
    setObservations(getObservations());
    setRiskAssessments(getRiskAssessments());
    if (prefill) {
      setEditTarget(null);
      setForm(blankForm(prefill));
      setShowModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => ({
    total: items.length,
    open: items.filter(i => i.status === 'Open').length,
    inProgress: items.filter(i => i.status === 'In Progress').length,
    done: items.filter(i => i.status === 'Done').length,
    verified: items.filter(i => i.status === 'Verified').length,
    overdue: items.filter(isOverdue).length,
  }), [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.assignee.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q))
      );
    }
    if (statusFilter === 'Overdue') result = result.filter(isOverdue);
    else if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
    if (typeFilter !== 'All') result = result.filter(i => i.type === typeFilter);
    result.sort((a, b) => {
      const aOd = isOverdue(a) ? 0 : 1;
      const bOd = isOverdue(b) ? 0 : 1;
      if (aOd !== bOd) return aOd - bOd;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return result;
  }, [items, search, statusFilter, typeFilter]);

  const getSourceRef = (item: ActionItem): { label: string; to?: string } | null => {
    if (item.relatedIncidentId) {
      const inc = incidents.find(i => i.id === item.relatedIncidentId);
      return inc ? { label: `Incident #${inc.id.split('-')[1]}`, to: `/incidents/${inc.id}` } : null;
    }
    if (item.relatedInspectionId) {
      const ins = inspections.find(i => i.id === item.relatedInspectionId);
      return ins ? { label: `Inspection: ${ins.title}` } : null;
    }
    if (item.relatedObservationId) {
      const obs = observations.find(o => o.id === item.relatedObservationId);
      return obs ? { label: `Observation: ${obs.description.slice(0, 30)}` } : null;
    }
    if (item.relatedRiskAssessmentId) {
      const ra = riskAssessments.find(r => r.id === item.relatedRiskAssessmentId);
      return ra ? { label: `RA: ${ra.title}` } : null;
    }
    return null;
  };

  const openCreate = () => { setEditTarget(null); setForm(blankForm()); setShowModal(true); };

  const openEdit = (item: ActionItem) => {
    setEditTarget(item);
    setForm({
      type: item.type ?? 'Corrective',
      source: item.source ?? 'Incident',
      title: item.title,
      description: item.description ?? '',
      rootCause: item.rootCause ?? '',
      assignee: item.assignee,
      priority: item.priority,
      dueDate: item.dueDate,
      relatedIncidentId: item.relatedIncidentId ?? '',
      relatedInspectionId: item.relatedInspectionId ?? '',
      relatedObservationId: item.relatedObservationId ?? '',
      relatedRiskAssessmentId: item.relatedRiskAssessmentId ?? '',
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      type: form.type, source: form.source, title: form.title,
      description: form.description || undefined, rootCause: form.rootCause || undefined,
      assignee: form.assignee, priority: form.priority, dueDate: form.dueDate,
      relatedIncidentId: form.relatedIncidentId || undefined,
      relatedInspectionId: form.relatedInspectionId || undefined,
      relatedObservationId: form.relatedObservationId || undefined,
      relatedRiskAssessmentId: form.relatedRiskAssessmentId || undefined,
    };
    if (editTarget) {
      const updated: ActionItem = { ...editTarget, ...base };
      updateAction(updated);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } else {
      const newItem: ActionItem = { id: `capa-${Date.now()}`, status: 'Open', createdAt: new Date().toISOString(), ...base } as ActionItem;
      saveAction(newItem);
      setItems(prev => [newItem, ...prev]);
    }
    setShowModal(false);
  };

  const handleStatusChange = (item: ActionItem, next: ActionItem['status']) => {
    const updated: ActionItem = { ...item, status: next, closedAt: next === 'Done' ? (item.closedAt ?? new Date().toISOString()) : undefined };
    updateAction(updated);
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const openVerify = (item: ActionItem) => { setVerifyTarget(item); setVerifyForm(blankVerify()); };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyTarget) return;
    const updated: ActionItem = {
      ...verifyTarget, status: 'Verified',
      verifiedBy: verifyForm.verifiedBy, verifiedAt: new Date().toISOString(),
      effectivenessRating: verifyForm.effectivenessRating,
      effectivenessNotes: verifyForm.effectivenessNotes || undefined,
    };
    updateAction(updated);
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setVerifyTarget(null);
  };

  const handleDelete = (id: string) => { deleteAction(id); setItems(prev => prev.filter(i => i.id !== id)); setDeleteId(null); };

  // Board items — filtered by search + type only (status distributed across columns)
  const boardItems = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.assignee.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q)));
    }
    if (typeFilter !== 'All') result = result.filter(i => i.type === typeFilter);
    return result;
  }, [items, search, typeFilter]);

  const priorityBorderCls: Record<string, string> = { High: 'border-l-red-500', Medium: 'border-l-orange-400', Low: 'border-l-green-500' };

  const statusTabs = ['All', 'Open', 'In Progress', 'Done', 'Verified', 'Overdue'];

  const autoCount = items.filter(i => i.source !== 'Audit' && i.source !== 'Other' && i.createdAt && (Date.now() - new Date(i.createdAt).getTime()) < 60000).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            CAPA Management
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">ISO 45001</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Auto-created from Incidents, Observations &amp; Inspections · Clause 10.2</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setViewMode('board')} className={`px-3 py-1.5 text-xs font-bold transition-colors ${viewMode === 'board' ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>Board</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-slate-200 dark:border-slate-700 ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>List</button>
          </div>
          <button onClick={openCreate} className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-sm flex items-center gap-2">
            <Plus size={16} /> New CAPA
          </button>
        </div>
      </div>

      {/* Compact metric pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Total', value: metrics.total, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white' },
          { label: 'Open', value: metrics.open, cls: 'bg-blue-100 text-blue-700' },
          { label: 'In Progress', value: metrics.inProgress, cls: 'bg-orange-100 text-orange-700' },
          { label: 'Closed', value: metrics.done, cls: 'bg-emerald-100 text-emerald-700' },
          { label: 'Verified', value: metrics.verified, cls: 'bg-purple-100 text-purple-700' },
        ].map(p => (
          <span key={p.label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${p.cls}`}>
            <strong className="text-sm font-bold">{p.value}</strong> {p.label}
          </span>
        ))}
        {metrics.overdue > 0 && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
            <AlertTriangle size={11} /> {metrics.overdue} overdue — action needed
          </span>
        )}
      </div>

      {/* Auto-CAPA banner */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-600" />
        <span><strong>Auto-CAPA active:</strong> CAPAs are automatically created when a Critical/High incident is reported, an Unsafe Act/Near Miss observation is submitted, or an inspection scores below 70%.</span>
      </div>

      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, assignee, description…"
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
        </div>
        <div className="flex gap-1">
          {(['All','Corrective','Preventive'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
                typeFilter === t ? (t === 'Corrective' ? 'bg-red-600 text-white border-red-600' : t === 'Preventive' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-800 text-white border-slate-800') : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── BOARD VIEW ──────────────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colItems = boardItems.filter(i => i.status === col.key).sort((a, b) => {
              const aOd = isOverdue(a) ? 0 : 1; const bOd = isOverdue(b) ? 0 : 1;
              if (aOd !== bOd) return aOd - bOd;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });
            return (
              <div key={col.key} className="flex flex-col gap-3">
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${col.headerCls}`}>
                  <span className="font-bold text-sm">{col.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countCls}`}>{colItems.length}</span>
                </div>
                <div className="space-y-2.5 min-h-[100px]">
                  {colItems.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-xs text-slate-400">{col.emptyTxt}</div>
                  ) : colItems.map(item => {
                    const days = getDaysInfo(item);
                    const sourceRef = getSourceRef(item);
                    const overdue = isOverdue(item);
                    return (
                      <div key={item.id} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow border-l-4 ${priorityBorderCls[item.priority]} ${overdue ? 'ring-1 ring-red-400' : ''}`}>
                        <div className="p-3">
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeStyles[item.type ?? 'Corrective']}`}>
                              <TypeIcon type={item.type ?? 'Corrective'} size={10} /> {item.type}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${priorityStyles[item.priority]}`}>{item.priority}</span>
                            {item.source && item.source !== 'Other' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200">
                                {SOURCE_ICONS[item.source]} {item.source}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-white text-sm leading-snug line-clamp-2 mb-2">{item.title}</p>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span className="flex items-center gap-1 truncate"><User size={10} /> {item.assignee}</span>
                            {days && <span className={`flex-shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold ${days.cls}`}>{days.label}</span>}
                          </div>
                          {sourceRef && (
                            sourceRef.to
                              ? <Link to={sourceRef.to} className="flex items-center gap-1 text-[10px] text-brand-orange hover:underline truncate mt-1"><LinkIcon size={9} /> {sourceRef.label}</Link>
                              : <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate mt-1"><LinkIcon size={9} /> {sourceRef.label}</span>
                          )}
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                          <div className="flex gap-1">
                            {item.status === 'Open' && <button onClick={() => handleStatusChange(item, 'In Progress')} className="text-[11px] px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold hover:bg-blue-100">→ Start</button>}
                            {item.status === 'In Progress' && <button onClick={() => handleStatusChange(item, 'Done')} className="text-[11px] px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100">✓ Done</button>}
                            {item.status === 'Done' && <button onClick={() => openVerify(item)} className="text-[11px] px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-bold hover:bg-purple-100">✓ Verify</button>}
                            {(item.status === 'Done' || item.status === 'Verified') && <button onClick={() => handleStatusChange(item, 'Open')} className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 font-bold hover:bg-slate-100">↺</button>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(item)} className="p-1 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteId(item.id)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {statusTabs.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? s === 'Overdue' ? 'bg-red-600 text-white' : s === 'Verified' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                }`}>{s}</button>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldAlert className="mx-auto mb-3 text-slate-300" size={36} />
                <p className="font-semibold text-slate-500 text-sm">No CAPA items found</p>
                <p className="text-xs text-slate-400 mt-1">{items.length === 0 ? 'CAPAs are created automatically — or click New CAPA.' : 'Try adjusting filters.'}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(item => {
                  const overdue = isOverdue(item);
                  const sourceRef = getSourceRef(item);
                  const days = getDaysInfo(item);
                  return (
                    <div key={item.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex gap-3 ${overdue ? 'border-l-4 border-red-500' : ''}`}>
                      <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${item.priority === 'High' ? 'bg-red-500' : item.priority === 'Medium' ? 'bg-orange-400' : 'bg-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeStyles[item.type ?? 'Corrective']}`}><TypeIcon type={item.type ?? 'Corrective'} /> {item.type}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyles[item.status]}`}>{item.status}</span>
                          {overdue && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"><AlertTriangle size={9} /> Overdue</span>}
                          {item.effectivenessRating && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${effectivenessStyles[item.effectivenessRating]}`}><BadgeCheck size={9} /> {item.effectivenessRating}</span>}
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>}
                        {item.rootCause && <p className="text-xs text-slate-400 mt-0.5 italic line-clamp-1">Root cause: {item.rootCause}</p>}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><User size={10} /> {item.assignee}</span>
                          {days ? <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${days.cls}`}>{days.label}</span>
                            : <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(item.dueDate).toLocaleDateString()}</span>}
                          {item.source && <span className="flex items-center gap-1">{SOURCE_ICONS[item.source]} {item.source}</span>}
                          {item.verifiedBy && <span className="flex items-center gap-1 text-purple-600"><BadgeCheck size={10} /> {item.verifiedBy}</span>}
                          {sourceRef && (sourceRef.to
                            ? <Link to={sourceRef.to} className="flex items-center gap-1 text-brand-orange hover:underline bg-orange-50 px-1.5 py-0.5 rounded-full"><LinkIcon size={9} /> {sourceRef.label}</Link>
                            : <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-full"><LinkIcon size={9} /> {sourceRef.label}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status === 'Open' && <button onClick={() => handleStatusChange(item, 'In Progress')} className="text-xs px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold hover:bg-blue-100 whitespace-nowrap">→ Start</button>}
                        {item.status === 'In Progress' && <button onClick={() => handleStatusChange(item, 'Done')} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 whitespace-nowrap">✓ Done</button>}
                        {item.status === 'Done' && <button onClick={() => openVerify(item)} className="text-xs px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-bold hover:bg-purple-100 whitespace-nowrap">✓ Verify</button>}
                        {(item.status === 'Done' || item.status === 'Verified') && <button onClick={() => handleStatusChange(item, 'Open')} className="text-xs px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 font-bold hover:bg-slate-100">↺</button>}
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border dark:border-slate-700 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editTarget ? 'Edit CAPA' : 'New CAPA'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Corrective','Preventive'] as CAPAType[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${form.type === t ? (t === 'Corrective' ? 'border-red-500 bg-red-50 text-red-700' : 'border-purple-500 bg-purple-50 text-purple-700') : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}>
                      <TypeIcon type={t} size={15} /> {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Source / Origin</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as CAPASource, relatedIncidentId: '', relatedInspectionId: '', relatedObservationId: '', relatedRiskAssessmentId: '' }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange">
                  {(['Incident','Inspection','Observation','Risk Assessment','Audit','Other'] as CAPASource[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.source === 'Incident' && incidents.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Link to Incident</label>
                  <select value={form.relatedIncidentId} onChange={e => setForm(f => ({ ...f, relatedIncidentId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange">
                    <option value="">— None —</option>
                    {incidents.map(i => <option key={i.id} value={i.id}>#{i.id.split('-')[1]} — {i.description.slice(0,55)}</option>)}
                  </select>
                </div>
              )}
              {form.source === 'Inspection' && inspections.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Link to Inspection</label>
                  <select value={form.relatedInspectionId} onChange={e => setForm(f => ({ ...f, relatedInspectionId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange">
                    <option value="">— None —</option>
                    {inspections.map(i => <option key={i.id} value={i.id}>{i.title} — {i.date}</option>)}
                  </select>
                </div>
              )}
              {form.source === 'Observation' && observations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Link to Observation</label>
                  <select value={form.relatedObservationId} onChange={e => setForm(f => ({ ...f, relatedObservationId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange">
                    <option value="">— None —</option>
                    {observations.map(o => <option key={o.id} value={o.id}>{o.type} — {o.description.slice(0,50)}</option>)}
                  </select>
                </div>
              )}
              {form.source === 'Risk Assessment' && riskAssessments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Link to Risk Assessment</label>
                  <select value={form.relatedRiskAssessmentId} onChange={e => setForm(f => ({ ...f, relatedRiskAssessmentId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange">
                    <option value="">— None —</option>
                    {riskAssessments.map(r => <option key={r.id} value={r.id}>{r.title} ({r.type})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What action needs to be taken?"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the action required…"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Root Cause Analysis <span className="text-slate-400 font-normal normal-case">(Clause 10.2.1c — use 5-Whys)</span></label>
                <textarea rows={2} value={form.rootCause} onChange={e => setForm(f => ({ ...f, rootCause: e.target.value }))} placeholder="Why did this occur? (Why 1: … Why 2: … Why 3: …)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Assignee *</label>
                  <input required value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} placeholder="Responsible person"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ActionItem['priority'] }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange">
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Target Completion Date *</label>
                <input required type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-bold hover:bg-slate-800 shadow-md">{editTarget ? 'Save Changes' : 'Create CAPA'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifyTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><BadgeCheck size={20} className="text-purple-600" /> Verify Effectiveness</h3>
                <p className="text-xs text-slate-500 mt-0.5">ISO 45001 Clause 10.2.1f — independent reviewer required</p>
              </div>
              <button onClick={() => setVerifyTarget(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-4 mx-6 mt-4 bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700 text-sm">
              <p className="font-semibold text-slate-800 dark:text-white">{verifyTarget.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">Assigned to: {verifyTarget.assignee} · Due: {new Date(verifyTarget.dueDate).toLocaleDateString()}</p>
            </div>
            <form onSubmit={handleVerify} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Verified By *</label>
                <input required value={verifyForm.verifiedBy} onChange={e => setVerifyForm(f => ({ ...f, verifiedBy: e.target.value }))} placeholder="Name of independent reviewer"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Effectiveness Rating *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Effective','Partially Effective','Ineffective'] as CAPAEffectiveness[]).map(r => (
                    <button key={r} type="button" onClick={() => setVerifyForm(f => ({ ...f, effectivenessRating: r }))}
                      className={`py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all text-center ${verifyForm.effectivenessRating === r ? (r === 'Effective' ? 'border-green-500 bg-green-50 text-green-700' : r === 'Partially Effective' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Review Notes</label>
                <textarea rows={2} value={verifyForm.effectivenessNotes} onChange={e => setVerifyForm(f => ({ ...f, effectivenessNotes: e.target.value }))} placeholder="Evidence of effectiveness, follow-up required…"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              {verifyForm.effectivenessRating === 'Ineffective' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-400">
                  <strong>Follow-up required:</strong> Raise a new CAPA to address the recurring root cause.
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setVerifyTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 text-sm font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-md">Submit Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><Trash2 size={20} className="text-red-600" /></div>
              <div><p className="font-bold text-slate-800 dark:text-white">Delete CAPA?</p><p className="text-sm text-slate-500">This action cannot be undone.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 text-sm font-bold hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CAPAModule;
