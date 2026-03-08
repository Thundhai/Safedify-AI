
import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, ShieldAlert, Loader2, Sparkles, X, UploadCloud, Save, ArrowRight } from 'lucide-react';
import { detectSiteHazardsAI } from '../services/geminiService';
import { HazardDetection, Observation, SubscriptionTier } from '../types';
import { saveObservation } from '../services/storageService';
import { Link, useNavigate } from 'react-router-dom';
import { FeatureGate } from './FeatureGate';
import toast from 'react-hot-toast';

export const SmartCamera: React.FC = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<HazardDetection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Verify/Log State
  const [loggingHazard, setLoggingHazard] = useState<HazardDetection | null>(null);
  const [observationDetails, setObservationDetails] = useState({
      location: '',
      immediateAction: ''
  });

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setDetections([]); // Reset
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await detectSiteHazardsAI(base64);
      if (result && result.detections) {
        setDetections(result.detections);
      }
    } catch (e) {
      console.error(e);
      toast.error("AI analysis failed to identify hazards.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const initiateLogObservation = (det: HazardDetection) => {
      setLoggingHazard(det);
      setObservationDetails({ location: det.location || '', immediateAction: det.recommendation || '' });
  };

  const confirmLogObservation = async () => {
      if (!loggingHazard) return;

      const newObs: Observation = {
          id: `obs-ai-${Date.now()}`,
          type: 'Unsafe Condition',
          category: 'AI Detected', // Or categorize based on hazard name
          description: `[AI Monitor] Detected: ${loggingHazard.hazard}.`,
          location: observationDetails.location || 'Unknown',
          date: new Date().toISOString(),
          isAnonymous: false,
          observer: 'AI Safety Monitor',
          status: 'Open',
          immediateActionTaken: observationDetails.immediateAction,
          images: image ? [image] : []
      };

      await saveObservation(newObs);
      
      toast.success("Hazard logged to Observations successfully.");
      setLoggingHazard(null); // Close modal
  };

  return (
    <FeatureGate requiredTier={SubscriptionTier.PRO} fullPage featureName="Smart AI Safety Monitor">
        <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Camera className="text-blue-600" /> AI Safety Monitor
                </h2>
                <p className="text-slate-500">Upload site photos to automatically detect and log hazards.</p>
            </div>
            <Link to="/observations" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                View Observations <ArrowRight size={14}/>
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl overflow-hidden aspect-[3/4] relative flex items-center justify-center border-2 border-dashed border-slate-300">
                    {image ? (
                        <img src={image} alt="Site Capture" className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-center text-slate-400 p-6">
                            <UploadCloud size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Upload Site Photo</p>
                            <p className="text-xs mt-2">Supports JPG, PNG</p>
                        </div>
                    )}
                    
                    {/* Overlay Scanning Effect */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-blue-500/10 z-10 flex items-center justify-center backdrop-blur-sm">
                            <div className="flex flex-col items-center text-white">
                                <Loader2 size={48} className="animate-spin mb-2" />
                                <span className="font-bold tracking-wider animate-pulse text-blue-600">AI ANALYZING...</span>
                            </div>
                        </div>
                    )}
                    
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleCapture} 
                        disabled={isAnalyzing}
                    />
                </div>

                <div className="text-center text-xs text-slate-400">
                    Tap image area to upload or change photo.
                </div>
            </div>

            {/* Analysis Results */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Hazard Detections</h3>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {isAnalyzing ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-slate-50 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    ) : detections.length > 0 ? (
                        detections.map((det, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative group hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-1">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-500" />
                                        {det.hazard}
                                    </h4>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${det.confidence > 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {(det.confidence * 100).toFixed(0)}% Conf
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mb-2">{det.recommendation}</p>
                                <div className="flex gap-2 mt-2">
                                    <button 
                                        onClick={() => initiateLogObservation(det)}
                                        className="flex-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <ShieldAlert size={12} /> Log as Observation
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : image ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <CheckCircle size={48} className="text-green-500 mb-2 opacity-50" />
                            <p>No significant hazards detected.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Sparkles size={48} className="mb-2 opacity-20" />
                            <p>Upload an image to start analysis.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Verify & Log Modal */}
        {loggingHazard && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Verify Observation</h3>
                        <button onClick={() => setLoggingHazard(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <p className="text-xs font-bold text-red-800 uppercase mb-1">Detected Hazard</p>
                            <p className="text-sm font-medium text-red-900">{loggingHazard.hazard}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={observationDetails.location}
                                onChange={e => setObservationDetails({...observationDetails, location: e.target.value})}
                                placeholder="e.g. Zone A"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Recommended Action</label>
                            <textarea 
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                rows={3}
                                value={observationDetails.immediateAction}
                                onChange={e => setObservationDetails({...observationDetails, immediateAction: e.target.value})}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                onClick={() => setLoggingHazard(null)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmLogObservation}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Save size={16} /> Confirm & Log
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </div>
    </FeatureGate>
  );
};
