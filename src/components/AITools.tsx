
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, HardHat, FileSearch, Loader2, UploadCloud, AlertCircle, CheckCircle2, Sparkles, Volume2, Mic } from 'lucide-react';
import { detectPPEAI, extractDocumentDataAI, generateSpeechAI, playGeneratedAudio } from '../services/geminiService';


export const AITools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ppe' | 'ocr' | 'tts'>('ppe');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ppeResult, setPpeResult] = useState<any>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  
  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setPpeResult(null);
        setOcrResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async () => {
    if (!image) return;
    setLoading(true);
    try {
      if (activeTab === 'ppe') {
        const result = await detectPPEAI(image);
        setPpeResult(result);
      } else {
        const result = await extractDocumentDataAI(image);
        setOcrResult(result);
      }
    } catch (e) {
      console.error(e);
      toast.error("Analysis failed. Check API configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleTTS = async () => {
      if(!ttsText) return;
      setIsSpeaking(true);
      try {
          const audioData = await generateSpeechAI(ttsText);
          if (audioData) {
              await playGeneratedAudio(audioData);
          }
      } catch (e) {
          console.error(e);
          toast.error("Failed to generate speech.");
      } finally {
          setIsSpeaking(false);
      }
  };

  return (
        <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
            <h2 className="text-2xl font-bold text-slate-800">AI Safety Assistant</h2>
            <p className="text-slate-500">Powered by Gemini Models</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200 overflow-x-auto">
            <button
                onClick={() => { setActiveTab('ppe'); setImage(null); setPpeResult(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ppe' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
                <HardHat size={16} /> PPE Detector
            </button>
            <button
                onClick={() => { setActiveTab('ocr'); setImage(null); setOcrResult(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ocr' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
                <FileSearch size={16} /> Permit Scanner
            </button>
            <button
                onClick={() => { setActiveTab('tts'); setImage(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'tts' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
                <Volume2 size={16} /> Text to Speech
            </button>
            </div>
        </div>

        {activeTab === 'tts' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Volume2 className="text-purple-600" /> Safety Announcements & Read Aloud
                </h3>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Enter text below to generate audio announcements for toolbox talks or safety alerts.</p>
                    <textarea 
                        value={ttsText}
                        onChange={(e) => setTtsText(e.target.value)}
                        className="w-full h-40 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-slate-700"
                        placeholder="Type safety announcement here..."
                    />
                    <div className="flex justify-end">
                        <button 
                            onClick={handleTTS}
                            disabled={!ttsText || isSpeaking}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70 transition-colors shadow-md"
                        >
                            {isSpeaking ? <Loader2 className="animate-spin" /> : <Volume2 />}
                            {isSpeaking ? 'Generating Audio...' : 'Generate & Play'}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-80 bg-white">
                    <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={handleImageUpload}
                    />
                    {image ? (
                    <img src={image} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                    ) : (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto">
                        <UploadCloud size={32} />
                        </div>
                        <div>
                        <h3 className="text-lg font-medium text-slate-800">Upload Image</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            {activeTab === 'ppe' ? 'Take a photo of site workers' : 'Scan a work permit'}
                        </p>
                        </div>
                    </div>
                    )}
                </div>
                
                <button
                    onClick={handleAnalysis}
                    disabled={!image || loading}
                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all
                    ${!image || loading 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Run Analysis'}
                </button>
                </div>

                {/* Results Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[320px]">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                    Analysis Results
                </h3>
                
                {!ppeResult && !ocrResult && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-10">
                    <Sparkles size={48} className="mb-4 text-slate-200" />
                    <p>Upload an image and run analysis to see AI insights.</p>
                    </div>
                )}

                {loading && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 pb-10 space-y-4">
                    <Loader2 size={48} className="animate-spin text-blue-500" />
                    <p className="animate-pulse">Processing with Gemini...</p>
                    </div>
                )}

                {/* PPE Results */}
                {ppeResult && (
                    <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Compliance Score</span>
                        <span className={`text-2xl font-bold ${ppeResult.complianceScore > 80 ? 'text-green-600' : 'text-red-600'}`}>
                        {ppeResult.complianceScore}%
                        </span>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-700">{ppeResult.summary}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-2">Detected</h4>
                        <div className="flex flex-wrap gap-2">
                        {ppeResult.ppeItemsFound?.map((item: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} /> {item}
                            </span>
                        ))}
                        {ppeResult.missingPPE?.map((item: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                            <AlertCircle size={12} /> Missing: {item}
                            </span>
                        ))}
                        </div>
                    </div>
                    </div>
                )}

                {/* OCR Results */}
                {ocrResult && (
                    <div className="space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Type</p>
                        <p className="font-medium text-slate-800">{ocrResult.documentType || 'Unknown'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                        <p className="font-medium text-slate-800">{ocrResult.date || 'Unknown'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Permit Holder</p>
                        <p className="font-bold text-blue-900 text-lg">{ocrResult.permitHolder || 'Not Detected'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-2">Identified Hazards</h4>
                        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                        {ocrResult.hazards?.map((h: string, i: number) => (
                            <li key={i}>{h}</li>
                        ))}
                        </ul>
                    </div>
                    </div>
                )}
                </div>
            </div>
        )}
        </div>
  );
};
