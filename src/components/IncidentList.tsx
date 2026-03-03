import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, Printer, Plus } from 'lucide-react';
import { getIncidents } from '../services/storageService';
import { Incident, IncidentSeverity, IncidentCategory } from '../types';

export const IncidentList: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [sortBy, setSortBy] = useState('DateDesc');

    useEffect(() => {
        const load = async () => {
            setIncidents(await getIncidents());
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
        
        result.sort((a, b) => sortBy === 'DateDesc' ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime());
        return result;
    }, [incidents, searchTerm, statusFilter, severityFilter, categoryFilter, sortBy]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Incident Registry</h2>
                <div className="flex gap-2">
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
                                        setTypeFilter('All');
                                        setDateFilter('All');
                                    }}
                                    className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )
                    ) : (
                        filteredAndSortedIncidents.map(inc => (
                            <Link to={`/incidents/${inc.id}`} key={inc.id} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{inc.description}</p>
                                        <p className="text-xs text-slate-500">{inc.category && <span className="font-medium text-slate-600 dark:text-slate-400">{inc.category} • </span>}{inc.location} • {new Date(inc.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {inc.severity}
                                    </span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
