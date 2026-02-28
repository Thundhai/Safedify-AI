
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkers, getTrainingRecords, getTrainingModules } from '../services/storageService';
import { WorkerProfile, TrainingRecord, TrainingModule } from '../types';
import { 
  Users, CheckCircle, AlertTriangle, XCircle, Search, Calendar, ChevronRight
} from 'lucide-react';

export const TrainingDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'matrix' | 'workers' | 'schedule'>('matrix');
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [modules, setModules] = useState<TrainingModule[]>([]);

    useEffect(() => {
        const load = async () => {
            setWorkers(await getWorkers());
            setRecords(await getTrainingRecords());
            setModules(await getTrainingModules());
        };
        load();
    }, []);

    const getTrainingStatus = (workerId: string, moduleId: string) => {
        const record = records.find(r => r.workerId === workerId && r.moduleId === moduleId);
        if (!record) return 'missing';
        if (record.status === 'Expired') return 'expired';
        if (record.status === 'Expiring Soon') return 'warning';
        return 'valid';
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'valid': return 'bg-green-100 text-green-700 border-green-200';
            case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'expired': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-400 border-slate-100'; // missing
        }
    };

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'valid': return <CheckCircle size={14} />;
            case 'warning': return <AlertTriangle size={14} />;
            case 'expired': return <XCircle size={14} />;
            default: return <div className="w-3 h-3 rounded-full bg-slate-300" />;
        }
    };

    // Calculate Stats
    const totalAssignments = workers.length * modules.length;
    // Simplistic: assume all modules required for all for stats demo (in reality, filter by role)
    const validCount = records.filter(r => r.status === 'Valid').length;
    const expiringCount = records.filter(r => r.status === 'Expiring Soon').length;
    const complianceRate = Math.round((validCount / (totalAssignments * 0.6)) * 100); // Mock calculation

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Training & Competency</h2>
                    <p className="text-slate-500">Manage worker certifications and skill gaps.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold">Overall Compliance</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">{complianceRate}%</h3>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${complianceRate > 80 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <CheckCircle size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold">Expiring Soon (30 Days)</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">{expiringCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold">Active Workers</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">{workers.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('matrix')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'matrix' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Competency Matrix
                </button>
                <button 
                    onClick={() => setActiveTab('workers')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'workers' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Workers List
                </button>
                <button 
                    onClick={() => setActiveTab('schedule')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Schedule
                </button>
            </div>

            {/* Matrix View */}
            {activeTab === 'matrix' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 min-w-[200px] sticky left-0 bg-slate-50 z-10">Worker</th>
                                {modules.map(mod => (
                                    <th key={mod.id} className="px-4 py-3 min-w-[120px] text-center">{mod.title}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {workers.map(worker => (
                                <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {worker.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">{worker.name}</div>
                                                <div className="text-xs text-slate-500">{worker.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {modules.map(mod => {
                                        const status = getTrainingStatus(worker.id, mod.id);
                                        return (
                                            <td key={mod.id} className="px-4 py-3 text-center">
                                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${getStatusColor(status)}`}>
                                                    {getStatusIcon(status)}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Workers List View */}
            {activeTab === 'workers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workers.map(worker => (
                        <Link to={`/training/worker/${worker.id}`} key={worker.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {worker.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800">{worker.name}</h4>
                                    <p className="text-sm text-slate-500">{worker.role} • {worker.department}</p>
                                </div>
                                <ChevronRight className="text-slate-300" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Joined: {new Date(worker.joinedDate).toLocaleDateString()}</span>
                                <span className="text-blue-600 font-medium">View Profile</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

             {/* Schedule View (Placeholder) */}
             {activeTab === 'schedule' && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-700">Training Calendar</p>
                    <p className="text-sm">Upcoming scheduled sessions will appear here.</p>
                    <div className="mt-6 space-y-3 max-w-md mx-auto text-left">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                            <div className="bg-blue-200 text-blue-800 rounded px-2 py-1 text-xs font-bold text-center min-w-[50px]">
                                OCT<br/><span className="text-lg">25</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Confined Space Refresher</h4>
                                <p className="text-xs text-slate-500">09:00 AM - Training Room A</p>
                            </div>
                        </div>
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex gap-3">
                            <div className="bg-purple-200 text-purple-800 rounded px-2 py-1 text-xs font-bold text-center min-w-[50px]">
                                NOV<br/><span className="text-lg">02</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">First Aid & CPR</h4>
                                <p className="text-xs text-slate-500">10:00 AM - Main Hall</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};