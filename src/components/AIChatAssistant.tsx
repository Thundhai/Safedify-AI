import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  X, Send, Image, Loader2, Sparkles, Volume2, Lock, Database,
  Bot, Search, BarChart3, ShieldAlert, FileText, Zap, ChevronRight, ChevronDown,
  Minimize2, Maximize2
} from 'lucide-react';
import { chatSafetyAssistant, generateSpeechAI, playGeneratedAudio } from '../services/geminiService';
import { apiAgentChat, apiHealthCheck } from '../services/apiService';
import { calculateHSEMetrics } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { SubscriptionTier } from '../types';
import { useNavigate } from 'react-router-dom';

/* ─── Quick Prompt Categories ─── */
const QUICK_PROMPTS = [
  { icon: <Search size={13} />, label: 'Open Incidents', prompt: 'Show me all open incidents and their severity', category: 'query' },
  { icon: <BarChart3 size={13} />, label: 'Safety Metrics', prompt: 'Calculate our current safety metrics (TRIR, LTIFR)', category: 'analytics' },
  { icon: <ShieldAlert size={13} />, label: 'Overdue Actions', prompt: 'Are there any overdue corrective actions?', category: 'query' },
  { icon: <FileText size={13} />, label: 'Active Permits', prompt: 'List all active work permits', category: 'query' },
  { icon: <Zap size={13} />, label: 'Trends', prompt: 'Analyze safety incident trends over the last 30 days', category: 'analytics' },
  { icon: <ShieldAlert size={13} />, label: 'New Incident', prompt: 'Help me create a new incident report', category: 'create' },
];

/* ─── Capability Badges ─── */
const CAPABILITIES = [
  { icon: <Search size={11} />, label: 'Query Data' },
  { icon: <BarChart3 size={11} />, label: 'Analytics' },
  { icon: <FileText size={11} />, label: 'Create Records' },
  { icon: <Database size={11} />, label: 'SQL Access' },
];

