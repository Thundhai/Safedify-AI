import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, MapPin, User, Calendar, Hash, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { getOrgContexts, saveOrgContext, deleteOrgContext, getOrgSettings } from '../services/storageService';
import { OrgContext, OrgContextStatus } from '../types';

const STATUS_STYLES: Record<OrgContextStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  Active:    { label: 'Active',    cls: 'bg-green-100 text-green-700 border-green-200',  icon: <CheckCircle2 size={11} /> },
  'On Hold': { label: 'On Hold',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <PauseCircle size={11} /> },
  Completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700 border-blue-200',    icon: <CheckCircle2 size={11} /> },
  Closed:    { label: 'Closed',    cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <XCircle size={11} /> },
};

const COLORS = ['#2563eb','#7c3aed','#dc2626','#f97316','#16a34a','#0891b2','#db2777','#854d0e'];

const blankCtx = (): Omit<OrgContext,'id'|'createdAt'> => ({
  name: '', code: '', description: '', location: '',
  status: 'Active', manager: '', client: '', startDate: '', endDate: '', color: '#2563eb',
});

export const OrgContextManagement: React.FC = () => {
  const orgSettings = getOrgSettings();
  const label = orgSettings.contextLabel || 'Location';

  const [contexts, setContexts] = useState<OrgContext[]>(getOrgContexts());
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgContext | null>(null);
  const [form, setForm] = useState(blankCtx());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = statusFilter === 'All' ? contexts : contexts.filter(c => c.status === statusFilter);

  const openCreate = () => { setEditTarget(null); setForm(blankCtx()); setShowModal(true); };
  const openEdit = (ctx: OrgContext) => {
    setEditTarget(ctx);
    setForm({ name: ctx.name, code: ctx.code, description: ctx.description ?? '', location: ctx.location ?? '', status: ctx.status, manager: ctx.manager ?? '', client: ctx.client ?? '', startDate: ctx.startDate ?? '', endDate: ctx.endDate ?? '', color: ctx.color ?? '#2563eb' });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget) {
      const updated = { ...editTarget, ...form };
      saveOrgContext(updated);
      setContexts(prev => prev.map(c => c.id === updated.id ? updated : c));
    } else {
      const newCtx: OrgContext = { id: `ctx-${Date.now()}`, createdAt: new Date().toISOString(), ...form };
      saveOrgContext(newCtx);
      setContexts(prev => [newCtx, ...prev]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteOrgContext(id);
    setContexts(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
  };

  const metrics = {
    total: contexts.length,
    active: contexts.filter(c => c.status === 'Active').length,
    hold: contexts.filter(c => c.status === 'On Hold').length,
    done: contexts.filter(c => c.status === 'Completed' || c.status === 'Closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{label} Management</h2>
          <p className="text-slate-500 text-sm">
            Manage {label.toLowerCase()}s. All modules can be filtered and linked to a specific {label.toLowerCase()}.
          </p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2 self-start">
          <Plus size={16} /> New {label}
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: `Total ${label}s`, value: metrics.total, cls: 'text-slate-800' },
          { label: 'Active',       value: metrics.active, cls: 'text-green-600' },
          { label: 'On Hold',      value: metrics.hold,   cls: 'text-yellow-600' },
          { label: 'Closed',       value: metrics.done,   cls: 'text-slate-400' },
        ].map(m => (
          <div key={m.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase font-bold text-slate-500">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.cls}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Active', 'On Hold', 'Completed', 'Closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(ctx => {
          const ss = STATUS_STYLES[ctx.status];
          return (
            <div key={ctx.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Colour bar */}
              <div className="h-1.5" style={{ background: ctx.color ?? '#2563eb' }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-mono text-slate-400 mb-0.5">{ctx.code}</p>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{ctx.name}</h3>
                  </div>
                  <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ss.cls}`}>
                    {ss.icon} {ss.label}
                  </span>
                </div>
                {ctx.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ctx.description}</p>}
                <div className="space-y-1 text-xs text-slate-400">
                  {ctx.location && <p className="flex items-center gap-1.5"><MapPin size={10} /> {ctx.location}</p>}
                  {ctx.manager && <p className="flex items-center gap-1.5"><User size={10} /> Manager: {ctx.manager}</p>}
                  {ctx.client && <p className="flex items-center gap-1.5"><Hash size={10} /> Client: {ctx.client}</p>}
                  {ctx.startDate && <p className="flex items-center gap-1.5"><Calendar size={10} /> {ctx.startDate}{ctx.endDate ? ` → ${ctx.endDate}` : ''}</p>}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button onClick={() => openEdit(ctx)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => setDeleteId(ctx.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
            <p className="font-medium">No {label.toLowerCase()}s found.</p>
            <p className="text-xs mt-1">Create your first {label.toLowerCase()} to get started.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">{editTarget ? `Edit ${label}` : `New ${label}`}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{label} Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={`e.g. Tower A Structural Works`}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Code / Reference *</label>
                  <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. PROJ-001"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OrgContextStatus }))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white">
                    {(['Active','On Hold','Completed','Closed'] as OrgContextStatus[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Location / Area</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Site address or area"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Manager</label>
                  <input value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))}
                    placeholder="Responsible manager"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Client / Owner</label>
                  <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">End / Target Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Badge Colour</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2">
                  <Save size={15} /> {editTarget ? 'Save Changes' : `Create ${label}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><Trash2 size={18} className="text-red-600" /></div>
              <div>
                <p className="font-bold text-slate-800">Delete {label}?</p>
                <p className="text-xs text-slate-500">Records linked to this {label.toLowerCase()} will remain but lose their link.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-bold">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
