import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocumentById, saveDocument } from '../services/storageService';
import { summarizeDocumentAI } from '../services/geminiService';
import { SmartTextInput, SmartTextArea } from './SmartTextInput';
import { HSEDocument, DocumentCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, Save, Upload, QrCode, Sparkles, Loader2, CheckCircle, 
    XCircle, FileText, Calendar, User, Clock, Tag, History
} from 'lucide-react';

export const DocumentForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !id || id === 'new';

    const [doc, setDoc] = useState<HSEDocument>({
        id: `doc-${Date.now()}`,
        title: '',
        category: 'SOP',
        version: 'v1.0',
        status: 'Draft',
        uploadDate: new Date().toISOString().split('T')[0]!,
        author: user?.name || 'Unknown',
        description: '',
        expiryDate: '',
        reviewer: '',
        tags: [],
        versionHistory: [],
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (!isNew && id) {
            const load = async () => {
                const existing = await getDocumentById(id);
                if (existing) setDoc(existing);
            };
            load();
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
        if (!doc.contentUrl) { toast.error("Please upload a document first."); return; }
        setIsSummarizing(true);
        try {
            const result = await summarizeDocumentAI(doc.contentUrl, doc.title);
            setDoc(prev => ({ ...prev, aiSummary: result.summary }));
        } catch (e) {
            console.error(e);
            toast.error("Failed to summarize.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSave = async () => {
        if (!doc.title) { toast.error("Title required"); return; }
        try {
          await saveDocument(doc);
          toast.success("Document Saved.");
          navigate('/documents');
        } catch (err: any) {
          console.error("Save document failed", err);
          toast.error(err?.message || "Failed to save document. Please try again.");
        }
    };

    const handleApprove = async () => {
        try {
          const historyEntry = {
              version: doc.version,
              date: new Date().toISOString().split('T')[0]!,
              author: user?.name || 'Unknown',
              changes: `Approved by ${user?.name || 'Unknown'}`
          };
          const updated = { 
              ...doc, 
              status: 'Approved' as const, 
              approvedBy: user?.name || 'Unknown', 
              approvalDate: new Date().toISOString().split('T')[0]!,
              versionHistory: [...(doc.versionHistory || []), historyEntry],
          };
          setDoc(updated);
          await saveDocument(updated);
          toast.success("Document Approved.");
        } catch (err: any) {
          console.error("Approve document failed", err);
          toast.error(err?.message || "Failed to approve document. Please try again.");
        }
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !(doc.tags || []).includes(tag)) {
            setDoc(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setDoc(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
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
                                <SmartTextInput 
                                    value={doc.title}
                                    onChange={(e) => setDoc({...doc, title: e.target.value})}
                                    onValueChange={(v) => setDoc(d => ({...d, title: v}))}
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
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><Clock size={14} /> Expiry Date</label>
                                <input 
                                    type="date" 
                                    value={doc.expiryDate || ''}
                                    onChange={(e) => setDoc({...doc, expiryDate: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Reviewer</label>
                                <input 
                                    type="text" 
                                    value={doc.reviewer || ''}
                                    onChange={(e) => setDoc({...doc, reviewer: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    placeholder="Assigned reviewer"
                                />
                             </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                            <SmartTextArea 
                                rows={3}
                                value={doc.description ?? ''}
                                onChange={(e) => setDoc({...doc, description: e.target.value})}
                                onValueChange={(v) => setDoc(d => ({...d, description: v}))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><Tag size={14} /> Tags</label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {(doc.tags || []).map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><XCircle size={12} /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    className="flex-1 border border-slate-300 rounded-lg p-2 text-sm"
                                    placeholder="Add tag and press Enter"
                                />
                                <button type="button" onClick={addTag} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">Add</button>
                            </div>
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

                    {/* Version History */}
                    {(doc.versionHistory || []).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <History size={18} /> Version History
                            </h3>
                            <div className="space-y-3">
                                {[...(doc.versionHistory || [])].reverse().map((v, i) => (
                                    <div key={i} className="border-l-2 border-blue-200 pl-3 py-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-blue-600">{v.version}</span>
                                            <span className="text-[10px] text-slate-400">{v.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">{v.changes}</p>
                                        <p className="text-[10px] text-slate-400">by {v.author}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiry Warning */}
                    {doc.expiryDate && new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 86400000) && (
                        <div className={`p-4 rounded-xl border ${new Date(doc.expiryDate) < new Date() ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className={new Date(doc.expiryDate) < new Date() ? 'text-red-500' : 'text-yellow-600'} />
                                <span className={`text-sm font-bold ${new Date(doc.expiryDate) < new Date() ? 'text-red-700' : 'text-yellow-700'}`}>
                                    {new Date(doc.expiryDate) < new Date() ? 'Document Expired' : 'Expiring Soon'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Expiry: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};