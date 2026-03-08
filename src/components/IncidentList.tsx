import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, Printer, Plus, Trash2, Download, CheckSquare, Square, X } from 'lucide-react';
import { getIncidents, deleteIncident } from '../services/storageService';
import { apiExportData, apiBulkDeleteIncidents, apiBulkUpdateIncidentStatus } from '../services/apiService';
import { exportIncidentsPDF } from '../services/pdfExportService';
import { Incident, IncidentSeverity, IncidentCategory } from '../types';
import { Pagination } from './Pagination';
import toast from 'react-hot-toast';

export const IncidentList: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            setIncidents(await getIncidents());
            setLoading(false);
        };
        load();
    }, []);

    const filteredAndSortedIncidents = useMemo(() => {
        let result = [...incidents];
        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            result = result.filter(i => i.description.toLowerCase().includes(low) || i.location.toLowerCase().includes(low));
        }
        if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
        if (severityFilter !== 'All') result = result.filter(i => i.severity === severityFilter);
        if (categoryFilter !== 'All') result = result.filter(i => i.category === categoryFilter);
        
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return result;
    }, [incidents, searchTerm, statusFilter, severityFilter, categoryFilter]);

    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredAndSortedIncidents.length / PAGE_SIZE);
    const paginatedIncidents = filteredAndSortedIncidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, severityFilter, categoryFilter]);

    const handleDelete = async (e: React.MouseEvent, id: string, desc: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Delete incident "${desc}"? This cannot be undone.`)) return;
        await deleteIncident(id);
        setIncidents(prev => prev.filter(i => i.id !== id));
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        toast.success('Incident deleted');
    };

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === paginatedIncidents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedIncidents.map(i => i.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} incident(s)? This cannot be undone.`)) return;
        try {
            await apiBulkDeleteIncidents(Array.from(selectedIds));
            setIncidents(prev => prev.filter(i => !selectedIds.has(i.id)));
            setSelectedIds(new Set());
            toast.success(`${selectedIds.size} incident(s) deleted`);
        } catch (err) {
            toast.error('Bulk delete failed');
        }
    };

    const handleBulkStatus = async (status: string) => {
        try {
            await apiBulkUpdateIncidentStatus(Array.from(selectedIds), status);
            setIncidents(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status: status as Incident['status'] } : i));
            setSelectedIds(new Set());
            toast.success(`${selectedIds.size} incident(s) updated to ${status}`);
        } catch (err) {
            toast.error('Bulk update failed');
        }
    };

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Incident Registry</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => apiExportData('incidents').then(() => toast.success('Export downloaded')).catch(() => toast.error('Export failed'))}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                    <button 
                        onClick={() => { exportIncidentsPDF(incidents, 'Main Site'); toast.success('PDF downloaded'); }}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Download size={18} /> Export PDF
                    </button>
                    <button onClick={() => window.print()} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                        <Printer size={18} /> Print
                    </button>
                    <Link to="/incidents/new" className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">+ Report New</Link>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden">
                <div className="p-4 border-b dark:border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <Search size={18} className="text-slate-400" />
                        <input type="text" placeholder="Search incidents..." className="bg-transparent border-none outline-none text-sm w-full dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select title="Filter by category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <option value="All">All Categories</option>
                            {Object.values(IncidentCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select title="Filter by severity" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <option value="All">All Severities</option>
                            {Object.values(IncidentSeverity).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select title="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <option value="All">All Statuses</option>
                            <option value="Open">Open</option><option value="Investigating">Investigating</option><option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>
                {selectedIds.size > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-slate-700 flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} selected</span>
                        <select 
                            value={bulkAction} 
                            onChange={e => { if (e.target.value) handleBulkStatus(e.target.value); setBulkAction(''); }}
                            className="text-xs border border-blue-200 rounded px-2 py-1 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                        >
                            <option value="">Change Status...</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                        <button onClick={handleBulkDelete} className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                            <Trash2 size={14} /> Delete
                        </button>
                        <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700 ml-auto flex items-center gap-1">
                            <X size={14} /> Clear selection
                        </button>
                    </div>
                )}
                <div className="divide-y dark:divide-slate-800">
                    {filteredAndSortedIncidents.length === 0 ? (
                        incidents.length === 0 ? (
                            <div className="p-8">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="mb-6 opacity-80">
                                        <AlertTriangle className="w-16 h-16 text-yellow-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Incidents Reported Yet</h3>
                                    <p className="text-gray-600 mb-8 max-w-md">
                                        Start building your safety record by reporting incidents, near misses, and observations. Our AI will help you identify patterns and suggest improvements.
                                    </p>
                                    <Link
                                        to="/incidents/new"
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Report First Incident
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-slate-500">No incidents match your current filters.</p>
                                <button 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('All');
                                        setSeverityFilter('All');
                                        setCategoryFilter('All');
                                    }}
                                    className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )
                    ) : (
                        paginatedIncidents.map(inc => (
                            <Link to={`/incidents/${inc.id}`} key={inc.id} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        <button
                                            onClick={(e) => toggleSelect(e, inc.id)}
                                            className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                                            aria-label={selectedIds.has(inc.id) ? 'Deselect incident' : 'Select incident'}
                                        >
                                            {selectedIds.has(inc.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{inc.description}</p>
                                            <p className="text-xs text-slate-500">{inc.category && <span className="font-medium text-slate-600 dark:text-slate-400">{inc.category} • </span>}{inc.location} • {new Date(inc.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(e, inc.id, inc.description)}
                                            className="p-1 text-slate-300 hover:text-red-600 transition-colors rounded"
                                            title="Delete incident"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {inc.severity}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredAndSortedIncidents.length}
                pageSize={PAGE_SIZE}
            />
        </div>
    );
};