export const AIChatAssistant: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, image?: string, toolCalls?: any[]}[]>([
    {
      role: 'model',
      text: 'Welcome! I\'m your **Safedify AI Agent** with full database access.\n\nI can **query** your safety data, **calculate** metrics like TRIR and LTIFR, **create** incidents and actions, and **analyze** trends.\n\nTry a quick action below or ask me anything!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReading, setIsReading] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [showToolCalls, setShowToolCalls] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isFree = user?.tier === SubscriptionTier.FREE;

  useEffect(() => {
    apiHealthCheck().then(ok => setBackendAvailable(ok)).catch(() => setBackendAvailable(false));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        setMessages(prev => [...prev, {
          role: 'model',
          text: '**Upgrade Required:** The Safedify AI Agent is available on Pro and Enterprise plans. Upgrade to unlock full database querying, analytics, and AI-powered safety insights.'
        }]);
      }, 500);
      return;
    }

    const userMsg = { role: 'user' as const, text: inputValue, image: selectedImage || undefined };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputValue;
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      if (backendAvailable) {
        const result = await apiAgentChat(currentInput, conversationId || undefined);
        setConversationId(result.conversationId);
        setMessages(prev => [...prev, {
          role: 'model',
          text: result.response,
          toolCalls: result.toolCalls?.length > 0 ? result.toolCalls : undefined
        }]);
      } else {
        let systemContext = '';
        if (currentInput.toLowerCase().includes('stats') || currentInput.toLowerCase().includes('performance')) {
          const metrics = await calculateHSEMetrics();
          systemContext = `Current Safety Stats: TRIR=${metrics.trir.toFixed(2)}, LTIFR=${metrics.ltifr.toFixed(2)}, LTI Count=${metrics.ltiCount}.`;
        }
        const response = await chatSafetyAssistant(currentInput, messages, selectedImage || undefined, systemContext);
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (e: any) {
      console.error(e);
      const isRateLimit = e?.message?.includes('rate limit') || e?.message?.includes('429');
      setMessages(prev => [...prev, { role: 'model', text: isRateLimit
        ? '**Rate limit reached.** The AI service is temporarily throttled. Please wait 30 seconds and try again.'
        : "I'm having trouble connecting. Please try again."
      }]);
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
    if (isReading !== null) return;
    if (isFree) { toast.error('Text-to-Speech is a Pro feature.'); return; }
    setIsReading(index);
    try {
      const cleanText = text.replace(/\*\*/g, '');
      const audioData = await generateSpeechAI(cleanText);
      if (audioData) await playGeneratedAudio(audioData);
    } catch (e) { console.error(e); }
    finally { setIsReading(null); }
  };

  /* ─── CLOSED STATE: Floating Action Button ─── */
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 print:hidden group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl max-w-[220px]">
            <p className="text-sm font-bold mb-1 flex items-center gap-1.5">
              <Bot size={14} className="text-brand-orange" /> AI Safety Agent
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">Ask questions, query data, calculate metrics, or get safety insights.</p>
            <div className="absolute bottom-0 right-6 w-3 h-3 bg-slate-900 transform rotate-45 translate-y-1.5" />
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-br from-brand-navy to-slate-800 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl bg-brand-navy/30 animate-ping opacity-30" />
          <Sparkles size={24} className="text-brand-orange relative z-10" />
          <span className="font-bold pr-1 hidden md:inline relative z-10">AI Agent</span>
          {backendAvailable && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10" />
          )}
        </button>
      </div>
    );
  }

  /* ─── OPEN STATE: Chat Panel ─── */
  const panelClasses = expanded
    ? 'fixed inset-4 sm:inset-6 z-50'
    : 'fixed bottom-0 sm:bottom-6 right-0 sm:right-6 w-full sm:w-[420px] h-[85vh] sm:h-[640px] z-50';

  return (
    <div className={`${panelClasses} bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden print:hidden animate-in slide-in-from-bottom-5`}>

      {/* ─── Header ─── */}
      <div className="bg-gradient-to-r from-brand-navy to-slate-800 text-white p-4 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
              <Bot size={20} className="text-brand-orange" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Safedify AI Agent</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {backendAvailable && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Connected
                  </span>
                )}
                {backendAvailable === false && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-300">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Offline Mode
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title={expanded ? 'Minimize' : 'Expand'} aria-label={expanded ? 'Minimize chat' : 'Expand chat'}>
              {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={() => { setIsOpen(false); setExpanded(false); }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-red-500/30 rounded-lg transition-colors"
              title="Close" aria-label="Close AI chat">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Capability Badges */}
        <div className="flex flex-wrap gap-1.5">
          {CAPABILITIES.map((cap, idx) => (
            <span key={idx} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 backdrop-blur-sm">
              {cap.icon} {cap.label}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm relative group ${
              msg.role === 'user'
                ? 'bg-brand-navy text-white rounded-br-md'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md shadow-sm'
            }`}>
              {/* User avatar / Bot icon */}
              {msg.role === 'model' && idx === 0 && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <Bot size={14} className="text-brand-orange" />
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">AI Agent</span>
                </div>
              )}

              {msg.image && (
                <img src={msg.image} alt="Upload" className="w-full h-auto rounded-lg mb-2 border border-white/20" />
              )}
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 dark:prose-invert">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {/* Tool Calls Indicator */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setShowToolCalls(showToolCalls === idx ? null : idx)}
                    className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    <Database size={12} />
                    {msg.toolCalls.length} tool{msg.toolCalls.length > 1 ? 's' : ''} used
                    <ChevronRight size={12} className={`transition-transform ${showToolCalls === idx ? 'rotate-90' : ''}`} />
                  </button>
                  {showToolCalls === idx && (
                    <div className="mt-2 space-y-1.5">
                      {msg.toolCalls.map((tc: any, tcIdx: number) => (
                        <div key={tcIdx} className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Zap size={10} className="text-amber-500" />
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{tc.tool}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 leading-snug break-all">{tc.resultPreview?.slice(0, 200)}{tc.resultPreview?.length > 200 ? '…' : ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TTS Button */}
              {msg.role === 'model' && (
                <button
                  onClick={() => handleReadAloud(msg.text, idx)}
                  className={`absolute -right-9 top-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity ${isReading === idx ? 'text-blue-600 bg-blue-50' : 'opacity-0 group-hover:opacity-100'}`}
                  title="Read Aloud" aria-label="Read message aloud"
                >
                  {isReading === idx ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium animate-pulse">Thinking…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input Area ─── */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0 pb-safe">
        {isFree ? (
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-medium">AI Agent requires a Pro or Enterprise plan.</p>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Lock size={14} /> Upgrade to Unlock AI Agent
            </button>
          </div>
        ) : (
          <>
            {/* Quick Prompts — shown when conversation is fresh */}
            {messages.length < 3 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Quick Actions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button key={idx} onClick={() => handleQuickPrompt(qp.prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                      {qp.icon} {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedImage && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Image size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-300 truncate flex-1 font-medium">Image attached</span>
                <button onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-red-500 transition-colors" aria-label="Remove image">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <label className="p-2.5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Upload Photo">
                <Image size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} title="Upload image for analysis" />
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
                placeholder="Ask about safety data, metrics, or incidents…"
                className="flex-1 max-h-32 min-h-[44px] p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-800 dark:text-white placeholder-slate-400"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                className="p-2.5 bg-brand-navy text-white rounded-xl hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                title="Send message" aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── Bottom Collapse Bar ─── */}
      <button
        onClick={() => { setIsOpen(false); setExpanded(false); }}
        className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
        title="Minimize AI Assistant" aria-label="Minimize AI Assistant"
      >
        <ChevronDown size={14} /> Minimize
      </button>
    </div>
  );
};
