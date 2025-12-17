import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocumentById, saveDocument } from '../services/storageService';
import { summarizeDocumentAI } from '../services/geminiService';
import { HSEDocument, DocumentCategory } from '../types';
import { 
    ArrowLeft, Save, Upload, QrCode, Sparkles, Loader2, CheckCircle, 
    XCircle, FileText, Calendar, User
} from 'lucide-react';

export const DocumentForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [doc, setDoc] = useState<HSEDocument>({
        id: `doc-${Date.now()}`,
        title: '',
        category: 'SOP',
        version: 'v1.0',
        status: 'Draft',
        uploadDate: new Date().toISOString().split('T')[0],
        author: 'Current User',
        description: ''
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);

    useEffect(() => {
        if (!isNew && id) {
            const existing = getDocumentById(id);
            if (existing) setDoc(existing);
        }
    }, [id, isNew]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            setIsUploading(true);
            reader.onloadend = () => {
                setDoc(prev => ({ ...prev, contentUrl: reader.result as string }));
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateSummary = async () => {
        if (!doc.contentUrl) return alert("Please upload a document first.");
        setIsSummarizing(true);
        try {
            const result = await summarizeDocumentAI(doc.contentUrl, doc.title);
            setDoc(prev => ({ ...prev, aiSummary: result.summary }));
        } catch (e) {
            console.error(e);
            alert("Failed to summarize.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSave = () => {
        if (!doc.title) return alert("Title required");
        saveDocument(doc);
        alert("Document Saved.");
        navigate('/documents');
    };

    const handleApprove = () => {
        const updated = { 
            ...doc, 
            status: 'Approved' as const, 
            approvedBy: 'Current User', 
            approvalDate: new Date().toISOString().split('T')[0] 
        };
        setDoc(updated);
        saveDocument(updated);
    };

    const categories: DocumentCategory[] = ['Policy', 'SOP', 'MSDS', 'Work Instruction', 'Report', 'Training Material'];

    // QR Code for linking SOP to equipment
    const qrData = JSON.stringify({ docId: doc.id, title: doc.title, url: 'https://safedify.app/docs/' + doc.id });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/documents')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Upload Document' : 'Edit Document'}</h1>
                        <p className="text-sm text-slate-500">{doc.id}</p>
                    </div>
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                    <Save size={18} /> Save
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Document Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                                <input 
                                    type="text" 
                                    value={doc.title}
                                    onChange={(e) => setDoc({...doc, title: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    placeholder="e.g. Work at Height SOP"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                                <select 
                                    value={doc.category}
                                    onChange={(e) => setDoc({...doc, category: e.target.value as any})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Version</label>
                                <input 
                                    type="text" 
                                    value={doc.version}
                                    onChange={(e) => setDoc({...doc, version: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Author</label>
                                <input 
                                    type="text" 
                                    value={doc.author}
                                    onChange={(e) => setDoc({...doc, author: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                             </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                            <textarea 
                                rows={3}
                                value={doc.description}
                                onChange={(e) => setDoc({...doc, description: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">File Content</h3>
                            <button 
                                onClick={handleGenerateSummary}
                                disabled={isSummarizing || !doc.contentUrl}
                                className="text-xs flex items-center gap-1 text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 disabled:opacity-50"
                            >
                                {isSummarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                AI Summary
                            </button>
                        </div>

                        {!doc.contentUrl ? (
                            <label className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                                <Upload size={32} className="text-slate-400 mb-2" />
                                <span className="text-sm font-medium text-slate-600">Click to upload file</span>
                                <span className="text-xs text-slate-400">PDF, PNG, JPG supported</span>
                                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <FileText size={24} className="text-blue-600" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-medium truncate">{doc.title}</p>
                                        <p className="text-xs text-slate-500">File uploaded</p>
                                    </div>
                                    <button onClick={() => setDoc({...doc, contentUrl: undefined, aiSummary: undefined})} className="text-slate-400 hover:text-red-500">
                                        <XCircle size={20} />
                                    </button>
                                </div>

                                {doc.contentUrl.startsWith('data:image') && (
                                    <img src={doc.contentUrl} alt="Preview" className="w-full h-48 object-contain bg-slate-100 rounded-lg border border-slate-200" />
                                )}

                                {doc.aiSummary && (
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                        <h4 className="text-sm font-bold text-purple-800 mb-1 flex items-center gap-2">
                                            <Sparkles size={14} /> Executive Summary
                                        </h4>
                                        <p className="text-sm text-purple-700 leading-relaxed">{doc.aiSummary}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4">Status & Approval</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Current Status</p>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                                    doc.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                    doc.status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                                }`}>
                                    {doc.status}
                                </span>
                            </div>
                            
                            {doc.status !== 'Approved' && (
                                <button 
                                    onClick={handleApprove}
                                    className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} /> Approve Document
                                </button>
                            )}

                            {doc.approvedBy && (
                                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                                    <p>Approved by: <span className="font-medium text-slate-700">{doc.approvedBy}</span></p>
                                    <p>Date: {doc.approvalDate}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <QrCode size={18} /> Quick Link
                        </h3>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm mb-2">
                            <img src={qrUrl} alt="Doc QR Code" className="w-32 h-32" />
                        </div>
                        <p className="text-xs text-slate-500">Scan to access this document on site</p>
                    </div>
                </div>
            </div>
        </div>
    );
};