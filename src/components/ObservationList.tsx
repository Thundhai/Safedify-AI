
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, CheckCircle, Sparkles, Loader2, Camera, Trash2, Edit2, X, Save, MapPin, Tag, FileText, Printer, Filter, ShieldAlert } from '../utils/icons';
import { getObservations, deleteObservation, updateObservation } from '../services/storageService';
import { analyzeObservationTrendsAI } from '../services/geminiService';
import { addToSyncQueue } from '../services/offlineService';
import { Observation, ObservationType } from '../types';
import { ShareMenu } from './ShareMenu';
import { ContextFilterBar, ContextBadge } from './ContextSelector';

export const ObservationList: React.FC = () => {
    const navigate = useNavigate();
    const [observations, setObservations] = useState<Observation[]>([]);
    const [trends, setTrends] = useState<any[]>([]);
    const [loadingTrends, setLoadingTrends] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [contextFilter, setContextFilter] = useState<string|undefined>();

    // Modal State
    const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Observation>>({});

    useEffect(() => {
        setObservations(getObservations());
    }, []);

    const handleAnalyzeTrends = async () => {
        if (observations.length === 0) return;
        setLoadingTrends(true);
        try {
            const result = await analyzeObservationTrendsAI(observations);
            if (result && result.trends) {
                setTrends(result.trends);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTrends(false);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to permanently delete this observation?')) {
            deleteObservation(id);
            addToSyncQueue('DELETE_OBSERVATION', `Deleted Obs: ${id}`);
            setObservations(prev => prev.filter(o => o.id !== id));
        }
    };

    const openViewModal = (obs: Observation) => {
        setSelectedObs(obs);
        setIsEditMode(false);
    };

    const openEditModal = (obs: Observation, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedObs(obs);
        setEditForm({ ...obs });
        setIsEditMode(true);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedObs) return;
        
        const updatedObs = { ...selectedObs, ...editForm } as Observation;
        updateObservation(updatedObs);
        addToSyncQueue('UPDATE_OBSERVATION', `Updated Obs: ${updatedObs.id}`);
        
        setObservations(prev => prev.map(o => o.id === updatedObs.id ? updatedObs : o));
        setSelectedObs(null);
        setIsEditMode(false);
    };

    // Derived filtered list
    const filteredObservations = observations.filter(obs => {
        const matchType = filterType === 'All' || obs.type === filterType;
        const matchCategory = filterCategory === 'All' || obs.category === filterCategory;
        const matchStatus = filterStatus === 'All' || obs.status === filterStatus;
        const matchContext = !contextFilter || obs.contextId === contextFilter;
        return matchType && matchCategory && matchStatus && matchContext;
    });

    const stats = {
        total: observations.length,
        unsafeActs: observations.filter(o => o.type === 'Unsafe Act').length,
        conditions: observations.filter(o => o.type === 'Unsafe Condition').length,
        safe: observations.filter(o => o.type === 'Safe Behavior').length,
        open: observations.filter(o => o.status === 'Open').length
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'Unsafe Act': return 'bg-red-50 text-red-700 border-red-100';
            case 'Unsafe Condition': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Safe Behavior': return 'bg-green-50 text-green-700 border-green-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const categories = [
        'PPE', 'Housekeeping', 'Tools & Equipment', 'Working at Height', 
        'Lifting / Manual Handling', 'Electrical', 'Chemicals', 'Traffic / Vehicles'
    ];

    return (
        <div className="space-y-6">
            {/* Screen Header - Hidden on Print */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Observation Cards (STOP/BBS)</h2>
                    <p className="text-slate-500">Track unsafe acts, conditions, and safe behaviors.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                          const now = new Date();
                          const typeColor = (t: string) => t==='Unsafe Act'?'#dc2626':t==='Unsafe Condition'?'#f97316':t==='Near Miss'?'#7c3aed':'#16a34a';
                          const rows = filteredObservations.map((o,i) => `<tr style="break-inside:avoid;"><td style="text-align:center;color:#64748b;font-size:11px;padding:8px 6px;border:1px solid #e2e8f0;">${i+1}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;">${new Date(o.date).toLocaleDateString('en-GB')}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;text-align:center;"><span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;color:${typeColor(o.type)};border:1.5px solid ${typeColor(o.type)};white-space:nowrap;">${o.type}</span></td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;">${o.category}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;">${o.location}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;line-height:1.5;color:#1e293b;">${o.description}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${o.isAnonymous?'Anonymous':(o.observer||'—')}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;font-style:italic;color:#475569;">${o.immediateActionTaken||'—'}</td><td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;"><span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:${o.status==='Closed'?'#f0fdf4':'#eff6ff'};color:${o.status==='Closed'?'#16a34a':'#2563eb'};border:1.5px solid ${o.status==='Closed'?'#16a34a':'#2563eb'};">${o.status}</span></td></tr>`).join('');
                          const stats = {total:filteredObservations.length,unsafe:filteredObservations.filter(o=>o.type==='Unsafe Act').length,cond:filteredObservations.filter(o=>o.type==='Unsafe Condition').length,near:filteredObservations.filter(o=>o.type==='Near Miss').length,safe:filteredObservations.filter(o=>o.type==='Safe Behavior').length};
                          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Safety Observation Log</title><style>@page{size:A4 landscape;margin:15mm 12mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1e293b;}.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:4px;background:#fff;}</style></head><body>
                          <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;border-bottom:3px solid #0f172a;margin-bottom:16px;"><div><div style="font-size:20px;font-weight:800;color:#0f172a;">Safedify</div><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">HSE Management Platform</div></div><div style="text-align:right;"><div style="font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Safety Observation Log</div><div style="font-size:10px;color:#64748b;">Observation / STOP Card Register &nbsp;|&nbsp; Generated: ${now.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div></div></div>
                          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;">${[['Total',stats.total,'#1e293b'],['Unsafe Acts',stats.unsafe,'#dc2626'],['Unsafe Conditions',stats.cond,'#f97316'],['Near Misses',stats.near,'#7c3aed'],['Safe Behaviors',stats.safe,'#16a34a']].map(([l,v,c])=>`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;"><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">${l}</div><div style="font-size:22px;font-weight:800;color:${c};">${v}</div></div>`).join('')}</div>
                          <div style="font-size:12px;font-weight:700;padding:7px 12px;background:#0f172a;color:#fff;border-radius:4px 4px 0 0;text-transform:uppercase;letter-spacing:0.5px;">Observation Records</div>
                          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
                          <thead><tr style="background:#1e3a5f;"><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;text-align:center;width:3%;">#</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:7%;">Date</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:10%;text-align:center;">Type</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:8%;">Category</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:8%;">Location</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;">Description</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:9%;">Observer</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:14%;">Immediate Action</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:7%;text-align:center;">Status</th></tr></thead>
                          <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">No observations found.</td></tr>'}</tbody></table>
                          <div class="footer">Safedify HSE Platform &nbsp;|&nbsp; Safety Observation Log &nbsp;|&nbsp; ${now.toLocaleString()} &nbsp;|&nbsp; CONFIDENTIAL — For authorised personnel only</div>
                          </body></html>`;
                          const win=window.open('','_blank','width=1100,height=700');if(!win){alert('Allow popups.');return;}win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),600);
                        }}
                        className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2"
                    >
                        <Printer size={18} /> Print / PDF
                    </button>
                    <Link to="/smart-camera" className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 shadow-sm flex items-center justify-center gap-2">
                        <Camera size={18} /> AI Photo Scan
                    </Link>
                    <Link to="/observations/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                        <Plus size={18} /> Add Manual
                    </Link>
                </div>
            </div>

            {/* Print Header - Visible only on Print */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Safety Observation Log</h1>
                        <p className="text-slate-500">Comprehensive Report</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">Generated: {new Date().toLocaleDateString()}</p>
                        <p className="text-sm text-slate-500">Filtered Records: {filteredObservations.length}</p>
                    </div>
                </div>
            </div>

            {/* Stats Row - Hidden on Print */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Total Cards</p>
                    <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                    <p className="text-red-500 text-xs uppercase font-bold">Unsafe Acts</p>
                    <h3 className="text-2xl font-bold text-red-700">{stats.unsafeActs}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                    <p className="text-orange-500 text-xs uppercase font-bold">Conditions</p>
                    <h3 className="text-2xl font-bold text-orange-700">{stats.conditions}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                    <p className="text-green-500 text-xs uppercase font-bold">Safe Behaviors</p>
                    <h3 className="text-2xl font-bold text-green-700">{stats.safe}</h3>
                </div>
            </div>

            {/* Context Filter */}
            <ContextFilterBar value={contextFilter} onChange={setContextFilter} />

            {/* AI Trend Analysis - Hidden on Print */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-md relative overflow-hidden print:hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-yellow-400">
                                <Sparkles size={18} /> AI Trend Detection
                            </h3>
                            <p className="text-slate-300 text-sm">Group observations to find recurring hazards.</p>
                        </div>
                        {trends.length === 0 && (
                            <button 
                                onClick={handleAnalyzeTrends} 
                                disabled={loadingTrends || observations.length === 0}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors border border-white/20 disabled:opacity-50"
                            >
                                {loadingTrends ? <Loader2 className="animate-spin" size={16} /> : 'Run Analysis'}
                            </button>
                        )}
                    </div>

                    {trends.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {trends.map((trend, i) => (
                                <div key={i} className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                                    <h4 className="font-bold text-white mb-1">{trend.theme}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-white">{trend.count} reports</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">💡 {trend.insight}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loadingTrends && <p className="text-sm text-slate-400 italic">No trends analyzed yet. Click the button to start.</p>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center print:hidden">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Filter size={16} /> Filters:
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="All">All Types</option>
                    <option value="Unsafe Act">Unsafe Act</option>
                    <option value="Unsafe Condition">Unsafe Condition</option>
                    <option value="Safe Behavior">Safe Behavior</option>
                    <option value="Near Miss">Near Miss</option>
                </select>

                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="All">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                </select>

                {(filterType !== 'All' || filterCategory !== 'All' || filterStatus !== 'All') && (
                    <button
                        onClick={() => { setFilterType('All'); setFilterCategory('All'); setFilterStatus('All'); }}
                        className="text-sm text-blue-600 hover:underline ml-auto font-medium"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Screen List - Hidden on Print */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">Recent Observations</h3>
                    <span className="text-xs text-slate-500">Showing {filteredObservations.length} of {observations.length}</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {filteredObservations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No observations found matching filters.</div>
                    ) : (
                        filteredObservations.map(obs => (
                            <div key={obs.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase border ${getTypeColor(obs.type)}`}>
                                            {obs.type}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                            {obs.category}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(obs.date).toLocaleDateString()} • {obs.location}</span>
                                </div>
                                <p className="text-slate-800 font-medium mb-1">{obs.description}</p>
                                {obs.immediateActionTaken && (
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        <CheckCircle size={12} className="text-green-600" /> Action: {obs.immediateActionTaken}
                                    </p>
                                )}
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                     <div className="flex items-center gap-3">
                                         <span className="text-xs text-slate-400">
                                             Reported by: {obs.isAnonymous ? 'Anonymous' : obs.observer}
                                         </span>
                                         <span className={`text-xs font-medium px-2 py-0.5 rounded ${obs.status === 'Open' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                             {obs.status}
                                         </span>
                                     </div>
                                     
                                     {/* Action Buttons */}
                                     <div className="flex gap-2">
                                         <button 
                                            onClick={() => openViewModal(obs)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="View Details"
                                         >
                                             <Eye size={16} />
                                         </button>
                                         <button 
                                            onClick={(e) => openEditModal(obs, e)}
                                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                            title="Edit Observation"
                                         >
                                             <Edit2 size={16} />
                                         </button>
                                         <button 
                                            onClick={(e) => handleDelete(obs.id, e)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete"
                                         >
                                             <Trash2 size={16} />
                                         </button>
                                         {(obs.type === 'Unsafe Act' || obs.type === 'Unsafe Condition' || obs.type === 'Near Miss') && (
                                           <button
                                             onClick={() => navigate('/actions', { state: { prefill: { source: 'Observation', type: 'Corrective', relatedObservationId: obs.id, title: `CAPA: ${obs.type} — ${obs.description.slice(0, 60)}` } } })}
                                             className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg transition-colors whitespace-nowrap"
                                             title="Raise a Corrective Action"
                                           >
                                             <ShieldAlert size={12} /> Raise CAPA
                                           </button>
                                         )}
                                     </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Print Table - Visible only on Print */}
            <div className="hidden print:block">
                <table className="w-full text-sm text-left border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 border border-slate-300">Date</th>
                            <th className="px-4 py-3 border border-slate-300">Type</th>
                            <th className="px-4 py-3 border border-slate-300">Category</th>
                            <th className="px-4 py-3 border border-slate-300">Location</th>
                            <th className="px-4 py-3 border border-slate-300 w-1/3">Description</th>
                            <th className="px-4 py-3 border border-slate-300 w-1/4">Action Taken</th>
                            <th className="px-4 py-3 border border-slate-300">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredObservations.map(obs => (
                            <tr key={obs.id} className="border-b border-slate-300">
                                <td className="px-4 py-2 border border-slate-300 text-xs">{new Date(obs.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 border border-slate-300 font-bold text-xs">{obs.type}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs">{obs.category}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs">{obs.location}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs">{obs.description}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs italic">{obs.immediateActionTaken || '-'}</td>
                                <td className="px-4 py-2 border border-slate-300 text-xs font-bold uppercase">{obs.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between text-xs">
                    <p>Report generated by Safedify HSE Platform</p>
                    <p>Sign Off: __________________________</p>
                </div>
            </div>

            {/* View / Edit Modal (Hidden on Print) */}
            {selectedObs && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in print:hidden">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                {isEditMode ? <Edit2 size={18} className="text-blue-600"/> : <Eye size={18} className="text-slate-600"/>}
                                {isEditMode ? 'Edit Observation' : 'Observation Details'}
                            </h3>
                            <button onClick={() => setSelectedObs(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {isEditMode ? (
                            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                                        <select 
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                            value={editForm.type}
                                            onChange={(e) => setEditForm({...editForm, type: e.target.value as ObservationType})}
                                        >
                                            <option value="Unsafe Act">Unsafe Act</option>
                                            <option value="Unsafe Condition">Unsafe Condition</option>
                                            <option value="Safe Behavior">Safe Behavior</option>
                                            <option value="Near Miss">Near Miss</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                                        <select 
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                            value={editForm.category}
                                            onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                                    <input 
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                        value={editForm.location}
                                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                    <textarea 
                                        rows={3}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Immediate Action</label>
                                    <textarea 
                                        rows={2}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                        value={editForm.immediateActionTaken}
                                        onChange={(e) => setEditForm({...editForm, immediateActionTaken: e.target.value})}
                                        aria-label="Immediate action taken"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                                        aria-label="Observation status"
                                    >
                                        <option value="Open">Open</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedObs(null)}
                                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"                                        aria-label="Cancel editing observation"                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Changes
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 space-y-5">
                                <div className="flex justify-between items-start">
                                    <span className={`px-3 py-1 text-sm font-bold rounded-full uppercase border ${getTypeColor(selectedObs.type)}`}>
                                        {selectedObs.type}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">{new Date(selectedObs.date).toLocaleString()}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1"><Tag size={12}/> Category</span>
                                        <span className="font-medium text-slate-800">{selectedObs.category}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1"><MapPin size={12}/> Location</span>
                                        <span className="font-medium text-slate-800">{selectedObs.location}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1 mb-1"><FileText size={12}/> Description</h4>
                                    <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                        {selectedObs.description}
                                    </p>
                                </div>

                                {selectedObs.immediateActionTaken && (
                                    <div>
                                        <h4 className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1 mb-1"><CheckCircle size={12}/> Immediate Action</h4>
                                        <p className="text-slate-700 text-sm italic">
                                            {selectedObs.immediateActionTaken}
                                        </p>
                                    </div>
                                )}

                                {selectedObs.images.length > 0 && (
                                    <div>
                                        <h4 className="text-xs text-slate-400 uppercase font-bold mb-2">Evidence</h4>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {selectedObs.images.map((img, i) => (
                                                <img key={i} src={img} alt="Evidence" className="h-24 w-auto rounded border border-slate-200" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Status: <span className={`font-bold ${selectedObs.status === 'Open' ? 'text-blue-600' : 'text-slate-600'}`}>{selectedObs.status}</span></span>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                          onClick={() => {
                                            const obs = selectedObs; const now = new Date();
                                            const docNum = `OBS-${obs.id.split('-').pop()?.slice(-6).toUpperCase()}`;
                                            const typeColor = obs.type==='Unsafe Act'?'#dc2626':obs.type==='Unsafe Condition'?'#f97316':obs.type==='Near Miss'?'#7c3aed':'#16a34a';
                                            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Observation Card — ${docNum}</title><style>@page{size:A4 portrait;margin:18mm 15mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;}.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:5px;background:#fff;}</style></head><body>
                                            <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:3px solid #0f172a;margin-bottom:18px;">
                                              <div><div style="font-size:22px;font-weight:800;">Safedify</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">HSE Management Platform</div></div>
                                              <div style="text-align:right;"><div style="font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Safety Observation Card</div><div style="font-size:11px;color:#64748b;">${docNum} &nbsp;|&nbsp; STOP Card / BBS</div></div>
                                            </div>
                                            <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;">
                                              <span style="display:inline-block;padding:6px 18px;border-radius:30px;font-size:14px;font-weight:800;color:${typeColor};border:2.5px solid ${typeColor};letter-spacing:0.5px;">${obs.type.toUpperCase()}</span>
                                              <span style="font-size:12px;color:#64748b;">${obs.category} &nbsp;|&nbsp; ${new Date(obs.date).toLocaleString('en-GB')}</span>
                                            </div>
                                            <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
                                              <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;width:22%;">Reference</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;">${docNum}</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Date / Time</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${new Date(obs.date).toLocaleString('en-GB')}</td></tr>
                                              <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Location</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${obs.location}</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Category</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${obs.category}</td></tr>
                                              <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Observer</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${obs.isAnonymous?'Anonymous':(obs.observer||'—')}</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Status</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:${obs.status==='Closed'?'#16a34a':'#2563eb'};">${obs.status}</td></tr>
                                            </table>
                                            <div style="font-size:13px;font-weight:700;padding:8px 12px;background:#0f172a;color:#fff;border-radius:4px 4px 0 0;text-transform:uppercase;letter-spacing:0.5px;">Observation Description</div>
                                            <div style="border:1px solid #e2e8f0;border-top:none;padding:14px;background:#f8fafc;border-radius:0 0 4px 4px;font-size:12px;line-height:1.7;margin-bottom:16px;">${obs.description}</div>
                                            ${obs.immediateActionTaken?`<div style="font-size:13px;font-weight:700;padding:8px 12px;background:#1e3a5f;color:#fff;border-radius:4px 4px 0 0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0;">Immediate Action Taken</div><div style="border:1px solid #e2e8f0;border-top:none;padding:14px;background:#f0fdf4;border-radius:0 0 4px 4px;font-size:12px;line-height:1.7;margin-bottom:16px;font-style:italic;">${obs.immediateActionTaken}</div>`:''}
                                            <div style="margin-top:20px;border-top:2px solid #e2e8f0;padding-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
                                              <div style="border-top:1px solid #334155;padding-top:6px;"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Observer</div><div style="font-size:12px;font-weight:600;margin-top:2px;">${obs.isAnonymous?'Anonymous':(obs.observer||'—')}</div><div style="font-size:10px;color:#94a3b8;">Date: ${new Date(obs.date).toLocaleDateString('en-GB')}</div><div style="height:32px;"></div></div>
                                              <div style="border-top:1px solid #334155;padding-top:6px;"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Supervisor</div><div style="font-size:12px;font-weight:600;margin-top:2px;">&nbsp;</div><div style="font-size:10px;color:#94a3b8;">Date: ___________</div><div style="height:32px;"></div></div>
                                              <div style="border-top:1px solid #334155;padding-top:6px;"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">HSE Officer</div><div style="font-size:12px;font-weight:600;margin-top:2px;">&nbsp;</div><div style="font-size:10px;color:#94a3b8;">Date: ___________</div><div style="height:32px;"></div></div>
                                            </div>
                                            <div class="footer">Safedify HSE Platform &nbsp;|&nbsp; ${docNum} &nbsp;|&nbsp; ${now.toLocaleString()} &nbsp;|&nbsp; CONFIDENTIAL</div>
                                            </body></html>`;
                                            const win=window.open('','_blank','width=900,height=700');if(!win){alert('Allow popups.');return;}win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),600);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                                        >
                                          <Printer size={13} /> Print PDF
                                        </button>
                                        <ShareMenu
                                          title={`Safety Observation — ${selectedObs.type}`}
                                          text={`Safedify Safety Observation\nType: ${selectedObs.type} | Category: ${selectedObs.category}\nLocation: ${selectedObs.location}\n${selectedObs.description.slice(0,120)}...`}
                                        />
                                        <button 
                                            onClick={(e) => openEditModal(selectedObs, e)}
                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => setSelectedObs(null)}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
