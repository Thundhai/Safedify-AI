
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDocuments } from '../services/storageService';
import { HSEDocument, DocumentCategory } from '../types';
import { Plus, FileText, Search, Filter, Shield, Book, FileBarChart, AlertCircle } from 'lucide-react';

export const DocumentList: React.FC = () => {
    const [documents, setDocuments] = useState<HSEDocument[]>([]);
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            setDocuments(await getDocuments());
        };
        load();
    }, []);

    const filteredDocs = documents.filter(d => {
        const matchesCategory = filterCategory === 'All' || d.category === filterCategory;
        const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (cat: DocumentCategory) => {
        switch(cat) {
            case 'Policy': return <Shield size={20} className="text-purple-600" />;
            case 'SOP': return <Book size={20} className="text-blue-600" />;
            case 'MSDS': return <AlertCircle size={20} className="text-red-600" />;
            case 'Report': return <FileBarChart size={20} className="text-green-600" />;
            default: return <FileText size={20} className="text-slate-600" />;
        }
    };

    const categories: DocumentCategory[] = ['Policy', 'SOP', 'MSDS', 'Work Instruction', 'Report'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Document Management</h2>
                    <p className="text-slate-500">Central library for Policies, SOPs, and MSDS.</p>
                </div>
                <Link to="/documents/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                    <Plus size={18} /> Upload Document
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Search documents..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                </div>
                
                <div className="flex overflow-x-auto gap-2">
                    <button 
                         onClick={() => setFilterCategory('All')}
                         className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                             filterCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                         }`}
                    >
                        All Docs
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                filterCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocs.map(doc => (
                    <Link to={`/documents/${doc.id}`} key={doc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                {getIcon(doc.category)}
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                                doc.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                doc.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {doc.status}
                            </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{doc.title}</h3>
                        <p className="text-xs text-slate-500 mb-4 font-mono">{doc.version} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                        
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">{doc.description}</p>

                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
                             <span>Author: {doc.author}</span>
                             <span>{doc.category}</span>
                        </div>
                    </Link>
                ))}

                {filteredDocs.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No documents found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
