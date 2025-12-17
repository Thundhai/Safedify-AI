
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAssets, saveAsset } from '../services/storageService';
import { Asset, AssetCategory } from '../types';
import { Plus, Wrench, Search, Truck, Zap, Flame, Settings, X } from 'lucide-react';

export const AssetList: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newAsset, setNewAsset] = useState({
        name: '',
        category: 'Lifting Equipment' as AssetCategory,
        modelNumber: '',
        serialNumber: '',
        location: '',
        nextInspectionDate: ''
    });

    useEffect(() => {
        setAssets(getAssets());
    }, []);

    const filteredAssets = assets.filter(a => {
        const matchesCategory = filter === 'All' || a.category === filter;
        const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                              a.id.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (category: string) => {
        switch(category) {
            case 'Lifting Equipment': return <Wrench size={18} />;
            case 'Vehicle': return <Truck size={18} />;
            case 'Machine': return <Settings size={18} />;
            case 'Fire/Emergency': return <Flame size={18} />;
            default: return <Zap size={18} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Operational': return 'bg-green-100 text-green-700';
            case 'Under Maintenance': return 'bg-yellow-100 text-yellow-700';
            case 'Inspection Overdue': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    const handleSaveAsset = (e: React.FormEvent) => {
        e.preventDefault();
        const asset: Asset = {
            id: `ast-${Date.now()}`,
            name: newAsset.name,
            category: newAsset.category,
            modelNumber: newAsset.modelNumber,
            serialNumber: newAsset.serialNumber,
            location: newAsset.location,
            status: 'Operational',
            nextInspectionDate: newAsset.nextInspectionDate || new Date(Date.now() + 15778463000).toISOString().split('T')[0], // default 6 months
            documents: [],
            maintenanceHistory: []
        };
        
        saveAsset(asset);
        setAssets(getAssets()); // Refresh list
        setShowModal(false);
        setNewAsset({
            name: '',
            category: 'Lifting Equipment',
            modelNumber: '',
            serialNumber: '',
            location: '',
            nextInspectionDate: ''
        });
        alert("Asset Added Successfully!");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Assets & Equipment</h2>
                    <p className="text-slate-500">Track lifting gear, vehicles, and machinery compliance.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Add Asset
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Search by Name or ID..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                </div>
                
                <div className="flex overflow-x-auto gap-2">
                    {['All', 'Lifting Equipment', 'Vehicle', 'Machine', 'Fire/Emergency'].map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                filter === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map(asset => (
                    <Link to={`/assets/${asset.id}`} key={asset.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                    {getIcon(asset.category)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 line-clamp-1">{asset.name}</h3>
                                    <p className="text-xs text-slate-400 font-mono">{asset.id}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${getStatusColor(asset.status)}`}>
                                {asset.status}
                            </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Model:</span>
                                <span className="font-medium">{asset.modelNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Location:</span>
                                <span className="font-medium">{asset.location}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                                <span className="text-slate-400">Next Insp:</span>
                                <span className={`font-medium ${new Date(asset.nextInspectionDate) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>
                                    {asset.nextInspectionDate}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredAssets.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <Wrench size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No assets found.</p>
                    </div>
                )}
            </div>

            {/* Add Asset Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Add New Asset</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveAsset} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
                                <input 
                                    required
                                    type="text" 
                                    value={newAsset.name}
                                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Caterpillar Excavator"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <select 
                                    value={newAsset.category}
                                    onChange={(e) => setNewAsset({...newAsset, category: e.target.value as AssetCategory})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {['Lifting Equipment', 'Vehicle', 'Machine', 'Fire/Emergency', 'Tools'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Model No.</label>
                                    <input 
                                        type="text" 
                                        value={newAsset.modelNumber}
                                        onChange={(e) => setNewAsset({...newAsset, modelNumber: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 320D"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Serial No.</label>
                                    <input 
                                        type="text" 
                                        value={newAsset.serialNumber}
                                        onChange={(e) => setNewAsset({...newAsset, serialNumber: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. CAT-9928"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Location</label>
                                <input 
                                    type="text" 
                                    value={newAsset.location}
                                    onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Main Warehouse"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Next Inspection Due</label>
                                <input 
                                    type="date" 
                                    value={newAsset.nextInspectionDate}
                                    onChange={(e) => setNewAsset({...newAsset, nextInspectionDate: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                                >
                                    Save Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
    