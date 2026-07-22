
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRiskAssessments } from '../services/storageService';
import { RiskAssessment } from '../types';
import { ShieldAlert, Plus, Calendar, FileText, Search, Filter, Printer } from 'lucide-react';


export const RiskAssessmentList: React.FC = () => {
    const navigate = useNavigate();
    const [assessments] = useState<RiskAssessment[]>(getRiskAssessments());
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    const filtered = assessments.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              a.taskDescription.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'All' || a.type === typeFilter;
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Risk Assessments</h2>
                    <p className="text-slate-500">Manage JHA, HIRA, and Task Risk Assessments.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => window.print()}
                        className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2"
                    >
                        <Printer size={18} /> Print List
                    </button>
                    <Link to="/risk-assessments/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                        <Plus size={18} /> New Assessment
                    </Link>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Risk Assessment Register</h1>
                        <p className="text-slate-500">Master List</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">Generated: {new Date().toLocaleDateString()}</p>
                        <p className="text-sm text-slate-500">Records: {filtered.length}</p>
                    </div>
                </div>
            </div>

            {/* Search and Filters - Hidden on Print */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 print:hidden">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Search assessments..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                </div>
                
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <Filter size={16} /> Filters:
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 flex-1 md:w-32"
                    >
                        <option value="All">All Types</option>
                        <option value="JHA">JHA</option>
                        <option value="HIRA">HIRA</option>
                        <option value="TRA">TRA</option>
                    </select>

                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 flex-1 md:w-32"
                    >
                        <option value="All">All Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Approved">Approved</option>
                        <option value="Archived">Archived</option>
                    </select>
                </div>
            </div>

            {/* Results Grid - Screen View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
                {filtered.map(item => (
                    <Link to={`/risk-assessments/${item.id}`} key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                <ShieldAlert size={20} />
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                                item.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                item.status === 'Archived' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-50 text-yellow-700'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{item.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">{item.taskDescription}</p>
                        
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-semibold text-slate-500">
                                <FileText size={12} /> {item.type}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={12} /> {new Date(item.date).toLocaleDateString()}
                            </span>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); navigate('/actions', { state: { prefill: { source: 'Risk Assessment', type: 'Corrective', relatedRiskAssessmentId: item.id, title: `CAPA: High risk in ${item.title}` } } }); }}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <ShieldAlert size={12} /> Raise CAPA
                        </button>
                    </Link>
                ))}

                {filtered.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        <ShieldAlert size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No risk assessments found matching your filters.</p>
                        {(typeFilter !== 'All' || statusFilter !== 'All' || searchTerm) && (
                            <button 
                                onClick={() => { setTypeFilter('All'); setStatusFilter('All'); setSearchTerm(''); }}
                                className="text-blue-600 font-medium mt-2 hover:underline"
                            >
                                Clear Filters
                            </button>
                        )}
                     </div>
                )}
            </div>

            {/* Print Table - Visible Only in Print */}
            <div className="hidden print:block">
                <table className="w-full text-sm text-left border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 border border-slate-300">Ref ID</th>
                            <th className="px-4 py-3 border border-slate-300">Date</th>
                            <th className="px-4 py-3 border border-slate-300">Type</th>
                            <th className="px-4 py-3 border border-slate-300 w-1/3">Title & Description</th>
                            <th className="px-4 py-3 border border-slate-300">Hazards ID'd</th>
                            <th className="px-4 py-3 border border-slate-300">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(item => (
                            <tr key={item.id} className="border-b border-slate-300">
                                <td className="px-4 py-2 border border-slate-300 font-mono text-xs">{item.id}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs">{new Date(item.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 border border-slate-300 font-bold text-xs">{item.type}</td>
                                <td className="px-4 py-2 border border-slate-300">
                                    <div className="font-bold text-sm">{item.title}</div>
                                    <div className="text-xs text-slate-500 italic mt-1">{item.taskDescription.substring(0, 100)}...</div>
                                </td>
                                <td className="px-4 py-2 border border-slate-300 text-center">{item.hazards.length}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs font-bold uppercase">{item.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
