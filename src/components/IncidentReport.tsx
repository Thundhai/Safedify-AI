
import React, { useState, useEffect } from 'react';
import { 
  Camera, MapPin, Mic, Loader2, Sparkles, AlertTriangle, 
  CheckSquare, StopCircle, ArrowLeft, BrainCircuit, Target, 
  GitBranch, RefreshCw, Lock 
} from '../utils/icons';
import { classifyIncidentAI, getCorrectiveActionsAI } from '../services/geminiService';
import { saveIncident, saveAction } from '../services/storageService';
import { compressImage, addToSyncQueue } from '../services/offlineService';
import { IncidentSeverity, IncidentType, Incident, SubscriptionTier, ActionItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ContextSelector } from './ContextSelector';

// Type definition for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const IncidentReport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [contextId, setContextId] = useState<string|undefined>();
  const [isClassifying, setIsClassifying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // AI Analysis State
  const [aiResult, setAiResult] = useState<{
    type: IncidentType;
    severity: IncidentSeverity;
    confidence: number;
    reasoning: string;
    causes?: string[];
    contributingFactors?: string[];
  } | null>(null);

  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Check Subscription
  const isPro = user?.tier === SubscriptionTier.PRO || user?.tier === SubscriptionTier.ENTERPRISE;

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      setIsListening(true);
      recognition.start();
    }
  };

  const handleClassify = async () => {
    if (!isPro) {
        navigate('/pricing');
        return;
    }

    if (!description || description.length < 5) {
      alert("Please provide a more detailed description for analysis.");
      return;
    }
    
    setIsClassifying(true);
    setRecommendations([]); // clear old
    setAiResult(null); 

    try {
      // 1. Classify (Includes Causes & Factors)
      const result = await classifyIncidentAI(description);
      setAiResult(result);

      // 2. Get Recommendations
      const recs = await getCorrectiveActionsAI(description, result.type, result.severity);
      if (recs && recs.actions) {
        setRecommendations(recs.actions);
      }
    } catch (e) {
      console.error("Failed to classify", e);
      alert("AI Classification failed. Please check your network.");
    } finally {
      setIsClassifying(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setSelectedImage(compressed);
      } catch (err) {
        console.error("Compression error", err);
        alert("Failed to process image.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location) {
      alert("Please enter the incident location.");
      return;
    }

    // Default to 'Near Miss' / 'Low' if AI wasn't used/failed, but warn user
    const finalType = aiResult?.type || IncidentType.NEAR_MISS;
    const finalSeverity = aiResult?.severity || IncidentSeverity.LOW;

    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      description,
      date: new Date().toISOString(),
      location: location,
      type: finalType,
      severity: finalSeverity,
      status: 'Open' as const,
      images: selectedImage ? [selectedImage] : [],
      reporter: user?.name || 'Current User',
      contextId,
      aiClassification: aiResult ? {
          confidence: aiResult.confidence,
          reasoning: aiResult.reasoning,
          causes: aiResult.causes,
          contributingFactors: aiResult.contributingFactors
      } : undefined
    };

    saveIncident(newIncident);
    addToSyncQueue('SAVE_INCIDENT', `New Incident: ${finalType} at ${location}`);

    // Auto-create CAPA for Critical or High severity incidents
    if (finalSeverity === IncidentSeverity.CRITICAL || finalSeverity === IncidentSeverity.HIGH) {
      const autoCapa: ActionItem = {
        id: `capa-${Date.now()}`,
        type: 'Corrective',
        source: 'Incident',
        title: `Investigate & correct: ${finalType} at ${location}`,
        description: description,
        assignee: user?.name || 'HSE Team',
        priority: finalSeverity === IncidentSeverity.CRITICAL ? 'High' : 'Medium',
        dueDate: new Date(Date.now() + (finalSeverity === IncidentSeverity.CRITICAL ? 7 : 14) * 86400000).toISOString().split('T')[0],
        status: 'Open',
        relatedIncidentId: newIncident.id,
        createdAt: new Date().toISOString(),
      };
      saveAction(autoCapa);
      addToSyncQueue('SAVE_ACTION', `Auto-CAPA for ${finalSeverity} incident`);
    }

    navigate('/incidents');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button 
            onClick={() => navigate('/incidents')} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            title="Back to Incidents"
        >
            <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> Report Incident
            </h2>
            <p className="text-slate-500 text-sm">Describe the event to auto-classify.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        
        {/* Description Input with Voice */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">What happened?</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-12 text-slate-800 shadow-inner"
              placeholder="Describe the incident in detail (e.g. 'Worker fell from ladder due to slippery rungs...')"
            />
            <button 
              onClick={toggleListening}
              className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${
                isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
              }`}
              title="Voice to Text"
            >
              {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={handleClassify}
              disabled={(isPro && (isClassifying || description.length < 5))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-md ${
                  isPro 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-50' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {isPro ? (
                  isClassifying ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />
              ) : (
                  <Lock size={16} />
              )}
              {isPro ? (isClassifying ? 'Analyzing...' : 'Analyze with AI') : 'Unlock AI Analysis'}
            </button>
          </div>
        </div>

        {/* AI Analysis Results */}
        {aiResult && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
            {/* Watermark/Icon */}
            <BrainCircuit className="absolute -top-4 -right-4 text-purple-200 w-32 h-32 opacity-20 pointer-events-none" />

            <div className="relative z-10">
                <h3 className="text-purple-900 font-bold flex items-center gap-2 mb-3">
                    <Sparkles size={18} /> AI Assessment
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                        <span className="text-xs text-purple-600 uppercase font-bold">Type</span>
                        <div className="font-bold text-slate-800">{aiResult.type}</div>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                        <span className="text-xs text-purple-600 uppercase font-bold">Severity</span>
                        <div className={`font-bold ${
                            aiResult.severity === IncidentSeverity.CRITICAL ? 'text-red-600' : 
                            aiResult.severity === IncidentSeverity.HIGH ? 'text-orange-600' : 'text-slate-800'
                        }`}>
                            {aiResult.severity}
                        </div>
                    </div>
                </div>

                <div className="bg-white/60 p-3 rounded-lg border border-purple-100 mb-4">
                    <span className="text-xs text-purple-600 uppercase font-bold mb-1 block">Reasoning</span>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {aiResult.reasoning}
                        <span className="text-xs text-purple-400 ml-2 font-mono">({(aiResult.confidence * 100).toFixed(0)}% Conf.)</span>
                    </p>
                </div>

                {/* Causes & Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResult.causes && aiResult.causes.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-red-700 uppercase flex items-center gap-1 mb-2">
                                <Target size={14} /> Potential Causes
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {aiResult.causes.map((cause, i) => (
                                    <span key={i} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-md border border-red-200">
                                        {cause}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {aiResult.contributingFactors && aiResult.contributingFactors.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-orange-700 uppercase flex items-center gap-1 mb-2">
                                <GitBranch size={14} /> Contributing Factors
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {aiResult.contributingFactors.map((factor, i) => (
                                    <span key={i} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md border border-orange-200">
                                        {factor}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 animate-in fade-in slide-in-from-top-4">
                <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-3">
                    <CheckSquare size={18} /> Recommended Immediate Actions
                </h3>
                <ul className="space-y-2">
                    {recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-blue-100">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            {rec}
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {/* Manual Details Form */}
        <div className="space-y-4 pt-2">
            <ContextSelector value={contextId} onChange={setContextId} />
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Exact Location</label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Zone B - Generator Room"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Photo Evidence</label>
                <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleImageChange}
                        disabled={isCompressing}
                    />
                    {isCompressing ? (
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                    ) : selectedImage ? (
                        <img src={selectedImage} alt="Preview" className="h-32 object-contain rounded-md shadow-sm" />
                    ) : (
                        <>
                            <Camera size={24} className="text-slate-400 mb-2" />
                            <span className="text-sm text-slate-500 font-medium">Click to upload photo</span>
                        </>
                    )}
                </label>
            </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-100">
            <button 
                onClick={handleSubmit}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                <CheckSquare size={20} /> Submit Incident Report
            </button>
        </div>

      </div>
    </div>
  );
};
