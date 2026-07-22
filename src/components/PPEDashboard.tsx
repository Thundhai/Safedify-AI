
import React, { useState, useEffect } from 'react';
import { 
    getPPEInventory, getPPEIssuanceLogs, getWorkers, savePPEIssuance, updatePPEStock, 
    returnPPEItem, updatePPEIssuance, getPPECategories, savePPECategory, deletePPECategory, savePPEItem
} from '../services/storageService';
import { PPEItem, PPEIssuance, WorkerProfile } from '../types';
import { 
  Package, AlertTriangle, User, ClipboardList, Plus, 
  QrCode, Search, PenTool, Camera, Check, HardHat, Sparkles, Loader2, Calendar, RefreshCcw, XCircle, Settings, Trash2, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { analyzePPEStockAI } from '../services/geminiService';

export const PPEDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'issuance'>('inventory');
  const [inventory, setInventory] = useState<PPEItem[]>([]);
  const [logs, setLogs] = useState<PPEIssuance[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Issuance Form State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedPPEId, setSelectedPPEId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  // Category Management State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Add Item State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
      name: '',
      category: '',
      stockQuantity: 0,
      minStockThreshold: 5,
      description: ''
  });

  // AI Alert State
  const [aiAlert, setAiAlert] = useState<any>(null);
  const [loadingAiAlert, setLoadingAiAlert] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const inv = getPPEInventory();
    setInventory(inv);
    setLogs(getPPEIssuanceLogs());
    setWorkers(getWorkers());
    setCategories(getPPECategories());
    
    // Check for low stock and trigger AI
    const lowStockItems = inv.filter(i => i.stockQuantity <= i.minStockThreshold);
    if (lowStockItems.length > 0) {
        setLoadingAiAlert(true);
        analyzePPEStockAI(lowStockItems).then(res => {
            if (res) setAiAlert(res);
            setLoadingAiAlert(false);
        });
    } else {
        setAiAlert(null);
    }
  };

  const handleIssuePPE = (e: React.FormEvent) => {
    e.preventDefault();
    const worker = workers.find(w => w.id === selectedWorkerId);
    const item = inventory.find(i => i.id === selectedPPEId);

    if (!worker || !item) return;

    if (item.stockQuantity <= 0) {
        alert("Item is out of stock!");
        return;
    }

    const newIssuance: PPEIssuance = {
        id: `iss-${Date.now()}`,
        workerId: worker.id,
        workerName: worker.name,
        ppeItemId: item.id,
        ppeItemName: item.name,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: expiryDate || undefined,
        status: 'Active',
        signatureUrl: signatureImage || undefined
    };

    savePPEIssuance(newIssuance);
    setShowIssueModal(false);
    // Reset Form
    setSelectedWorkerId('');
    setSelectedPPEId('');
    setExpiryDate('');
    setSignatureImage(null);
    refreshData();
    alert("PPE Issued Successfully");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setSignatureImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStockUpdate = (item: PPEItem, newQty: number) => {
      if (newQty < 0) return;
      updatePPEStock(item.id, newQty);
      refreshData();
  };

  const handleReturnItem = (issuanceId: string) => {
      if(confirm("Mark this item as Returned and add back to stock?")) {
          returnPPEItem(issuanceId);
          refreshData();
      }
  };

  const handleMarkExpired = (log: PPEIssuance) => {
      if(confirm("Mark this issued item as Expired/Disposed?")) {
          const updated = { ...log, status: 'Expired' as const };
          updatePPEIssuance(updated);
          refreshData();
      }
  };

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategory.trim()) return;
      savePPECategory(newCategory.trim());
      setNewCategory('');
      refreshData();
  };

  const handleDeleteCategory = (cat: string) => {
      if (confirm(`Delete category "${cat}"?`)) {
          deletePPECategory(cat);
          refreshData();
      }
  };

  const handleAddItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItem.category) return alert("Please select a category");
      const item: PPEItem = {
          id: `ppe-${Date.now()}`,
          name: newItem.name,
          category: newItem.category,
          stockQuantity: Number(newItem.stockQuantity),
          minStockThreshold: Number(newItem.minStockThreshold),
          description: newItem.description
      };
      savePPEItem(item);
      setShowAddItemModal(false);
      setNewItem({ name: '', category: '', stockQuantity: 0, minStockThreshold: 5, description: '' });
      refreshData();
      alert("New PPE Item Added to Inventory");
  };

  // Alerts
  const lowStockItems = inventory.filter(i => i.stockQuantity <= i.minStockThreshold);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">PPE Management</h2>
           <p className="text-slate-500">Inventory tracking and issuance logs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Link to="/ai-tools" className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium transition-colors">
                <Camera size={18} /> AI PPE Detection
            </Link>
            <button 
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-colors"
            >
                <Settings size={18} /> Categories
            </button>
            <button 
                onClick={() => setShowAddItemModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-colors"
            >
                <Plus size={18} /> Add Item
            </button>
            <button 
                onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
            >
                <HardHat size={18} /> Issue PPE
            </button>
        </div>
      </div>

      {/* AI Alerts Section */}
      {lowStockItems.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-red-100">
                     {loadingAiAlert ? <Loader2 className="animate-spin text-red-500" size={24} /> : <Sparkles className="text-red-500" size={24} />}
                  </div>
                  <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          AI Inventory Monitor
                          {aiAlert && (
                              <span className={`text-xs px-2 py-0.5 rounded-full uppercase border ${
                                  aiAlert.priority === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' : 
                                  'bg-orange-100 text-orange-700 border-orange-200'
                              }`}>
                                  {aiAlert.priority} Priority
                              </span>
                          )}
                      </h4>
                      
                      {loadingAiAlert ? (
                          <p className="text-sm text-slate-500 mt-1 animate-pulse">Analyzing stock levels against safety requirements...</p>
                      ) : aiAlert ? (
                          <div className="mt-2 space-y-2">
                              <p className="text-sm text-slate-700 leading-relaxed">{aiAlert.summary}</p>
                              {aiAlert.recommendations && (
                                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                      {aiAlert.recommendations.map((rec: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-white/50 p-2 rounded border border-red-100">
                                              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {rec}
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </div>
                      ) : (
                          <p className="text-sm text-slate-600 mt-1">
                              Low stock detected for: <b>{lowStockItems.map(i => i.name).join(', ')}</b>. 
                              Restock recommended immediately.
                          </p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'inventory' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Package size={16} /> Inventory
        </button>
        <button 
          onClick={() => setActiveTab('issuance')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'issuance' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList size={16} /> Issuance Logs
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-3">Item Name</th>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3 text-center">Stock Level</th>
                              <th className="px-6 py-3 text-center">Status</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {inventory.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                                  <td className="px-6 py-4 text-slate-500">{item.category}</td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-3">
                                          <button onClick={() => handleStockUpdate(item, item.stockQuantity - 1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">-</button>
                                          <span className="font-bold w-8 text-center">{item.stockQuantity}</span>
                                          <button onClick={() => handleStockUpdate(item, item.stockQuantity + 1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">+</button>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {item.stockQuantity <= item.minStockThreshold ? (
                                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">Low Stock</span>
                                      ) : (
                                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">In Stock</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button className="text-slate-400 hover:text-blue-600" title="View QR Code">
                                          <QrCode size={18} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Issuance Tab */}
      {activeTab === 'issuance' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-3">Worker</th>
                              <th className="px-6 py-3">Item Issued</th>
                              <th className="px-6 py-3">Date Issued</th>
                              <th className="px-6 py-3">Expires</th>
                              <th className="px-6 py-3 text-center">Verification</th>
                              <th className="px-6 py-3 text-center">Status</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {logs.map(log => {
                              const isExpired = log.expiryDate && new Date(log.expiryDate) < new Date() && log.status === 'Active';
                              return (
                                <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${isExpired ? 'bg-red-50/50' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-slate-400" />
                                            {log.workerName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{log.ppeItemName}</td>
                                    <td className="px-6 py-4 text-slate-500">{log.issueDate}</td>
                                    <td className="px-6 py-4">
                                        {log.expiryDate ? (
                                            <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                                {isExpired && <AlertTriangle size={14}/>} {log.expiryDate}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {log.signatureUrl ? (
                                            <span className="text-green-600 flex items-center justify-center gap-1 text-xs font-medium">
                                                <Check size={14} /> Verified
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">No signature</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            log.status === 'Active' ? (isExpired ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700') : 
                                            log.status === 'Returned' ? 'bg-green-100 text-green-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {isExpired && log.status === 'Active' ? 'Overdue' : log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {log.status === 'Active' && (
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleReturnItem(log.id)}
                                                    className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1"
                                                    title="Return to Stock"
                                                >
                                                    <RefreshCcw size={12} /> Return
                                                </button>
                                                <button 
                                                    onClick={() => handleMarkExpired(log)}
                                                    className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1"
                                                    title="Mark as Expired/Disposed"
                                                >
                                                    <XCircle size={12} /> Dispose
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                              );
                          })}
                          {logs.length === 0 && (
                              <tr>
                                  <td colSpan={7} className="p-8 text-center text-slate-400">No issuance logs found.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Add New Item Modal */}
      {showAddItemModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Add Inventory Item</h3>
                      <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleAddItem} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                          <input required type="text" className="w-full border border-slate-300 rounded p-2 text-sm" 
                              value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. 3M Safety Glasses" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                          <select required className="w-full border border-slate-300 rounded p-2 text-sm" 
                              value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                              <option value="">-- Select Category --</option>
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                              <input required type="number" min="0" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                  value={newItem.stockQuantity} onChange={e => setNewItem({...newItem, stockQuantity: parseInt(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Limit</label>
                              <input required type="number" min="1" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                  value={newItem.minStockThreshold} onChange={e => setNewItem({...newItem, minStockThreshold: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                          <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" 
                              value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Specs, size, etc." />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setShowAddItemModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Item</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Manage Categories Modal */}
      {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Manage Categories</h3>
                      <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                  <div className="mb-4">
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                          <input 
                              type="text" 
                              className="flex-1 border border-slate-300 rounded p-2 text-sm"
                              placeholder="New Category Name..."
                              value={newCategory}
                              onChange={e => setNewCategory(e.target.value)}
                          />
                          <button type="submit" className="bg-green-600 text-white px-3 rounded text-sm font-bold hover:bg-green-700">+</button>
                      </form>
                  </div>

                  <div className="max-h-60 overflow-y-auto border-t border-slate-100 pt-2 space-y-2">
                      {categories.map(cat => (
                          <div key={cat} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                              <span className="text-sm text-slate-700 font-medium">{cat}</span>
                              <button onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-red-500" aria-label={`Delete ${cat} category`}>
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Issue PPE to Worker</h3>
                  <form onSubmit={handleIssuePPE} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Select Worker</label>
                          <select 
                              required
                              value={selectedWorkerId}
                              onChange={(e) => setSelectedWorkerId(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          >
                              <option value="">-- Select Worker --</option>
                              {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Select Equipment</label>
                          <select 
                              required
                              value={selectedPPEId}
                              onChange={(e) => setSelectedPPEId(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          >
                              <option value="">-- Select Item --</option>
                              {inventory.map(i => (
                                  <option key={i.id} value={i.id} disabled={i.stockQuantity <= 0}>
                                      {i.name} (Stock: {i.stockQuantity})
                                  </option>
                              ))}
                          </select>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date (Optional)</label>
                          <input 
                              type="date"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Signature / Photo Proof</label>
                          <label className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                              {signatureImage ? (
                                  <img src={signatureImage} alt="Sig" className="h-16 object-contain" />
                              ) : (
                                  <div className="text-center text-slate-400">
                                      <PenTool size={20} className="mx-auto mb-1" />
                                      <span className="text-xs">Upload Signature</span>
                                  </div>
                              )}
                          </label>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button 
                              type="button" 
                              onClick={() => setShowIssueModal(false)}
                              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                              Confirm Issuance
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
