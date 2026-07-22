
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Image, 
  Loader2, 
  Sparkles, 
  HardHat, 
  FileText, 
  Volume2, 
  Lock 
} from '../utils/icons';

// Lazy load ReactMarkdown to reduce initial bundle size
const ReactMarkdown = React.lazy(() => import('react-markdown'));

import { chatSafetyAssistant, detectPPEAI, generateSpeechAI, playGeneratedAudio } from '../services/geminiService';
import { calculateHSEMetrics } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { SubscriptionTier } from '../types';
import { useNavigate } from 'react-router-dom';

export const AIChatAssistant: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, image?: string}[]>([
    { role: 'model', text: 'Hello! I am your AI Safety Assistant. How can I help you today? \n\nI can assist with risk assessments, toolbox talks, or checking safety regulations.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReading, setIsReading] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isFree = user?.tier === SubscriptionTier.FREE;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    if (isFree) {
        setMessages(prev => [...prev, { role: 'user', text: inputValue }]);
        setInputValue('');
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'model', text: "**Upgrade Required:** Safedify AI Assistant is available on Pro and Enterprise plans." }]);
        }, 500);
        return;
    }

    const userMsg = { role: 'user' as const, text: inputValue, image: selectedImage || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Inject context if relevant
      let systemContext = '';
      if (inputValue.toLowerCase().includes('stats') || inputValue.toLowerCase().includes('performance')) {
          const metrics = calculateHSEMetrics();
          systemContext = `Current Safety Stats: TRIR=${metrics.trir.toFixed(2)}, LTIFR=${metrics.ltifr.toFixed(2)}, LTI Count=${metrics.ltiCount}.`;
      }

      // If image is present and text implies check, maybe call PPE detection directly or just chat
      // For this chatbot, we'll route image + text to the generic chat function which handles multimodal
      const response = await chatSafetyAssistant(inputValue, messages, selectedImage || undefined, systemContext);
      
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the safety database. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
      setInputValue(prompt);
  };

  const handleReadAloud = async (text: string, index: number) => {
      if (isReading !== null) return; // Prevent multiple reads
      if (isFree) {
          alert("Text-to-Speech is a Pro feature.");
          return;
      }
      setIsReading(index);
      try {
          // Cleanup markdown for speech (simple regex to remove **bold**)
          const cleanText = text.replace(/\*\*/g, '');
          const audioData = await generateSpeechAI(cleanText);
          if (audioData) {
              await playGeneratedAudio(audioData);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsReading(null);
      }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-brand-navy text-white p-4 rounded-full shadow-xl hover:bg-slate-800 transition-all z-50 flex items-center gap-2 group print:hidden"
      >
        <Sparkles size={24} className="text-brand-orange group-hover:animate-spin" />
        <span className="font-bold pr-2 hidden md:inline">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 sm:bottom-6 right-0 sm:right-6 w-full sm:w-96 h-[80vh] sm:h-[600px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden print:hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-brand-navy text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
           <Sparkles size={20} className="text-brand-orange" />
           <h3 className="font-bold">Safety Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close AI Assistant">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm relative group ${
              msg.role === 'user' 
                ? 'bg-brand-navy text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="Upload" className="w-full h-auto rounded-lg mb-2 border border-white/20" />
              )}
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
                <Suspense fallback={<div className="text-sm text-slate-500">Loading message...</div>}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </Suspense>
              </div>
              
              {/* TTS Button for Model Messages */}
              {msg.role === 'model' && (
                  <button 
                    onClick={() => handleReadAloud(msg.text, idx)}
                    className={`absolute -right-8 top-2 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-opacity ${isReading === idx ? 'text-blue-600 bg-blue-50' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Read Aloud"
                    aria-label="Read message aloud"
                  >
                      {isReading === idx ? <Loader2 size={14} className="animate-spin"/> : <Volume2 size={14} />}
                  </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm">
               <Loader2 size={20} className="animate-spin text-slate-400" />
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 pb-safe">
         {isFree ? (
             <div className="text-center p-2">
                 <p className="text-sm text-slate-500 mb-3">AI Chat is available on Pro Plan.</p>
                 <button 
                    onClick={() => navigate('/pricing')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:opacity-90"
                 >
                     <Lock size={14} /> Upgrade to Chat
                 </button>
             </div>
         ) : (
             <>
                {/* Quick Prompts (only if empty history or last was model) */}
                {messages.length < 3 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                        <button onClick={() => handleQuickPrompt("Generate a generic toolbox talk for working at height")} className="whitespace-nowrap px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">Toolbox Talk</button>
                        <button onClick={() => handleQuickPrompt("What are the key risks of confined space entry?")} className="whitespace-nowrap px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">Risk Assessment</button>
                        <button onClick={() => handleQuickPrompt("How is our safety performance this month?")} className="whitespace-nowrap px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">Stats Check</button>
                    </div>
                )}

                {selectedImage && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="text-xs text-slate-500 truncate flex-1">Image selected</span>
                        <button onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-red-500" aria-label="Remove selected image"><X size={14} /></button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <label className="p-2 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" title="Upload Photo">
                        <Image size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} aria-label="Upload image to chat" />
                    </label>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Ask about safety..."
                        className="flex-1 max-h-32 min-h-[44px] p-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={1}
                        aria-label="Chat message input"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                        className="p-2.5 bg-brand-navy text-white rounded-xl hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </div>
             </>
         )}
      </div>
    </div>
  );
};
