
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getContractors } from '../services/storageService';
import { Contractor } from '../types';
import { Plus, Users, ShieldCheck, AlertCircle, Briefcase, ChevronRight } from 'lucide-react';

export const ContractorList: React.FC = () => {
    const [contractors, setContractors] = useState<Contractor[]>([]);

    useEffect(() => {
        const load = async () => {
            setContractors(await getContractors());
        };
        load();
    }, []);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Suspended': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const getRatingColor = (rating: string | undefined) => {
        switch(rating) {
            case 'A': return 'bg-green-500';
            case 'B': return 'bg-blue-500';
            case 'C': return 'bg-yellow-500';
            case 'D': return 'bg-red-500';
            default: return 'bg-slate-300';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Contractor Management</h2>
                    <p className="text-slate-500">Onboard and monitor external partners and compliance.</p>
                </div>
                <Link to="/contractors/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                    <Plus size={18} /> Onboard Contractor
                </Link>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contractors.map(contractor => (
                    <Link to={`/contractors/${contractor.id}`} key={contractor.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                <Briefcase size={24} />
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase border ${getStatusColor(contractor.status)}`}>
                                {contractor.status}
                            </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-1">{contractor.name}</h3>
                        <p className="text-sm text-slate-500 mb-4">{contractor.contactPerson}</p>

                        <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Compliance</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${contractor.complianceScore >= 80 ? 'bg-green-500' : contractor.complianceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                            style={{ width: `${contractor.complianceScore}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{contractor.complianceScore}%</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Rating</p>
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${getRatingColor(contractor.performanceRating)}`}>
                                    {contractor.performanceRating || '-'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                             <span className="flex items-center gap-1">
                                 <ShieldCheck size={14} className={contractor.documents.some(d => d.status === 'Expired') ? 'text-red-500' : 'text-green-500'} />
                                 {contractor.documents.length} Docs
                             </span>
                             <span className="flex items-center gap-1 text-blue-600 font-medium group-hover:underline">
                                 View Details <ChevronRight size={14} />
                             </span>
                        </div>
                    </Link>
                ))}

                {contractors.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        <Users size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No contractors onboarded yet.</p>
                     </div>
                )}
            </div>
        </div>
    );
};
