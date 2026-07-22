import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLiftingPlans } from '../services/storageService';
import { LiftingPlanRecord, LiftingPlanStatus } from '../types';
import { Plus, Search, Filter, Calendar, MapPin, Truck } from 'lucide-react';

export const LiftingPlanList: React.FC = () => {
  const [plans] = useState<LiftingPlanRecord[]>(getLiftingPlans());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = plan.title.toLowerCase().includes(search) || plan.location.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'All' || plan.plan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
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

