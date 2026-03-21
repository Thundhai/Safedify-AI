
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Send, UserX, User, AlertOctagon, ShieldCheck, AlertTriangle, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { saveObservation } from '../services/storageService';
import { analyzeObservationAI } from '../services/geminiService';
import { SmartTextInput, SmartTextArea } from './SmartTextInput';
import { compressImage } from '../services/offlineService';
import { Observation, ObservationType } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const ObservationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [type, setType] = useState<ObservationType>('Unsafe Act');
  const [category, setCategory] = useState('PPE');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [observerName, setObserverName] = useState(user?.name || '');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.error("Failed to process image.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleAIAnalysis = async () => {
    if (!description || description.length < 5) {
        toast.error("Please describe the observation first.");
        return;
    }
    setIsAnalyzing(true);
    try {
        const result = await analyzeObservationAI(description);
        if (result && Object.keys(result).length > 0) {
            if (result.type) setType(result.type as ObservationType);
            if (result.category) setCategory(result.category);
            if (result.immediateAction) setImmediateAction(result.immediateAction);
            toast.success("AI analysis complete!");
        } else {
            toast.error("AI returned empty result. Please try again.");
        }
    } catch (e: any) {
        console.error("AI Analysis Error:", e);
        toast.error(e?.message || "AI analysis failed. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      toast.error("Please provide a description (at least 5 characters).");
      return;
    }
    if (!location.trim()) {
      toast.error("Please enter a location.");
      return;
    }
    setIsSubmitting(true);
    try {
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

      await saveObservation(newObs);
      toast.success("Observation submitted successfully!");
      navigate('/observations');
    } catch (err: any) {
      console.error("Save observation failed", err);
      toast.error(err?.message || "Failed to submit observation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            type="button"
            onClick={() => setType('Unsafe Act')}
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
            className={`p-3 rounded-lg border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
              type === 'Safe Behavior' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={24} className={type === 'Safe Behavior' ? 'text-green-600' : 'text-slate-400'} />
            Safe Behavior
          </button>
          <button 
            type="button"
            onClick={() => setType('Near Miss')}
            className={`p-3 rounded-lg border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
              type === 'Near Miss' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 ring-1 ring-yellow-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle size={24} className={type === 'Near Miss' ? 'text-yellow-600' : 'text-slate-400'} />
            Near Miss
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Location */}
        <div>
           <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
           <div className="relative">
             <SmartTextInput 
               value={location}
               onChange={(e) => setLocation(e.target.value)}
               onValueChange={setLocation}
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
           <SmartTextArea 
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             onValueChange={setDescription}
             placeholder="Describe what you observed..."
             rows={3}
             className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             required
           />
           <div className="flex justify-end mt-2">
                <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || description.length < 5}
                    className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Auto-Categorize & Suggest Action
                </button>
           </div>
        </div>

        {/* Immediate Action */}
        <div>
           <label className="block text-sm font-semibold text-slate-700 mb-1">Immediate Action Taken</label>
           <SmartTextArea 
             value={immediateAction}
             onChange={(e) => setImmediateAction(e.target.value)}
             onValueChange={setImmediateAction}
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
                    <img src={image} alt="Evidence" className="h-32 object-contain rounded" />
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
              <input type="checkbox" checked={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
           </label>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Send size={18} /> Submit Card</>}
        </button>
      </form>
    </div>
  );
};
