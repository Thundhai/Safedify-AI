
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
                        onClick={() => {
                          const now = new Date();
                          const statusColor = (s:string) => s==='Approved'?'#16a34a':s==='Archived'?'#64748b':'#ca8a04';
                          const maxScore = (ra:any) => ra.hazards.length>0?Math.max(...ra.hazards.map((h:any)=>h.riskScore)):0;
                          const riskBadge = (score:number) => { const c=score>=15?['#fef2f2','#dc2626','Critical']:score>=10?['#fff7ed','#f97316','High']:score>=5?['#fefce8','#ca8a04','Medium']:['#f0fdf4','#16a34a','Low']; return `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;background:${c[0]};color:${c[1]};border:1.5px solid ${c[1]};">${c[2]}</span>`; };
                          const rows = filtered.map((a,i) => `<tr style="break-inside:avoid;"><td style="text-align:center;color:#64748b;font-size:11px;padding:8px 6px;border:1px solid #e2e8f0;">${i+1}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:10px;font-family:monospace;color:#64748b;">RA-${a.id.split('-').pop()?.slice(-6).toUpperCase()}</td><td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b;font-size:12px;">${a.title}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:#eff6ff;color:#2563eb;">${a.type}</span></td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;">${a.author}</td><td style="padding:8px 8px;border:1px solid #e2e8f0;font-size:11px;">${new Date(a.date).toLocaleDateString('en-GB')}</td><td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#334155;">${a.hazards.length}</td><td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;">${a.hazards.length>0?riskBadge(maxScore(a)):'<span style="color:#94a3b8;font-size:11px;">—</span>'}</td><td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;"><span style="font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;color:${statusColor(a.status)};border:1.5px solid ${statusColor(a.status)};">${a.status.toUpperCase()}</span></td></tr>`).join('');
                          const counts = {total:filtered.length,approved:filtered.filter(a=>a.status==='Approved').length,draft:filtered.filter(a=>a.status==='Draft').length,archived:filtered.filter(a=>a.status==='Archived').length};
                          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Risk Assessment Register</title><style>@page{size:A4 landscape;margin:15mm 12mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1e293b;}.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:4px;background:#fff;}</style></head><body>
                          <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;border-bottom:3px solid #0f172a;margin-bottom:16px;"><div><div style="font-size:20px;font-weight:800;color:#0f172a;">Safedify</div><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">HSE Management Platform</div></div><div style="text-align:right;"><div style="font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Risk Assessment Register</div><div style="font-size:10px;color:#64748b;">Master Document List &nbsp;|&nbsp; Generated: ${now.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div></div></div>
                          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">${[['Total Assessments',counts.total,'#1e293b'],['Approved',counts.approved,'#16a34a'],['Draft',counts.draft,'#ca8a04'],['Archived',counts.archived,'#64748b']].map(([l,v,c])=>`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;"><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">${l}</div><div style="font-size:24px;font-weight:800;color:${c};">${v}</div></div>`).join('')}</div>
                          <div style="font-size:12px;font-weight:700;padding:7px 12px;background:#0f172a;color:#fff;border-radius:4px 4px 0 0;text-transform:uppercase;letter-spacing:0.5px;">Risk Assessment Register</div>
                          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
                          <thead><tr style="background:#1e3a5f;"><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;text-align:center;width:3%;">#</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:8%;">Ref No.</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;">Assessment Title</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:8%;text-align:center;">Type</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:12%;">Prepared By</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:9%;">Date</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:7%;text-align:center;">Hazards</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:9%;text-align:center;">Highest Risk</th><th style="color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:7px 6px;border:1px solid #2d4f80;width:9%;text-align:center;">Status</th></tr></thead>
                          <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">No assessments found.</td></tr>'}</tbody></table>
                          <div class="footer">Safedify HSE Platform &nbsp;|&nbsp; Risk Assessment Register &nbsp;|&nbsp; ${now.toLocaleString()} &nbsp;|&nbsp; CONFIDENTIAL — For authorised personnel only</div>
                          </body></html>`;
                          const win=window.open('','_blank','width=1100,height=700');if(!win){alert('Allow popups.');return;}win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),600);
                        }}
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
            <ContextFilterBar value={contextFilter} onChange={setContextFilter} className="print:hidden" />
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
