
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, MapPin, User, AlertTriangle, 
  ClipboardList, CheckSquare, BrainCircuit, Save, Plus, Trash2, Loader2, Target, GitBranch, Upload, X, Image as ImageIcon, Link as LinkIcon, CheckCircle2, Volume2
} from 'lucide-react';
import { getIncidentById, getActions, saveAction, updateIncident, updateAction } from '../services/storageService';
import { analyzeRootCauseAI, generateSpeechAI, playGeneratedAudio } from '../services/geminiService';
import { addToSyncQueue } from '../services/offlineService';
import { Incident, ActionItem, IncidentSeverity } from '../types';

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'investigation' | 'capa'>('overview');
  
  // Investigation State
  const [investigationMethod, setInvestigationMethod] = useState<'5-Why' | 'Fishbone'>('5-Why');
  const [whys, setWhys] = useState<string[]>(['', '', '', '', '']);
  const [fishbone, setFishbone] = useState({
    man: '',
    machine: '',
    method: '',
    material: '',
    environment: ''
  });
  const [rootCause, setRootCause] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [markAsClosed, setMarkAsClosed] = useState(true);

  // Action State
  const [showActionForm, setShowActionForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableActions, setAvailableActions] = useState<ActionItem[]>([]);
  const [newAction, setNewAction] = useState({ 
    title: '', 
    assignee: '', 
    priority: 'Medium',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Default tomorrow
  });

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (id) {
      const inc = getIncidentById(id);
      setIncident(inc);
      const allActions = getActions();
      setActions(allActions.filter(a => a.relatedIncidentId === id));

      if (inc?.investigation) {
        setInvestigationMethod(inc.investigation.method);
        setRootCause(inc.investigation.rootCause);

        if (inc.investigation.method === '5-Why' && inc.investigation.whys) {
          const loadedWhys = inc.investigation.whys;
          const paddedWhys = [...loadedWhys, '', '', '', '', ''].slice(0, 5);
          setWhys(paddedWhys);
        }
        
        if (inc.investigation.method === 'Fishbone' && inc.investigation.categories) {
          setFishbone({
            man: inc.investigation.categories.man || '',
            machine: inc.investigation.categories.machine || '',
            method: inc.investigation.categories.method || '',
            material: inc.investigation.categories.material || '',
            environment: inc.investigation.categories.environment || ''
          });
        }

        if (inc.investigation.evidence) {
          setEvidence(inc.investigation.evidence);
        } else {
          setEvidence([]);
        }
        
        // If investigation exists, default markAsClosed based on current status
        setMarkAsClosed(inc.status === 'Closed');
      }
    }
  }, [id]);

  const handleReadAloud = async () => {
      if (!incident || isSpeaking) return;
      setIsSpeaking(true);
      try {
          // Construct a natural reading script
          const script = `Incident Report. ${incident.type}, Severity ${incident.severity}. 
          Location: ${incident.location}. 
          Description: ${incident.description}. 
          ${incident.aiClassification ? `AI Analysis: ${incident.aiClassification.reasoning}` : ''}`;

          const audioData = await generateSpeechAI(script);
          if (audioData) {
              await playGeneratedAudio(audioData);
          }
      } catch (e) {
          console.error("TTS Error", e);
          alert("Unable to play audio briefing.");
      } finally {
          setIsSpeaking(false);
      }
  };

  const handleAIAnalysis = async () => {
    if (!incident) return;
    setIsAnalyzing(true);
    try {
      // Call Gemini Service for Root Cause Analysis
      const result = await analyzeRootCauseAI(incident.description, incident.type, investigationMethod);
      
      if (investigationMethod === '5-Why') {
        const aiWhys = result.whys || [];
        const paddedWhys = [...aiWhys, '', '', '', '', ''].slice(0, 5);
        setWhys(paddedWhys);
      } else {
        if (result.categories) {
          setFishbone({
            man: result.categories.man || '',
            machine: result.categories.machine || '',
            method: result.categories.method || '',
            material: result.categories.material || '',
            environment: result.categories.environment || ''
          });
        }
      }

      if (result.rootCause) setRootCause(result.rootCause);
    } catch (e) {
      console.error(e);
      alert("AI Analysis failed. Please try again or check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setEvidence(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvestigation = async () => {
    if (!incident) return;
    if (!rootCause.trim()) {
        alert("Please identify a Root Cause before saving.");
        return;
    }

    setIsSaving(true);
    
    // Simulate a small network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const updatedIncident: Incident = {
      ...incident,
      status: markAsClosed ? 'Closed' : 'Investigating',
      investigation: {
        method: investigationMethod,
        whys: investigationMethod === '5-Why' ? whys : undefined,
        categories: investigationMethod === 'Fishbone' ? fishbone : undefined,
        rootCause,
        evidence: evidence,
        completedBy: 'Current User',
        completedAt: new Date().toISOString()
      }
    };
    
    updateIncident(updatedIncident);
    addToSyncQueue('UPDATE_INCIDENT', `Updated Investigation: ${incident.id}`);
    
    setIncident(updatedIncident);
    setIsSaving(false);
    alert(`Investigation saved.${markAsClosed ? ' Incident marked as Closed.' : ''}`);
  };

  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    
    const action: ActionItem = {
      id: `act-${Date.now()}`,
      title: newAction.title,
      assignee: newAction.assignee,
      dueDate: newAction.dueDate,
      priority: newAction.priority as any,
      status: 'Open',
      relatedIncidentId: incident.id
    };

    saveAction(action);
    addToSyncQueue('SAVE_ACTION', `New Action: ${action.title}`);
    
    setActions([...actions, action]);
    setShowActionForm(false);
    setNewAction({ 
        title: '', 
        assignee: '', 
        priority: 'Medium',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });
  };

  const handleActionStatusChange = (action: ActionItem, newStatus: 'Open' | 'In Progress' | 'Done') => {
    const updatedAction: ActionItem = { ...action, status: newStatus };
    updateAction(updatedAction);
    addToSyncQueue('UPDATE_ACTION', `Updated Action Status: ${action.title} -> ${newStatus}`);
    
    setActions(prev => prev.map(a => a.id === action.id ? updatedAction : a));
  };

  const fetchAvailableActions = () => {
    const all = getActions();
    setAvailableActions(all.filter(a => !a.relatedIncidentId));
    setShowLinkModal(true);
    setShowActionForm(false);
  };

  const handleLinkAction = (actionId: string) => {
    if (!incident) return;
    const actionToLink = availableActions.find(a => a.id === actionId);
    if (actionToLink) {
      const updated = { ...actionToLink, relatedIncidentId: incident.id };
      updateAction(updated);
      addToSyncQueue('UPDATE_ACTION', `Linked Action: ${updated.title}`);
      
      setActions(prev => [...prev, updated]);
      setAvailableActions(prev => prev.filter(a => a.id !== actionId));
    }
  };

  if (!incident) {
    return <div className="p-8 text-center text-slate-500">Incident not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link to="/incidents" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800">Incident #{incident.id.split('-')[1]}</h1>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                incident.status === 'Open' ? 'bg-red-100 text-red-700' : 
                incident.status === 'Investigating' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>
                {incident.status}
                </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Reported on {new Date(incident.date).toLocaleDateString()}</p>
            </div>
        </div>
        <button 
            onClick={handleReadAloud}
            disabled={isSpeaking}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                isSpeaking 
                ? 'bg-purple-100 text-purple-700 animate-pulse' 
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
        >
            {isSpeaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
            {isSpeaking ? 'Playing Brief...' : 'Play Audio Brief'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          aria-label="View incident overview tab"
        >
          <ClipboardList size={16} /> Overview
        </button>
        <button 
          onClick={() => setActiveTab('investigation')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'investigation' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Target size={16} /> Investigation
        </button>
        <button 
          onClick={() => setActiveTab('capa')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'capa' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <CheckSquare size={16} /> CAPA ({actions.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-slate-200 p-6 min-h-[400px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Description</h3>
                <p className="text-slate-800 text-lg leading-relaxed">{incident.description}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-slate-400" />
                  <div>
                    <span className="block text-xs text-slate-500">Location</span>
                    <span className="font-medium text-slate-800">{incident.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-slate-400" />
                  <div>
                    <span className="block text-xs text-slate-500">Type & Severity</span>
                    <span className="font-medium text-slate-800">{incident.type} • {incident.severity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User size={18} className="text-slate-400" />
                  <div>
                    <span className="block text-xs text-slate-500">Reported By</span>
                    <span className="font-medium text-slate-800">{incident.reporter}</span>
                  </div>
                </div>
              </div>
            </div>

            {incident.images.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Evidence</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {incident.images.map((img, i) => (
                    <img key={i} src={img} alt="Evidence" className="h-32 w-auto rounded-lg border border-slate-200 shadow-sm" />
                  ))}
                </div>
              </div>
            )}

            {incident.aiClassification && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex items-start gap-3">
                  <BrainCircuit className="text-purple-600 mt-1 shrink-0" size={20} />
                  <div className="w-full">
                    <h4 className="font-semibold text-purple-900">AI Analysis</h4>
                    <p className="text-sm text-purple-800 mt-1">{incident.aiClassification.reasoning}</p>
                    <p className="text-xs text-purple-600 mt-2 font-mono mb-4">Confidence: {(incident.aiClassification.confidence * 100).toFixed(0)}%</p>
                    
                    {(incident.aiClassification.causes?.length || incident.aiClassification.contributingFactors?.length) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-purple-100 pt-3 mt-1">
                            {incident.aiClassification.causes && incident.aiClassification.causes.length > 0 && (
                                <div>
                                    <span className="text-xs font-bold text-purple-800 uppercase block mb-2">Likely Causes</span>
                                    <div className="flex flex-wrap gap-2">
                                        {incident.aiClassification.causes.map((item, idx) => (
                                            <span key={idx} className="bg-white text-purple-700 border border-purple-200 text-xs px-2 py-1 rounded-md shadow-sm">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {incident.aiClassification.contributingFactors && incident.aiClassification.contributingFactors.length > 0 && (
                                <div>
                                    <span className="text-xs font-bold text-purple-800 uppercase block mb-2">Contributing Factors</span>
                                    <div className="flex flex-wrap gap-2">
                                        {incident.aiClassification.contributingFactors.map((item, idx) => (
                                            <span key={idx} className="bg-white text-purple-700 border border-purple-200 text-xs px-2 py-1 rounded-md shadow-sm">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVESTIGATION TAB */}
        {activeTab === 'investigation' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
              <h3 className="text-lg font-bold text-slate-800">Root Cause Analysis</h3>
              <div className="flex gap-2">
                 <select 
                    value={investigationMethod}
                    onChange={(e) => setInvestigationMethod(e.target.value as any)}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                 >
                    <option value="5-Why">5-Why Method</option>
                    <option value="Fishbone">Fishbone (Ishikawa)</option>
                 </select>
                 <button 
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-70"
                 >
                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                    Auto-Analyze
                 </button>
              </div>
            </div>

            {investigationMethod === '5-Why' ? (
                <div className="space-y-4">
                    {whys.map((why, index) => (
                        <div key={index} className="flex gap-3 relative">
                            {/* Connector Line */}
                            {index < 4 && (
                                <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-slate-300 -z-10 flex flex-col justify-end items-center">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mb-[-2px]"></div> 
                                </div>
                            )}
                            
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0 mt-1 border border-slate-200 shadow-sm">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    {index === 0 ? "Problem Statement (Why did it happen?)" : `Why did Reason ${index} happen?`}
                                </label>
                                <input 
                                    type="text" 
                                    value={why}
                                    onChange={(e) => {
                                        const newWhys = [...whys];
                                        newWhys[index] = e.target.value;
                                        setWhys(newWhys);
                                    }}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder={index === 0 ? "e.g. Worker slipped on floor" : `Cause of reason #${index}...`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Fishbone Diagram Inputs */}
                    {[
                      { key: 'man', label: 'Man (People)', icon: User },
                      { key: 'machine', label: 'Machine (Equipment)', icon: GitBranch },
                      { key: 'method', label: 'Method (Process)', icon: ClipboardList },
                      { key: 'material', label: 'Material', icon: Target },
                      { key: 'environment', label: 'Environment', icon: MapPin }
                    ].map((category) => (
                      <div key={category.key} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                         <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2 uppercase">
                            <category.icon size={14} /> {category.label}
                         </label>
                         <textarea 
                            rows={3}
                            value={fishbone[category.key as keyof typeof fishbone]}
                            onChange={(e) => setFishbone({...fishbone, [category.key]: e.target.value})}
                            className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-slate-400 outline-none resize-none bg-white"
                            placeholder={`Causes related to ${category.label.split('(')[0].trim()}...`}
                         />
                      </div>
                    ))}
                </div>
            )}

            <div className="pt-6 border-t border-slate-100">
                {/* Enhanced Root Cause Section */}
                <div className="bg-red-50 p-6 rounded-xl border border-red-200 relative overflow-hidden shadow-sm">
                    <div className="absolute -right-6 -top-6 text-red-100">
                        <Target size={120} />
                    </div>
                    
                    <label className="block text-base font-bold text-red-900 mb-3 flex items-center gap-2 relative z-10">
                        <Target size={20} className="text-red-600" />
                        Root Cause Conclusion
                    </label>
                    
                    <textarea 
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        className="w-full bg-white border border-red-200 rounded-lg p-4 text-slate-800 focus:ring-2 focus:ring-red-500 outline-none min-h-[100px] shadow-sm relative z-10 font-medium"
                        placeholder="State the fundamental root cause identified from the 5-Why or Fishbone analysis..."
                    />
                    
                    <div className="mt-3 flex items-center gap-2 text-xs text-red-700 font-medium relative z-10 bg-red-100/50 p-2 rounded w-fit">
                        <AlertTriangle size={14} />
                        <span>This finding will drive the Corrective & Preventive Actions (CAPA).</span>
                    </div>
                </div>
            </div>

            {/* Evidence Section */}
            <div className="pt-6 border-t border-slate-100">
               <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <ImageIcon size={16} /> Supporting Evidence
               </h3>
               
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {evidence.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                       <img src={img} alt={`Evidence ${idx}`} className="w-full h-full object-cover" />
                       <button 
                         onClick={() => removeEvidence(idx)}
                         className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <X size={12} />
                       </button>
                    </div>
                  ))}
                  
                  <label className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors aspect-square text-slate-400 hover:text-slate-600">
                     <Upload size={24} className="mb-2" />
                     <span className="text-xs font-medium">Add Image</span>
                     <input type="file" accept="image/*" className="hidden" onChange={handleEvidenceUpload} />
                  </label>
               </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${markAsClosed ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                        {markAsClosed && <CheckCircle2 size={14} />}
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={markAsClosed} 
                        onChange={() => setMarkAsClosed(!markAsClosed)} 
                    />
                    <span className="text-sm text-slate-700">Mark incident as Closed</span>
                </label>

                <button 
                    onClick={handleSaveInvestigation}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 shadow-md transition-all disabled:opacity-70"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Investigation'}
                </button>
            </div>
          </div>
        )}

        {/* CAPA TAB */}
        {activeTab === 'capa' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Corrective & Preventive Actions</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={fetchAvailableActions}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        <LinkIcon size={16} /> Link Existing
                    </button>
                    <button 
                        onClick={() => { setShowActionForm(!showActionForm); setShowLinkModal(false); }}
                        className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                        <Plus size={16} /> Add Action
                    </button>
                </div>
             </div>

             {/* Link Existing Modal Area */}
             {showLinkModal && (
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-4">
                     <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-slate-700">Link Unassigned Actions</h4>
                        <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                     </div>
                     {availableActions.length === 0 ? (
                         <p className="text-sm text-slate-500 italic">No unassigned actions found.</p>
                     ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {availableActions.map(action => (
                                <div key={action.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{action.title}</p>
                                        <p className="text-xs text-slate-500">Assignee: {action.assignee}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleLinkAction(action.id)}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Link
                                    </button>
                                </div>
                            ))}
                        </div>
                     )}
                 </div>
             )}

             {showActionForm && (
                 <form onSubmit={handleAddAction} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Action Description</label>
                        <input 
                            required
                            type="text" 
                            value={newAction.title}
                            onChange={e => setNewAction({...newAction, title: e.target.value})}
                            className="w-full border border-slate-300 rounded p-2 text-sm"
                            placeholder="e.g., Repair seal on Generator B"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Assignee</label>
                            <input 
                                required
                                type="text" 
                                value={newAction.assignee}
                                onChange={e => setNewAction({...newAction, assignee: e.target.value})}
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                placeholder="Name or Team"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                            <select 
                                value={newAction.priority}
                                onChange={e => setNewAction({...newAction, priority: e.target.value})}
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Due Date</label>
                            <input 
                                required
                                type="date" 
                                value={newAction.dueDate}
                                onChange={e => setNewAction({...newAction, dueDate: e.target.value})}
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                aria-label="Action item due date"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowActionForm(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700" aria-label="Cancel adding action item">Cancel</button>
                        <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save Action</button>
                    </div>
                 </form>
             )}

             <div className="space-y-3">
                {actions.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No actions assigned yet.</p>
                ) : (
                    actions.map(action => (
                        <div key={action.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-200 transition-colors gap-4">
                            <div>
                                <h4 className="font-medium text-slate-800">{action.title}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><User size={12}/> {action.assignee}</span>
                                    <span className="flex items-center gap-1"><Calendar size={12}/> Due: {action.dueDate}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                        action.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                        action.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {action.priority}
                                    </span>
                                </div>
                            </div>
                            
                            <select
                                value={action.status}
                                onChange={(e) => handleActionStatusChange(action, e.target.value as any)}
                                className={`px-3 py-1.5 text-xs rounded-full font-medium border-0 cursor-pointer outline-none ring-1 ring-inset ${
                                    action.status === 'Done' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                    action.status === 'In Progress' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' : 
                                    'bg-slate-50 text-slate-700 ring-slate-600/10'
                                }`}
                            >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>
                    ))
                )}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
