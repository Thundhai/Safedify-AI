import React, { useState } from 'react';
import { Share2, MessageCircle, Mail, Copy, Check, X } from 'lucide-react';

interface ShareMenuProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
}

export const ShareMenu: React.FC<ShareMenuProps> = ({ title, text, url, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;
  const fullText = `${text}\n\n${shareUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        setOpen(false);
      } catch { /* user cancelled */ }
    } else {
      setOpen(s => !s);
    }
  };

  const whatsapp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank');
    setOpen(false);
  };

  const telegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
    setOpen(false);
  };

  const email = () => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullText)}`, '_blank');
    setOpen(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
        title="Share"
      >
        <Share2 size={15} /> Share
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-48 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 uppercase">Share via</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
            </div>
            <button onClick={whatsapp} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 text-sm text-slate-700 transition-colors">
              <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={11} className="text-white" />
              </span>
              WhatsApp
            </button>
            <button onClick={telegram} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm text-slate-700 transition-colors">
              <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={11} className="text-white" />
              </span>
              Telegram
            </button>
            <button onClick={email} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 transition-colors">
              <span className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center flex-shrink-0">
                <Mail size={11} className="text-white" />
              </span>
              Email
            </button>
            <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 border-t border-slate-100 transition-colors">
              <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                {copied ? <Check size={11} className="text-white" /> : <Copy size={11} className="text-white" />}
              </span>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
