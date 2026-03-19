
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { HardHat, CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-brand-orange" />

        <div className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="bg-brand-orange p-1.5 rounded-lg">
                <HardHat className="text-brand-navy" size={20} />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Safedify</span>
            </div>
          </div>

          {status === 'verifying' && (
            <>
              <Loader2 size={48} className="mx-auto text-brand-orange animate-spin mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifying Your Email</h1>
              <p className="text-slate-500">Please wait while we confirm your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={36} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Email Verified!</h1>
              <p className="text-slate-500 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-brand-orange text-white font-bold rounded-lg hover:bg-brand-orange/90 transition-colors"
              >
                Continue to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle size={36} className="text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h1>
              <p className="text-slate-500 mb-6">{message}</p>
              <Link
                to="/login"
                className="block w-full py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors text-center"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'no-token' && (
            <>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail size={36} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h1>
              <p className="text-slate-500 mb-6">
                We sent a verification link to your email address. Click the link in the email to activate your account.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Didn't receive the email? Check your spam folder or try registering again.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:text-brand-orange/80 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
