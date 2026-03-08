
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { getAssetById, saveAsset } from '../services/storageService';
import { extractCertificateDataAI } from '../services/geminiService';
import { Asset, AssetDocument } from '../types';
import { 
    ArrowLeft, Calendar, MapPin, AlertTriangle, FileText, Upload, 
    QrCode, Loader2, Sparkles, Plus, Trash2, Check, Clock 
} from 'lucide-react';

export const AssetDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [asset, setAsset] = useState<Asset | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'maintenance'>('overview');
    
    // Doc Upload
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (id) {
            const load = async () => {
                setAsset(await getAssetById(id));
            };
            load();
        }
    }, [id]);

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && asset) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                setIsUploading(true);
                try {
                    const extracted = await extractCertificateDataAI(base64);
                    
                    const newDoc: AssetDocument = {
                        id: `doc-${Date.now()}`,
                        title: extracted.title || file.name,
                        type: file.type.includes('pdf') ? 'PDF' : 'Image',
                        url: base64, // In prod, upload to storage
                        uploadDate: new Date().toISOString().split('T')[0],
                        expiryDate: extracted.expiryDate
                    };

                    const updatedAsset = { 
                        ...asset, 
                        documents: [...asset.documents, newDoc],
                        // Auto update next inspection if certificate implies it
                        nextInspectionDate: extracted.expiryDate || asset.nextInspectionDate
                    };
                    
                    await saveAsset(updatedAsset);
                    setAsset(updatedAsset);
                    toast.success("Certificate uploaded and analyzed!");

                } catch (err) {
                    console.error(err);
                    toast.error("Failed to analyze document.");
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const addMaintenanceRecord = (e: React.FormEvent) => {
        e.preventDefault();
        // Simpler implementation for MVP: alert
        toast("Maintenance record functionality coming in next update.", { icon: 'ℹ️' });
    };

    if (!asset) return <div className="p-8 text-center text-slate-500">Asset not found</div>;

    // QR Code
    const qrData = JSON.stringify({ id: asset.id, name: asset.name });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/assets" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{asset.name}</h1>
                    <p className="text-sm text-slate-500">{asset.category} • {asset.modelNumber}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Info & QR */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                         <div className="flex justify-center mb-6">
                             <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                 <img src={qrUrl} alt="Asset QR" className="w-32 h-32" />
                             </div>
                         </div>
                         <div className="text-center mb-6">
                             <p className="text-xs text-slate-400 font-mono">{asset.id}</p>
                             <p className="text-xs text-slate-500">Scan to view details or log inspection</p>
                         </div>
                         
                         <div className="space-y-3">
                             <div className="flex justify-between text-sm">
                                 <span className="text-slate-500">Status</span>
                                 <span className={`font-bold ${asset.status === 'Operational' ? 'text-green-600' : 'text-red-600'}`}>{asset.status}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                 <span className="text-slate-500">Location</span>
                                 <span>{asset.location}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                 <span className="text-slate-500">Serial No</span>
                                 <span>{asset.serialNumber}</span>
                             </div>
                         </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock size={18} /> Inspection Status
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Last Inspection</p>
                                <p className="font-medium">{asset.lastInspectionDate || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Next Due</p>
                                <p className={`font-bold text-lg ${new Date(asset.nextInspectionDate) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>
                                    {asset.nextInspectionDate}
                                </p>
                            </div>
                            <Link to="/inspections" className="block w-full py-2 bg-blue-600 text-white text-center rounded-lg text-sm font-medium hover:bg-blue-700">
                                Perform Inspection
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Col: Tabs */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
                    <div className="flex border-b border-slate-200">
                        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Overview</button>
                        <button onClick={() => setActiveTab('documents')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'documents' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Documents & Certs</button>
                        <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'maintenance' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Maintenance Log</button>
                    </div>
                    
                    <div className="p-6 flex-1">
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800">Asset Specifications</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium">{asset.category}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Model</span><span className="font-medium">{asset.modelNumber}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Serial No</span><span className="font-medium">{asset.serialNumber}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium">{asset.location}</span></div>
                                </div>
                                
                                <h3 className="font-bold text-slate-800 mt-6">Recent Activity</h3>
                                <p className="text-sm text-slate-400 py-4">No recent activity recorded for this asset.</p>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">Safety Certificates</h3>
                                    <label className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-100 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                                        Upload Cert
                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleDocUpload} />
                                    </label>
                                </div>

                                <div className="space-y-3">
                                    {asset.documents.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">No documents uploaded.</p>
                                    ) : (
                                        asset.documents.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="text-red-500" size={24} />
                                                    <div>
                                                        <p className="font-medium text-slate-800">{doc.title}</p>
                                                        <p className="text-xs text-slate-500">Exp: {doc.expiryDate || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <button className="text-blue-600 text-sm font-medium">View</button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'maintenance' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">Maintenance History</h3>
                                    <button onClick={addMaintenanceRecord} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium">
                                        <Plus size={16} /> Add Record
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {asset.maintenanceHistory.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">No maintenance history recorded.</p>
                                    ) : (
                                        asset.maintenanceHistory.map((rec, i) => (
                                            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-bold text-slate-700">{rec.date}</span>
                                                    <span className="text-xs text-slate-400">{rec.performedBy}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{rec.description}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
