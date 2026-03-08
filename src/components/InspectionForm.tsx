
import React, { useState, useEffect } from 'react';
import { 
  Check, X, Minus, Sparkles, Loader2, Plus, 
  ClipboardCheck, Calendar, MapPin, Printer, Camera, 
  ArrowLeft, FileText, LayoutTemplate, Trash2
} from 'lucide-react';
import { saveInspection, getInspectionTemplates, getInspections, saveInspectionTemplate } from '../services/storageService';
import { suggestInspectionFixAI } from '../services/geminiService';
import { SmartTextInput } from './SmartTextInput';
import { compressImage } from '../services/offlineService';
import { Inspection, InspectionItem, InspectionTemplate } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const InspectionForm: React.FC = () => {
  const { user } = useAuth();
  // Mode: list (dashboard) | create-template | select-template | form (executing) | report (view/print)
  const [view, setView] = useState<'list' | 'create-template' | 'select-template' | 'form' | 'report'>('list');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate | null>(null);
  
  // Create Template State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('General');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateItems, setNewTemplateItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState('');

  // Execution State
  const [currentInspection, setCurrentInspection] = useState<Partial<Inspection>>({});
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [location, setLocation] = useState('');
  
  // AI & Upload State
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setInspections(await getInspections());
      setTemplates(await getInspectionTemplates());
    };
    load();
  }, [view]);

  // --- Handlers ---

  const handleStartNew = () => {
    setView('select-template');
  };

  const handleCreateTemplate = () => {
      // Initialize Create Form
      setNewTemplateName('');
      setNewTemplateCategory('General');
      setNewTemplateDesc('');
      setNewTemplateItems([]);
      setNewItemInput('');
      setView('create-template');
  };

  const handleAddItemToTemplate = () => {
      if (newItemInput.trim()) {
          setNewTemplateItems([...newTemplateItems, newItemInput.trim()]);
          setNewItemInput('');
      }
  };

  const handleRemoveItemFromTemplate = (index: number) => {
      setNewTemplateItems(newTemplateItems.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async () => {
      if (!newTemplateName.trim()) return toast.error("Template Name is required");
      if (newTemplateItems.length === 0) return toast.error("Add at least one inspection item");

      const template: InspectionTemplate = {
          id: `tmpl-${Date.now()}`,
          name: newTemplateName,
          category: newTemplateCategory,
          description: newTemplateDesc || 'Custom Template',
          items: newTemplateItems
      };

      await saveInspectionTemplate(template);
      toast.success("Template Created Successfully!");
      setView('select-template'); // Go back to selection
  };

  const handleSelectTemplate = (template: InspectionTemplate) => {
    setSelectedTemplate(template);
    setItems(template.items.map((q, idx) => ({
        id: `item-${idx}`,
        question: q,
        response: 'NA',
        photos: []
    })));
    setCurrentInspection({
        id: `insp-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        date: new Date().toISOString(),
        inspector: user?.name || 'Unknown',
    });
    setView('form');
  };

  const handleResponse = (id: string, response: 'Pass' | 'Fail' | 'NA') => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, response } : item
    ));
    // Clear suggestions if passing
    if (response !== 'Fail' && suggestions[id]) {
      const newSugg = { ...suggestions };
      delete newSugg[id];
      setSuggestions(newSugg);
    }
  };

  const handlePhotoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadingItem(itemId);
          try {
            // Compress Image for offline storage efficiency
            const compressed = await compressImage(file);
            setItems(prev => prev.map(item => {
                  if (item.id === itemId) {
                      return { ...item, photos: [...(item.photos || []), compressed] };
                  }
                  return item;
              }));
          } catch (err) {
              console.error("Compression failed", err);
              toast.error("Photo upload failed");
          } finally {
              setUploadingItem(null);
          }
      }
  };

  const handleCommentChange = (id: string, comment: string) => {
      setItems(prev => prev.map(item => 
          item.id === id ? { ...item, comment } : item
      ));
  };

  const handleGetSuggestion = async (item: InspectionItem) => {
    setLoadingSuggestion(item.id);
    try {
      const suggestion = await suggestInspectionFixAI(item.question, item.comment);
      setSuggestions(prev => ({ ...prev, [item.id]: suggestion }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuggestion(null);
    }
  };

  const calculateScore = () => {
      const totalApplicable = items.filter(i => i.response !== 'NA').length;
      if (totalApplicable === 0) return 100;
      const passed = items.filter(i => i.response === 'Pass').length;
      return Math.round((passed / totalApplicable) * 100);
  };

  const handleSubmit = async () => {
    if (!location) {
        toast.error("Please enter a location.");
        return;
    }
    const score = calculateScore();
    const finalInspection: Inspection = {
        ...currentInspection as Inspection,
        title: `${currentInspection.templateName} - ${location}`,
        location: location,
        items: items,
        score: score,
        completed: true
    };
    await saveInspection(finalInspection);
    
    setCurrentInspection(finalInspection); // Set for report view
    toast.success("Inspection completed and saved.");
    setView('report');
  };

  const handleViewReport = (inspection: Inspection) => {
      setCurrentInspection(inspection);
      setItems(inspection.items);
      setView('report');
  };

  // --- Views ---

  const renderList = () => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Inspections & Audits</h2>
                <p className="text-slate-500">Scheduled inspections, daily checks, and compliance audits.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handleCreateTemplate} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
                    <LayoutTemplate size={18} /> Templates
                </button>
                <button onClick={handleStartNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                    <Plus size={18} /> New Inspection
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inspections.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                    <ClipboardCheck size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No inspections completed yet.</p>
                    <button onClick={handleStartNew} className="text-blue-600 font-medium mt-2 hover:underline">Start your first audit</button>
                </div>
            ) : (
                inspections.map(insp => (
                    <div key={insp.id} onClick={() => handleViewReport(insp)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${insp.score >= 80 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <ClipboardCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 line-clamp-1">{insp.templateName}</h3>
                                    <p className="text-xs text-slate-500">{new Date(insp.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className={`text-lg font-bold ${insp.score >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                                {insp.score}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                             <MapPin size={14} /> {insp.location}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div className={`h-1.5 rounded-full ${insp.score >= 80 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${insp.score}%` }}></div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );

  const renderCreateTemplate = () => (
      <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">Create New Template</h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Template Name</label>
                      <input 
                          type="text" 
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                          placeholder="e.g. Forklift Pre-Start"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                      <select 
                          value={newTemplateCategory}
                          onChange={(e) => setNewTemplateCategory(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                      >
                          <option>General</option>
                          <option>Construction</option>
                          <option>Logistics</option>
                          <option>Facilities</option>
                          <option>Permits</option>
                          <option>Equipment</option>
                      </select>
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                  <SmartTextInput 
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      onValueChange={setNewTemplateDesc}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                      placeholder="Brief description of this inspection..."
                  />
              </div>

              <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Checklist Items</label>
                  <div className="flex gap-2 mb-3">
                      <SmartTextInput 
                          value={newItemInput}
                          onChange={(e) => setNewItemInput(e.target.value)}
                          onValueChange={setNewItemInput}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddItemToTemplate()}
                          className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm"
                          placeholder="Add a new question..."
                      />
                      <button 
                          onClick={handleAddItemToTemplate}
                          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200"
                      >
                          Add
                      </button>
                  </div>

                  <div className="space-y-2">
                      {newTemplateItems.length === 0 ? (
                          <p className="text-center text-slate-400 py-4 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">No items added yet.</p>
                      ) : (
                          newTemplateItems.map((item, index) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                  <span className="text-sm text-slate-700">{index + 1}. {item}</span>
                                  <button onClick={() => handleRemoveItemFromTemplate(index)} className="text-slate-400 hover:text-red-500">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              <div className="flex justify-end pt-4">
                  <button 
                      onClick={handleSaveTemplate}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
                  >
                      Save Template
                  </button>
              </div>
          </div>
      </div>
  );

  const renderTemplateSelect = () => (
      <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">Select Inspection Type</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(tmpl => (
                  <div key={tmpl.id} onClick={() => handleSelectTemplate(tmpl)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 cursor-pointer transition-all">
                      <div className="flex justify-between items-start mb-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{tmpl.category}</span>
                          <LayoutTemplate size={20} className="text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{tmpl.name}</h3>
                      <p className="text-sm text-slate-500 h-10 line-clamp-2">{tmpl.description}</p>
                      <div className="mt-4 text-xs font-medium text-blue-600 flex items-center gap-1">
                          {tmpl.items.length} Checkpoints <ArrowRightIcon size={12}/>
                      </div>
                  </div>
              ))}
              
              {/* Shortcut to create new */}
              <div onClick={handleCreateTemplate} className="border-2 border-dashed border-slate-300 p-6 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-400 cursor-pointer transition-colors">
                  <Plus size={32} className="mb-2 opacity-50" />
                  <span className="font-medium">Create Custom Template</span>
              </div>
          </div>
      </div>
  );

  const renderForm = () => {
      const score = calculateScore();
      return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('select-template')} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800">{currentInspection.templateName}</h2>
                        <p className="text-xs text-slate-500">
                             {items.filter(i => i.response !== 'NA').length} checks • {items.filter(i => i.response === 'Fail').length} issues
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-xs text-slate-400 uppercase font-bold">Current Score</span>
                    <span className={`text-2xl font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                        {score}%
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                 <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Inspection Location / Asset ID</label>
                     <div className="relative">
                        <SmartTextInput 
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onValueChange={setLocation}
                            placeholder="e.g. Building 4, Truck #55, West Gate..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <MapPin size={18} className="absolute left-3 top-2.5 text-slate-400" />
                     </div>
                 </div>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50/50 border-b border-slate-100">
                            <div className="flex-1">
                                <span className="text-slate-400 text-xs font-mono mr-2">#{index + 1}</span>
                                <span className="font-medium text-slate-800">{item.question}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                <button
                                    onClick={() => handleResponse(item.id, 'Pass')}
                                    className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm font-bold transition-all ${
                                        item.response === 'Pass' ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <Check size={14} /> Pass
                                </button>
                                <button
                                    onClick={() => handleResponse(item.id, 'Fail')}
                                    className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm font-bold transition-all ${
                                        item.response === 'Fail' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <X size={14} /> Fail
                                </button>
                                <button
                                    onClick={() => handleResponse(item.id, 'NA')}
                                    className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm font-bold transition-all ${
                                        item.response === 'NA' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <Minus size={14} /> N/A
                                </button>
                            </div>
                        </div>

                        {/* Expanded Area for Fail or Photos */}
                        <div className="p-4 space-y-4">
                            {/* Photo Row */}
                            <div className="flex flex-wrap gap-2 items-center">
                                {item.photos?.map((photo, i) => (
                                    <img key={i} src={photo} alt="evidence" className="w-16 h-16 object-cover rounded border border-slate-200" />
                                ))}
                                <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded text-slate-400 hover:bg-slate-50 hover:border-slate-400 cursor-pointer transition-colors relative">
                                    {uploadingItem === item.id ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Camera size={20} />}
                                    <span className="text-[10px] mt-1">Add</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e)} disabled={uploadingItem === item.id} />
                                </label>
                            </div>

                            {/* Comment Area (Mandatory if Fail) */}
                            {item.response === 'Fail' && (
                                <div className="animate-in fade-in slide-in-from-top-1">
                                    <textarea 
                                        className="w-full text-sm p-3 border border-red-200 bg-red-50 rounded-lg focus:ring-1 focus:ring-red-500 outline-none placeholder:text-red-300"
                                        placeholder="Describe the non-conformance..."
                                        rows={2}
                                        value={item.comment || ''}
                                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                    />
                                    
                                    {/* AI Assist */}
                                    <div className="mt-2 flex items-start gap-2">
                                        {!suggestions[item.id] ? (
                                            <button 
                                                onClick={() => handleGetSuggestion(item)}
                                                disabled={loadingSuggestion === item.id}
                                                className="text-xs flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded border border-purple-100"
                                            >
                                                {loadingSuggestion === item.id ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                                                AI Suggest Fix
                                            </button>
                                        ) : (
                                            <div className="flex-1 bg-purple-50 p-2 rounded text-sm text-purple-900 border border-purple-100 flex gap-2">
                                                <Sparkles size={14} className="shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold text-xs uppercase mb-1 block">AI Suggestion:</span>
                                                    <span>{suggestions[item.id]}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4 pb-12">
                <button 
                    onClick={handleSubmit}
                    className="bg-slate-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2"
                >
                    <Check size={20} /> Complete & Sign
                </button>
            </div>
        </div>
      );
  };

  const renderReport = () => (
      <div className="max-w-4xl mx-auto pb-10 print:max-w-none print:pb-0">
          <div className="flex items-center justify-between mb-6 print:hidden">
              <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                  <ArrowLeft size={18} /> Back to Dashboard
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                  <Printer size={18} /> Print PDF
              </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:shadow-none print:border-0 print:p-0">
               {/* Header */}
               <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Inspection Report</h1>
                        <p className="text-slate-500 mt-1">Safedify HSE Platform</p>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${currentInspection.score! >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                            {currentInspection.score}%
                        </div>
                        <p className="text-sm font-semibold text-slate-400 uppercase">Compliance Score</p>
                    </div>
               </div>

               {/* Meta Data */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-4 bg-slate-50 rounded-lg print:bg-white print:border print:border-slate-200">
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Inspection Type</span>
                        <span className="font-medium text-slate-900">{currentInspection.templateName}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Location</span>
                        <span className="font-medium text-slate-900">{currentInspection.location}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Date</span>
                        <span className="font-medium text-slate-900">{new Date(currentInspection.date!).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Inspector</span>
                        <span className="font-medium text-slate-900">{currentInspection.inspector}</span>
                    </div>
               </div>

               {/* Failed Items Summary */}
               {items.some(i => i.response === 'Fail') && (
                   <div className="mb-8 border border-red-200 rounded-lg overflow-hidden">
                       <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                           <h3 className="text-sm font-bold text-red-800 uppercase flex items-center gap-2">
                               <X size={16} /> Non-Conformance Summary
                           </h3>
                       </div>
                       <div className="p-4 space-y-3">
                           {items.filter(i => i.response === 'Fail').map(item => (
                               <div key={item.id} className="text-sm text-red-900">
                                   <p className="font-bold">• {item.question}</p>
                                   <p className="pl-3 text-red-700 italic">"{item.comment}"</p>
                               </div>
                           ))}
                       </div>
                   </div>
               )}

               {/* Full Checklist */}
               <div className="mb-8">
                   <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 border-b border-slate-200 pb-2">Full Checklist Detail</h3>
                   <div className="space-y-4">
                       {items.map((item, idx) => (
                           <div key={item.id} className="flex flex-col gap-2 border-b border-slate-100 pb-4 last:border-0 print:break-inside-avoid">
                               <div className="flex justify-between items-start">
                                   <div className="flex-1 pr-4">
                                       <span className="text-xs text-slate-400 mr-2">{idx + 1}.</span>
                                       <span className="text-sm font-medium text-slate-800">{item.question}</span>
                                   </div>
                                   <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                                       item.response === 'Pass' ? 'bg-green-50 text-green-700 border-green-200' :
                                       item.response === 'Fail' ? 'bg-red-50 text-red-700 border-red-200' :
                                       'bg-slate-50 text-slate-500 border-slate-200'
                                   }`}>
                                       {item.response}
                                   </span>
                               </div>
                               {item.photos && item.photos.length > 0 && (
                                   <div className="flex gap-2 pl-6">
                                       {item.photos.map((p, i) => (
                                           <img key={i} src={p} className="w-16 h-16 object-cover rounded border border-slate-200" />
                                       ))}
                                   </div>
                               )}
                           </div>
                       ))}
                   </div>
               </div>

               {/* Footer Signatures */}
               <div className="grid grid-cols-2 gap-12 mt-12 print:break-inside-avoid">
                    <div className="border-t border-slate-300 pt-2">
                        <p className="text-sm font-bold text-slate-800">Inspector Signature</p>
                        <p className="text-xs text-slate-500 mt-1">{currentInspection.inspector}</p>
                        <p className="text-xs text-slate-500">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="border-t border-slate-300 pt-2">
                        <p className="text-sm font-bold text-slate-800">Reviewer Signature</p>
                        <p className="text-xs text-slate-500 mt-1">(Manager Review)</p>
                    </div>
               </div>
          </div>
      </div>
  );

  return (
    <div>
        {view === 'list' && renderList()}
        {view === 'create-template' && renderCreateTemplate()}
        {view === 'select-template' && renderTemplateSelect()}
        {view === 'form' && renderForm()}
        {view === 'report' && renderReport()}
    </div>
  );
};

// Helper for icon
const ArrowRightIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);
