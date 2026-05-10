
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPermits, deletePermit } from '../services/storageService';
import { Permit, PermitStatus } from '../types';
import { Plus, FileSignature, Clock, CheckCircle2, AlertTriangle, Calendar, MapPin, Ban, Trash2 } from 'lucide-react';
import { Pagination } from './Pagination';
import toast from 'react-hot-toast';

export const PermitList: React.FC = () => {
    const [permits, setPermits] = useState<Permit[]>([]);
    const [filter, setFilter] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setPermits(await getPermits());
            setLoading(false);
        };
        load();
    }, []);

    const getStatusColor = (status: PermitStatus) => {
        switch (status) {
            case PermitStatus.APPROVED: return 'bg-green-100 text-green-700 border-green-200';
            case PermitStatus.PENDING: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case PermitStatus.EXPIRED: return 'bg-red-100 text-red-700 border-red-200';
            case PermitStatus.CLOSED: return 'bg-slate-100 text-slate-600 border-slate-200';
            case PermitStatus.REJECTED: return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    const getStatusIcon = (status: PermitStatus) => {
        switch (status) {
            case PermitStatus.APPROVED: return <CheckCircle2 size={16} />;
            case PermitStatus.PENDING: return <Clock size={16} />;
            case PermitStatus.EXPIRED: return <AlertTriangle size={16} />;
            case PermitStatus.CLOSED: return <Ban size={16} />;
            default: return <FileSignature size={16} />;
        }
    };

    const filteredPermits = permits.filter(p => filter === 'All' || p.status === filter);

    const handleDelete = async (e: React.MouseEvent, id: string, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Delete permit "${type}" (${id})? This cannot be undone.`)) return;
        await deletePermit(id);
        setPermits(prev => prev.filter(p => p.id !== id));
        toast.success('Permit deleted');
    };

    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredPermits.length / PAGE_SIZE);
    const paginatedPermits = filteredPermits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Permit to Work (PTW)</h2>
                    <p className="text-slate-500">Manage work authorizations and high-risk activities.</p>
                </div>
                <Link to="/permits/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                    <Plus size={18} /> New Permit
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Active Permits</p>
                    <h3 className="text-2xl font-bold text-green-600">{permits.filter(p => p.status === PermitStatus.APPROVED).length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Pending Approval</p>
                    <h3 className="text-2xl font-bold text-yellow-600">{permits.filter(p => p.status === PermitStatus.PENDING).length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Expiring Soon</p>
                    <h3 className="text-2xl font-bold text-orange-600">
                        {(() => { const now = new Date(); const in7Days = new Date(); in7Days.setDate(now.getDate() + 7); return permits.filter(p => p.status === PermitStatus.APPROVED && new Date(p.validUntil) > now && new Date(p.validUntil) <= in7Days).length; })()}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Total History</p>
                    <h3 className="text-2xl font-bold text-slate-800">{permits.length}</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', PermitStatus.APPROVED, PermitStatus.PENDING, PermitStatus.CLOSED, PermitStatus.REJECTED, PermitStatus.EXPIRED].map(s => (
                    <button 
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            filter === s ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {s === PermitStatus.APPROVED ? 'Active' : s}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedPermits.map(permit => (
                    <Link to={`/permits/${permit.id}`} key={permit.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group relative">
                        <button
                            onClick={(e) => handleDelete(e, permit.id, permit.type)}
                            className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 z-10"
                            title="Delete permit"
                        >
                            <Trash2 size={14} />
                        </button>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {permit.type}
                                </h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">Ref: {permit.id}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase flex items-center gap-1.5 border ${getStatusColor(permit.status)}`}>
                                {getStatusIcon(permit.status)}
                                {permit.status}
                            </span>
                        </div>

                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{permit.description}</p>

                        <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-500 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-slate-400" />
                                {permit.location}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                {new Date(permit.validFrom).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 col-span-2">
                                <Clock size={14} className="text-slate-400" />
                                Valid: {new Date(permit.validFrom).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(permit.validUntil).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredPermits.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        <FileSignature size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No permits found matching this filter.</p>
                     </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredPermits.length}
                pageSize={PAGE_SIZE}
            />
        </div>
    );
};
