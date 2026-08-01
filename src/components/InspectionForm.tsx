
import React, { useState, useEffect } from 'react';
import { 
  Check, X, Minus, Sparkles, Loader2, Plus, 
  ClipboardCheck, Calendar, MapPin, Printer, Camera, 
  ArrowLeft, FileText, LayoutTemplate, Trash2
} from 'lucide-react';
import { saveInspection, getInspectionTemplates, getInspections, saveInspectionTemplate, saveAction } from '../services/storageService';
import { suggestInspectionFixAI } from '../services/geminiService';
import { compressImage, addToSyncQueue } from '../services/offlineService';
import { Inspection, InspectionItem, InspectionTemplate, ActionItem } from '../types';

export const InspectionForm: React.FC = () => {
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
    setInspections(getInspections());
    setTemplates(getInspectionTemplates());
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

  const handleSaveTemplate = () => {
      if (!newTemplateName.trim()) return alert("Template Name is required");
      if (newTemplateItems.length === 0) return alert("Add at least one inspection item");

      const template: InspectionTemplate = {
          id: `tmpl-${Date.now()}`,
          name: newTemplateName,
          category: newTemplateCategory,
          description: newTemplateDesc || 'Custom Template',
          items: newTemplateItems
      };

      saveInspectionTemplate(template);
      alert("Template Created Successfully!");
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
        inspector: 'Current User', // Mock
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
              alert("Photo upload failed");
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

  const handleSubmit = () => {
    if (!location) {
        alert("Please enter a location.");
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
    saveInspection(finalInspection);
    addToSyncQueue('SAVE_INSPECTION', `Inspection: ${finalInspection.title}`);

    // Auto-create CAPA if inspection score is below 70%
    if (score < 70) {
      const inspector = (finalInspection as any).inspector || 'HSE Team';
      const autoCapa: ActionItem = {
        id: `capa-${Date.now()}`,
        type: 'Corrective',
        source: 'Inspection',
        title: `Inspection follow-up: ${finalInspection.title} (Score: ${score}%)`,
        description: `Inspection scored ${score}%, which is below the 70% pass threshold. Review and address all failed items.`,
        assignee: inspector,
        priority: score < 50 ? 'High' : 'Medium',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'Open',
        relatedInspectionId: finalInspection.id,
        createdAt: new Date().toISOString(),
      };
      saveAction(autoCapa);
      addToSyncQueue('SAVE_ACTION', `Auto-CAPA for inspection score ${score}%`);
    }

    setCurrentInspection(finalInspection);
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
                <button onClick={handleCreateTemplate} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2" aria-label="Manage inspection templates">
                    <LayoutTemplate size={18} /> Templates
                </button>
                <button onClick={handleStartNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2" aria-label="Start new inspection">
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
                  <input 
                      type="text" 
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                      placeholder="Brief description of this inspection..."
                  />
              </div>

              <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Checklist Items</label>
                  <div className="flex gap-2 mb-3">
                      <input 
                          type="text" 
                          value={newItemInput}
                          onChange={(e) => setNewItemInput(e.target.value)}
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
                        <input 
                            type="text" 
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
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
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e)} disabled={uploadingItem === item.id} aria-label="Upload photo evidence for inspection item" />
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
                    aria-label="Complete and sign inspection"
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
              <button onClick={() => {
                const insp = currentInspection;
                const now = new Date();
                const docNum = `INS-${insp.id?.split('-').pop()?.slice(-6).toUpperCase() || '000001'}`;
                const scoreColor = insp.score! >= 80 ? '#16a34a' : insp.score! >= 60 ? '#ca8a04' : '#dc2626';
                const scoreLabel = insp.score! >= 80 ? 'PASS' : insp.score! >= 60 ? 'CAUTION' : 'FAIL';
                const failedItems = items.filter(i => i.response === 'Fail');
                const checklistRows = items.map((item, idx) => {
                  const resColor = item.response === 'Pass' ? '#16a34a' : item.response === 'Fail' ? '#dc2626' : '#64748b';
                  const resBg = item.response === 'Pass' ? '#f0fdf4' : item.response === 'Fail' ? '#fef2f2' : '#f8fafc';
                  return `<tr style="break-inside:avoid;page-break-inside:avoid;">
                    <td style="text-align:center;color:#64748b;font-size:11px;padding:8px 6px;border:1px solid #e2e8f0;width:4%;">${idx+1}</td>
                    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#1e293b;line-height:1.5;">${item.question}</td>
                    <td style="text-align:center;padding:8px 6px;border:1px solid #e2e8f0;width:10%;">
                      <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:0.5px;background:${resBg};color:${resColor};border:1.5px solid ${resColor};">${item.response}</span>
                    </td>
                    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;font-style:${item.comment ? 'italic' : 'normal'};">${item.comment || '—'}</td>
                  </tr>`;
                }).join('');
                const ncHTML = failedItems.length > 0 ? `
                  <div style="margin-bottom:20px;border:1.5px solid #fecaca;border-radius:8px;overflow:hidden;">
                    <div style="background:#fef2f2;padding:8px 14px;border-bottom:1px solid #fecaca;">
                      <span style="font-size:12px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">⚠ Non-Conformance Items — Immediate Action Required</span>
                    </div>
                    <div style="padding:12px 14px;">${failedItems.map((fi,i) => `<div style="margin-bottom:8px;"><span style="font-size:11px;font-weight:700;color:#1e293b;">${i+1}. ${fi.question}</span>${fi.comment ? `<div style="font-size:11px;color:#dc2626;margin-top:2px;padding-left:16px;font-style:italic;">Inspector note: "${fi.comment}"</div>` : ''}</div>`).join('')}</div>
                  </div>` : '';
                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Inspection Report — ${insp.title}</title><style>@page{size:A4 portrait;margin:18mm 15mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;background:#fff;}.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:5px;background:#fff;}</style></head><body>
                  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:3px solid #0f172a;margin-bottom:18px;position:relative;">
                    <div><div style="font-size:22px;font-weight:800;color:#0f172a;">Safedify</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">HSE Management Platform</div></div>
                    <div style="text-align:right;"><div style="font-size:18px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;">Inspection Report</div><div style="font-size:11px;color:#64748b;margin-top:2px;">${docNum}</div></div>
                    <div style="position:absolute;top:0;right:0;border:2.5px solid ${scoreColor};border-radius:8px;padding:6px 14px;text-align:center;transform:rotate(-4deg);opacity:0.9;"><div style="font-size:24px;font-weight:900;color:${scoreColor};">${insp.score}%</div><div style="font-size:10px;font-weight:800;color:${scoreColor};letter-spacing:2px;">${scoreLabel}</div></div>
                  </div>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
                    <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;width:22%;">Inspection Title</td><td colspan="3" style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;font-size:13px;">${insp.title}</td></tr>
                    <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Template</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${insp.templateName}</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Document No.</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${docNum}</td></tr>
                    <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Location</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${insp.location}</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Date</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${new Date(insp.date).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</td></tr>
                    <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Inspector</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${insp.inspector}</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Compliance Score</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:800;color:${scoreColor};font-size:15px;">${insp.score}% — ${scoreLabel}</td></tr>
                    <tr><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Pass</td><td style="padding:7px 10px;border:1px solid #e2e8f0;color:#16a34a;font-weight:700;">${items.filter(i=>i.response==='Pass').length} items</td><td style="font-weight:700;color:#475569;background:#f8fafc;padding:7px 10px;border:1px solid #e2e8f0;">Fail / N/A</td><td style="padding:7px 10px;border:1px solid #e2e8f0;color:#dc2626;font-weight:700;">${failedItems.length} failed · ${items.filter(i=>i.response==='NA').length} N/A</td></tr>
                  </table>
                  ${ncHTML}
                  <div style="font-size:13px;font-weight:700;padding:8px 12px;background:#1e3a5f;color:#fff;border-radius:4px 4px 0 0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0;">Checklist — Full Detail</div>
                  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;margin-bottom:20px;">
                    <thead><tr style="background:#1e3a5f;"><th style="color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:8px 6px;border:1px solid #2d4f80;text-align:center;width:4%;">#</th><th style="color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:8px 10px;border:1px solid #2d4f80;text-align:left;">Inspection Item / Question</th><th style="color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:8px 6px;border:1px solid #2d4f80;text-align:center;width:10%;">Result</th><th style="color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:8px 10px;border:1px solid #2d4f80;text-align:left;width:28%;">Inspector Comment</th></tr></thead>
                    <tbody>${checklistRows}</tbody>
                  </table>
                  <div style="margin-top:20px;border-top:2px solid #e2e8f0;padding-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
                    <div><div style="border-top:1px solid #334155;padding-top:6px;"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Inspector</div><div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;">${insp.inspector}</div><div style="font-size:10px;color:#94a3b8;">Date: ${new Date(insp.date).toLocaleDateString('en-GB')}</div><div style="height:32px;"></div></div></div>
                    <div><div style="border-top:1px solid #334155;padding-top:6px;"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Reviewed By</div><div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;">&nbsp;</div><div style="font-size:10px;color:#94a3b8;">Date: ___________</div><div style="height:32px;"></div></div></div>
                    <div><div style="border-top:1px solid #334155;padding-top:6px;"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">HSE Approved By</div><div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;">&nbsp;</div><div style="font-size:10px;color:#94a3b8;">Date: ___________</div><div style="height:32px;"></div></div></div>
                  </div>
                  <div class="footer">Safedify HSE Platform &nbsp;|&nbsp; ${docNum} &nbsp;|&nbsp; Generated: ${now.toLocaleString()} &nbsp;|&nbsp; CONFIDENTIAL</div>
                </body></html>`;
                const win = window.open('','_blank','width=900,height=700'); if(!win){alert('Allow popups to generate PDF.');return;}
                win.document.write(html); win.document.close(); win.focus(); setTimeout(()=>win.print(),600);
              }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
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
