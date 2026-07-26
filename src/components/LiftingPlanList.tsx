import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLiftingPlans, deleteLiftingPlan } from '../services/storageService';
import { LiftCategory, LiftingEquipmentType, LiftingPlanRecord, LiftingPlanStatus } from '../types';
import { Plus, Search, Filter, Calendar, MapPin, Truck, AlertTriangle, CheckCircle2, Download, Trash2, BarChart3 } from 'lucide-react';

const exportCSV = (plans: LiftingPlanRecord[]) => {
  const headers = ['Plan No','Title','Project','Location','Equipment','Category','Status','Load (t)','Utilization %','Author','Date'];
  const rows = plans.map(p => [
    p.planNumber ?? '',
    p.title,
    p.project ?? '',
    p.location,
    p.plan.equipmentType,
    p.plan.liftCategory ?? '',
    p.plan.status,
    p.plan.loadWeight ?? '',
    p.plan.calculation ? p.plan.calculation.utilizationPercent.toFixed(1) : '',
    p.author,
    new Date(p.date).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'lifting-plans.csv'; a.click();
  URL.revokeObjectURL(url);
};

export const LiftingPlanList: React.FC = () => {
  const [allPlans, setAllPlans] = useState<LiftingPlanRecord[]>(getLiftingPlans());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('All');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const plans = allPlans; // alias for backward compatibility

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        plan.title.toLowerCase().includes(search) ||
        plan.location.toLowerCase().includes(search) ||
        plan.planNumber?.toLowerCase().includes(search) ||
        plan.author.toLowerCase().includes(search) ||
        plan.plan.equipmentType.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'All' || plan.plan.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || plan.plan.liftCategory === categoryFilter;
      const matchesEquipment = equipmentFilter === 'All' || plan.plan.equipmentType === equipmentFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesEquipment;
    });
  }, [plans, searchTerm, statusFilter, categoryFilter, equipmentFilter]);

  const handleDelete = (id: string) => {
    deleteLiftingPlan(id);
    setAllPlans(prev => prev.filter(p => p.id !== id));
    setDeleteTarget(null);
  };

  const avgUtil = useMemo(() => {
    const withCalc = plans.filter(p => p.plan.calculation);
    if (!withCalc.length) return 0;
    return withCalc.reduce((s, p) => s + (p.plan.calculation?.utilizationPercent ?? 0), 0) / withCalc.length;
  }, [plans]);

  const metrics = {
    total: plans.length,
    approved: plans.filter(p => p.plan.status === LiftingPlanStatus.APPROVED).length,
    pending: plans.filter(p => p.plan.status === LiftingPlanStatus.PENDING_HSE).length,
    critical: plans.filter(p => p.plan.liftCategory === LiftCategory.CRITICAL).length,
    routine: plans.filter(p => p.plan.liftCategory === LiftCategory.ROUTINE).length,
  };

  const getStatusStyle = (status: LiftingPlanStatus) => {
    if (status === LiftingPlanStatus.APPROVED) return 'bg-green-100 text-green-700';
    if (status === LiftingPlanStatus.PENDING_HSE) return 'bg-yellow-100 text-yellow-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lifting Plans</h2>
          <p className="text-slate-500 text-sm">Plan, calculate and approve lifting operations.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAnalytics(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <BarChart3 size={15} /> Analytics
          </button>
          <button onClick={() => exportCSV(filteredPlans)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Download size={15} /> Export CSV
          </button>
          <Link to="/lifting-plans/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
            <Plus size={18} /> New Lifting Plan
          </Link>
        </div>
      </div>

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Analytics Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Plans',       value: metrics.total,    cls: 'text-slate-800' },
              { label: 'Approved',          value: metrics.approved, cls: 'text-green-600' },
              { label: 'Pending Approval',  value: metrics.pending,  cls: 'text-yellow-600' },
              { label: 'Critical Lifts',    value: metrics.critical, cls: 'text-red-600' },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs uppercase font-bold text-slate-500">{m.label}</p>
                <p className={`text-3xl font-bold mt-1 ${m.cls}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs uppercase font-bold text-slate-500 mb-3">Equipment Usage</p>
              <div className="space-y-2">
                {Object.values(LiftingEquipmentType).map(eq => {
                  const count = plans.filter(p => p.plan.equipmentType === eq).length;
                  if (!count) return null;
                  const pct = plans.length > 0 ? (count / plans.length) * 100 : 0;
                  return (
                    <div key={eq}>
                      <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                        <span>{eq}</span><span>{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs uppercase font-bold text-slate-500 mb-3">Key Metrics</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Avg. Utilization</span><span className={`font-bold ${avgUtil > 85 ? 'text-red-600' : avgUtil > 70 ? 'text-orange-600' : 'text-green-600'}`}>{avgUtil.toFixed(1)}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Routine Lifts</span><span className="font-bold text-blue-600">{metrics.routine}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Critical Lifts</span><span className="font-bold text-red-600">{metrics.critical}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Draft Plans</span><span className="font-bold text-slate-600">{metrics.total - metrics.approved - metrics.pending}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input type="text" placeholder="Search by plan number, title, location, author…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm flex-shrink-0"><Filter size={14} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5">
          <option value="All">All Status</option>
          <option value={LiftingPlanStatus.DRAFT}>Draft</option>
          <option value={LiftingPlanStatus.PENDING_HSE}>Pending HSE</option>
          <option value={LiftingPlanStatus.APPROVED}>Approved</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5">
          <option value="All">All Categories</option>
          <option value={LiftCategory.ROUTINE}>Routine</option>
          <option value={LiftCategory.CRITICAL}>Critical</option>
        </select>
        <select value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5">
          <option value="All">All Equipment</option>
          {Object.values(LiftingEquipmentType).map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlans.map(plan => (
          <Link to={`/lifting-plans/${plan.id}`} key={plan.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group">

            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Truck size={18} />
                </div>
                {plan.plan.liftCategory === LiftCategory.CRITICAL && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangle size={9} /> Critical
                  </span>
                )}
                {plan.plan.liftCategory === LiftCategory.ROUTINE && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    <CheckCircle2 size={9} /> Routine
                  </span>
                )}
              </div>
              <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${getStatusStyle(plan.plan.status)}`}>
                {plan.plan.status}
              </span>
            </div>

            {plan.planNumber && (
              <p className="text-xs font-mono text-slate-400 mb-1">{plan.planNumber}</p>
            )}
            <h3 className="text-base font-bold text-slate-800 mb-1 line-clamp-1">{plan.title}</h3>
            {plan.project && <p className="text-xs text-blue-600 mb-1 font-medium">{plan.project}</p>}
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{plan.description || 'No description provided'}</p>
            <p className="text-xs text-slate-500 mb-3">{plan.plan.equipmentType}</p>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1"><MapPin size={11} /> {plan.location || '—'}</p>
              <p className="flex items-center gap-1"><Calendar size={11} /> {new Date(plan.date).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}

        {filteredPlans.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            <Truck size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No lifting plans found.</p>
            <p className="text-xs mt-1">Try adjusting your filters or create a new plan.</p>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Delete Lifting Plan?</p>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
  }, [plans, searchTerm, statusFilter]);

  const getStatusStyle = (status: LiftingPlanStatus) => {
    if (status === LiftingPlanStatus.APPROVED) return 'bg-green-100 text-green-700';
    if (status === LiftingPlanStatus.PENDING_HSE) return 'bg-yellow-100 text-yellow-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lifting Plans</h2>
          <p className="text-slate-500">Create and approve lifting plans independently, then link them to permits.</p>
        </div>
        <Link to="/lifting-plans/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
          <Plus size={18} /> New Lifting Plan
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search lifting plans..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm"
          />
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Filter size={16} /> Status:
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5 md:w-56"
        >
          <option value="All">All Status</option>
          <option value={LiftingPlanStatus.DRAFT}>{LiftingPlanStatus.DRAFT}</option>
          <option value={LiftingPlanStatus.PENDING_HSE}>{LiftingPlanStatus.PENDING_HSE}</option>
          <option value={LiftingPlanStatus.APPROVED}>{LiftingPlanStatus.APPROVED}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => (
          <Link to={`/lifting-plans/${plan.id}`} key={plan.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                <Truck size={20} />
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${getStatusStyle(plan.plan.status)}`}>
                {plan.plan.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{plan.title}</h3>
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{plan.description || 'No description'}</p>
            <p className="text-xs text-slate-500 mb-3">Equipment: {plan.plan.equipmentType}</p>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <p className="flex items-center gap-1"><MapPin size={12} /> {plan.location}</p>
              <p className="flex items-center gap-1"><Calendar size={12} /> {new Date(plan.date).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}

        {filteredPlans.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            <Truck size={48} className="mx-auto mb-3 opacity-20" />
            <p>No lifting plans found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

