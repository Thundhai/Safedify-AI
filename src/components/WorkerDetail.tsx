
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWorkerById, getTrainingRecords, saveTrainingRecord, getIncidents } from '../services/storageService';
import { parseCertificateAI, analyzeSkillGapAI } from '../services/geminiService';
import { WorkerProfile, TrainingRecord } from '../types';
import { 
    ArrowLeft, Upload, Loader2, Award, Calendar, AlertTriangle, Sparkles, CheckCircle, FileText
} from 'lucide-react';

export const WorkerDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [worker, setWorker] = useState<WorkerProfile | undefined>(undefined);
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    
    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);

    // AI Gap Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [gapAnalysis, setGapAnalysis] = useState<any>(null);

    useEffect(() => {
        if (id) {
            setWorker(getWorkerById(id));
            setRecords(getTrainingRecords().filter(r => r.workerId === id));
        }
    }, [id]);

    const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                setUploadPreview(base64);
                setIsUploading(true);
                
                try {
                    // Extract Data via AI
                    const data = await parseCertificateAI(base64);
                    
                    if (confirm(`AI Extracted:\nCourse: ${data.courseTitle}\nDate: ${data.completionDate}\n\nAdd this record?`)) {
                        const newRecord: TrainingRecord = {
                            id: `rec-${Date.now()}`,
                            workerId: id!,
                            moduleId: 'mod-custom', // In a real app, match with existing modules
                            moduleTitle: data.courseTitle || 'Unknown Course',
                            completionDate: data.completionDate || new Date().toISOString().split('T')[0],
                            expiryDate: data.expiryDate,
                            certificateUrl: base64,
                            status: 'Valid'
                        };
                        saveTrainingRecord(newRecord);
                        setRecords(prev => [newRecord, ...prev]);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Failed to parse certificate.");
                } finally {
                    setIsUploading(false);
                    setUploadPreview(null);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGapAnalysis = async () => {
        if (!worker) return;
        setIsAnalyzing(true);
        try {
            // Context: Find incidents where the worker was the reporter OR mentioned in the description
            const relevantIncidents = getIncidents()
                .filter(i => i.reporter === worker.name || i.description.includes(worker.name))
                .map(i => `${i.type} (${i.severity}): ${i.description}`);
            
            const trainingTitles = records.map(r => r.moduleTitle);

            const result = await analyzeSkillGapAI(worker.role, trainingTitles, relevantIncidents);
            setGapAnalysis(result);
        } catch (e) {
            console.error(e);
            alert("Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!worker) return <div className="p-8 text-center text-slate-500">Worker not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/training" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-800">Worker Profile</h1>
            </div>

            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400">
                    {worker.name.charAt(0)}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800">{worker.name}</h2>
                    <p className="text-slate-500 font-medium">{worker.role} • {worker.department}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={14}/> Joined: {worker.joinedDate}</span>
                        <span className="flex items-center gap-1"><Award size={14}/> {records.length} Certificates</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 font-medium transition-all ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
                        {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {isUploading ? 'Scanning...' : 'Upload Certificate'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleCertificateUpload} disabled={isUploading}/>
                    </label>
                    <button 
                        onClick={handleGapAnalysis}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium transition-all shadow-sm"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        AI Skill Gap Check
                    </button>
                </div>
            </div>

            {/* AI Gap Analysis Result */}
            {gapAnalysis && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-6 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                                <Sparkles size={20} /> AI Competency Analysis
                            </h3>
                            <p className="text-sm text-purple-700 mt-1">Based on role requirements and incident history.</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded text-lg font-bold text-purple-800 shadow-sm border border-purple-100">
                                Score: {gapAnalysis.score}/100
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {gapAnalysis.missingModules?.length > 0 && (
                            <div className="bg-white/50 rounded-lg p-4 border border-purple-100">
                                <p className="text-xs font-bold text-purple-800 uppercase mb-3 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-red-500" /> Missing / Expired Training
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {gapAnalysis.missingModules.map((m: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs font-semibold">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {gapAnalysis.recommendedModules?.length > 0 && (
                            <div className="bg-white/50 rounded-lg p-4 border border-purple-100">
                                <p className="text-xs font-bold text-purple-800 uppercase mb-3 flex items-center gap-2">
                                    <Sparkles size={14} className="text-purple-500" /> Recommended Upskilling
                                </p>
                                <div className="space-y-3">
                                    {gapAnalysis.recommendedModules.map((rec: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-purple-900">
                                            <CheckCircle size={14} className="mt-0.5 text-purple-600 shrink-0" />
                                            <div>
                                                <span className="font-semibold block">{rec.title}</span>
                                                <span className="text-xs text-slate-600 leading-snug">{rec.reason}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Training History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 flex justify-between items-center">
                    <span>Training History</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {records.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No training records found.</div>
                    ) : (
                        records.map(record => (
                            <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-blue-500 bg-blue-50 p-2 rounded-lg"><Award size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{record.moduleTitle}</h4>
                                        <p className="text-sm text-slate-500">Completed: {record.completionDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {record.certificateUrl && (
                                        <span className="flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:underline">
                                            <FileText size={14} /> View Cert
                                        </span>
                                    )}
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        record.status === 'Valid' ? 'bg-green-100 text-green-700' :
                                        record.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {record.status}
                                        {record.expiryDate && <span className="block text-[10px] font-normal normal-case">Exp: {record.expiryDate}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
