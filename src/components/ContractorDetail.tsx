
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getContractorById, saveContractor, getWorkers } from '../services/storageService';
import { evaluateContractorComplianceAI } from '../services/geminiService';
import { Contractor, ContractorDocument, WorkerProfile } from '../types';
import { 
    ArrowLeft, Save, Briefcase, FileText, Users, ShieldCheck, 
    AlertTriangle, Plus, Upload, Trash2, CheckCircle, XCircle, 
    Sparkles, Loader2, Award
} from 'lucide-react';

export const ContractorDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'workers'>('overview');
    const [contractor, setContractor] = useState<Contractor>({
        id: `cont-${Date.now()}`,
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        status: 'Pending',
        documents: [],
        complianceScore: 0
    });
    
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (!isNew && id) {
            const existing = getContractorById(id);
            if (existing) setContractor(existing);
            // Fetch associated workers
            const allWorkers = getWorkers();
            setWorkers(allWorkers.filter(w => w.companyId === id));
        }
    }, [id, isNew]);

    const handleSave = () => {
        if (!contractor.name) return alert("Company Name is required");
        saveContractor(contractor);
        alert("Contractor Saved Successfully");
        navigate('/contractors');
    };

    const handleAddDocument = () => {
        const newDoc: ContractorDocument = {
            id: `cd-${Date.now()}`,
            title: 'New Document',
            type: 'Insurance',
            expiryDate: '',
            status: 'Pending'
        };
        setContractor(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
    };

    const updateDocument = (docId: string, updates: Partial<ContractorDocument>) => {
        setContractor(prev => ({
            ...prev,
            documents: prev.documents.map(d => d.id === docId ? { ...d, ...updates } : d)
        }));
    };

    const removeDocument = (docId: string) => {
        setContractor(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.id !== docId)
        }));
    };

    const runComplianceCheck = async () => {
        setIsAnalyzing(true);
        try {
            const result = await evaluateContractorComplianceAI(contractor, workers.length);
            if (result) {
                setContractor(prev => ({
                    ...prev,
                    complianceScore: result.complianceScore || prev.complianceScore,
                    performanceRating: result.performanceRating || prev.performanceRating
                }));
                if (result.issues && result.issues.length > 0) {
                    alert(`Compliance Check Complete.\nIssues:\n- ${result.issues.join('\n- ')}`);
                } else {
                    alert("Compliance Check Complete. Status: Good.");
                }
            }
        } catch (e) {
            console.error(e);
            alert("AI check failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/contractors" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'New Contractor' : contractor.name}</h1>
                        {!isNew && (
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                contractor.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                contractor.status === 'Suspended' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {contractor.status}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <button 
                            onClick={runComplianceCheck}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium transition-colors"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            AI Audit
                        </button>
                    )}
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                        <Save size={18} /> Save
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Overview</button>
                    <button onClick={() => setActiveTab('documents')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'documents' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Documents ({contractor.documents.length})</button>
                    <button onClick={() => setActiveTab('workers')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'workers' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Workers ({workers.length})</button>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Company Details</h3>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
                                    <input 
                                        type="text" 
                                        value={contractor.name}
                                        onChange={(e) => setContractor({...contractor, name: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                                    <input 
                                        type="text" 
                                        value={contractor.contactPerson}
                                        onChange={(e) => setContractor({...contractor, contactPerson: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            value={contractor.email}
                                            onChange={(e) => setContractor({...contractor, email: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                                        <input 
                                            type="text" 
                                            value={contractor.phone}
                                            onChange={(e) => setContractor({...contractor, phone: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                                    <select 
                                        value={contractor.status}
                                        onChange={(e) => setContractor({...contractor, status: e.target.value as any})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Performance & Stats</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Compliance Score</p>
                                        <div className={`text-3xl font-bold mt-2 ${contractor.complianceScore >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                                            {contractor.complianceScore}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Rating</p>
                                        <div className="text-3xl font-bold mt-2 text-blue-600">
                                            {contractor.performanceRating || '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                                        <Users size={16} /> Workforce
                                    </h4>
                                    <p className="text-sm text-blue-700">
                                        Total Workers: <b>{workers.length}</b>
                                    </p>
                                    <Link to={`/training?filter=${contractor.id}`} className="text-xs text-blue-600 underline mt-1 block">
                                        View Worker Training Matrix
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">HSE Documents</h3>
                                <button onClick={handleAddDocument} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
                                    <Plus size={16} /> Add Document
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {contractor.documents.length === 0 ? (
                                    <p className="text-center text-slate-400 py-8">No documents uploaded.</p>
                                ) : (
                                    contractor.documents.map((doc, idx) => (
                                        <div key={doc.id} className="border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <input 
                                                    type="text" 
                                                    value={doc.title}
                                                    onChange={(e) => updateDocument(doc.id, { title: e.target.value })}
                                                    className="border border-slate-300 rounded p-2 text-sm"
                                                    placeholder="Document Title"
                                                    aria-label="Document title"
                                                />
                                                <select 
                                                    value={doc.type}
                                                    onChange={(e) => updateDocument(doc.id, { type: e.target.value as any })}
                                                    className="border border-slate-300 rounded p-2 text-sm"
                                                >
                                                    <option value="Insurance">Insurance</option>
                                                    <option value="HSE Policy">HSE Policy</option>
                                                    <option value="License">License</option>
                                                    <option value="Certification">Certification</option>
                                                </select>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500">Exp:</span>
                                                    <input 
                                                        type="date" 
                                                        value={doc.expiryDate}
                                                        onChange={(e) => updateDocument(doc.id, { expiryDate: e.target.value })}
                                                        className="border border-slate-300 rounded p-2 text-sm w-full"
                                                        aria-label="Document expiry date"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                                                    new Date(doc.expiryDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {new Date(doc.expiryDate) < new Date() ? 'Expired' : 'Valid'}
                                                </span>
                                                <button onClick={() => removeDocument(doc.id)} className="text-slate-400 hover:text-red-500">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workers' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Associated Workers</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {workers.length === 0 ? (
                                    <p className="col-span-full text-center text-slate-400 py-8">No workers linked to this contractor.</p>
                                ) : (
                                    workers.map(worker => (
                                        <div key={worker.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors bg-slate-50">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                {worker.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{worker.name}</h4>
                                                <p className="text-xs text-slate-500">{worker.role}</p>
                                            </div>
                                            <Link to={`/training/worker/${worker.id}`} className="ml-auto text-sm text-blue-600 font-medium">
                                                Profile
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
