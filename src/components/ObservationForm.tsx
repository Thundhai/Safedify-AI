
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Send, UserX, User, AlertOctagon, ShieldCheck, AlertTriangle, Sparkles, Loader2, ArrowLeft } from '../utils/icons';
import { saveObservation, saveAction } from '../services/storageService';
import { analyzeObservationAI } from '../services/geminiService';
import { compressImage, addToSyncQueue } from '../services/offlineService';
import { Observation, ObservationType, ActionItem } from '../types';

export const ObservationForm: React.FC = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<ObservationType>('Unsafe Act');
  const [category, setCategory] = useState('PPE');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [observerName, setObserverName] = useState('Current User');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const categories = [
    'PPE', 'Housekeeping', 'Tools & Equipment', 'Working at Height', 
    'Lifting / Manual Handling', 'Electrical', 'Chemicals', 'Traffic / Vehicles'
  ];

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setImage(compressed);
      } catch (err) {
        console.error("Compression error", err);
        alert("Failed to process image.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleAIAnalysis = async () => {
    if (!description || description.length < 5) {
        alert("Please describe the observation first.");
        return;
    }
    setIsAnalyzing(true);
    try {
        const result = await analyzeObservationAI(description);
        if (result) {
            if (result.type) setType(result.type as ObservationType);
            if (result.category) setCategory(result.category);
            if (result.immediateAction) setImmediateAction(result.immediateAction);
        }
    } catch (e) {
        console.error(e);
        alert("AI analysis failed.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newObs: Observation = {
      id: `obs-${Date.now()}`,
      type,
      category,
      description,
      location: location || 'Unknown',
      date: new Date().toISOString(),
      isAnonymous,
      observer: isAnonymous ? undefined : observerName,
      status: 'Open',
      immediateActionTaken: immediateAction,
      images: image ? [image] : []
    };

    saveObservation(newObs);
    addToSyncQueue('SAVE_OBSERVATION', `Observation: ${newObs.type}`);

    // Auto-create CAPA for Unsafe Act, Unsafe Condition, or Near Miss
    if (type === 'Unsafe Act' || type === 'Unsafe Condition' || type === 'Near Miss') {
      const autoCapa: ActionItem = {
        id: `capa-${Date.now()}`,
        type: 'Corrective',
        source: 'Observation',
        title: `CAPA: ${type} — ${description.slice(0, 60)}`,
        description: description,
        assignee: isAnonymous ? 'HSE Team' : (observerName || 'HSE Team'),
        priority: type === 'Near Miss' ? 'High' : 'Medium',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'Open',
        relatedObservationId: newObs.id,
        createdAt: new Date().toISOString(),
      };
      saveAction(autoCapa);
      addToSyncQueue('SAVE_ACTION', `Auto-CAPA for ${type}`);
    }

    navigate('/observations');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
            onClick={() => navigate('/observations')} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            title="Back to Observations"
        >
            <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">New Observation Card</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        
        {/* Type Selection */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            type="button"
            onClick={() => setType('Unsafe Act')}
            aria-label="Select Unsafe Act observation type"
            className={`p-3 rounded-lg border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
              type === 'Unsafe Act' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <AlertOctagon size={24} className={type === 'Unsafe Act' ? 'text-red-600' : 'text-slate-400'} />
            Unsafe Act
          </button>
          <button 
            type="button"
            onClick={() => setType('Unsafe Condition')}
            aria-label="Select Unsafe Condition observation type"
            className={`p-3 rounded-lg border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
              type === 'Unsafe Condition' ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle size={24} className={type === 'Unsafe Condition' ? 'text-orange-600' : 'text-slate-400'} />
            Unsafe Condition
          </button>
          <button 
            type="button"
            onClick={() => setType('Safe Behavior')}
            aria-label="Select Safe Behavior observation type"
            className={`p-3 rounded-lg border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
              type === 'Safe Behavior' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={24} className={type === 'Safe Behavior' ? 'text-green-600' : 'text-slate-400'} />
            Safe Behavior
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Observation category"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Location */}
        <div>
           <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
           <div className="relative">
             <input 
               type="text" 
               value={location}
               onChange={(e) => setLocation(e.target.value)}
               placeholder="e.g. Workshop Area 2"
               className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               required
             />
             <MapPin size={18} className="absolute left-3 top-3 text-slate-400" />
           </div>
        </div>

        {/* Description */}
        <div>
           <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
           <textarea 
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             placeholder="Describe what you observed..."
             rows={3}
             className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             required
             aria-required="true"
             aria-label="Observation description"
           />
           <div className="flex justify-end mt-2">
                <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || description.length < 5}
                    className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                    aria-label="Auto-categorize observation and suggest action using AI"
                >
                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Auto-Categorize & Suggest Action
                </button>
           </div>
        </div>

        {/* Immediate Action */}
        <div>
           <label className="block text-sm font-semibold text-slate-700 mb-1">Immediate Action Taken</label>
           <textarea 
             value={immediateAction}
             onChange={(e) => setImmediateAction(e.target.value)}
             placeholder="What did you do to correct it? (e.g. stopped work, removed hazard)"
             rows={2}
             className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
           />
        </div>

        {/* Photo */}
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Photo Evidence (Optional)</label>
            <label className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors relative">
                <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageChange}
                    disabled={isCompressing}
                />
                {isCompressing ? (
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : image ? (
                    <img src={image} alt="Evidence photo for safety observation" className="h-32 object-contain rounded" />
                ) : (
                    <>
                        <Camera size={24} className="text-slate-400" />
                        <span className="text-xs text-slate-500">Tap to upload</span>
                    </>
                )}
            </label>
        </div>

        {/* Anonymous Toggle */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
           <div className="flex items-center gap-2">
             {isAnonymous ? <UserX size={20} className="text-slate-600" /> : <User size={20} className="text-blue-600" />}
             <span className="text-sm font-medium text-slate-700">Submit Anonymously</span>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isAnonymous} 
                onChange={() => setIsAnonymous(!isAnonymous)} 
                className="sr-only peer" 
                aria-describedby="anonymous-help"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="sr-only">Toggle anonymous submission</span>
           </label>
        </div>

        <button 
          type="submit" 
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <Send size={18} /> Submit Card
        </button>
      </form>
    </div>
  );
};
