import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, AlertCircle, CheckCircle, ArrowLeft, HardHat, KeyRound } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResetToken('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setSuccess(data.message);
        // In development, the API returns the token directly for convenience
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 p-8 md:p-12">
        <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-brand-orange p-2 rounded-lg">
              <HardHat className="text-brand-navy" size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Safedify</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <KeyRound size={28} className="text-brand-orange" />
            Forgot Password
          </h1>
          <p className="text-slate-500">Enter your email and we'll generate a reset link for you.</p>
        </div>

        {/* Success State */}
        {success && (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg flex items-start gap-2 border border-green-100">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
            {resetToken && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">Development Mode — Reset Link</p>
                <Link
                  to={`/reset-password?token=${resetToken}`}
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all font-medium"
                >
                  Click here to reset your password →
                </Link>
              </div>
            )}
            <Link 
              to="/login"
              className="block text-center w-full bg-brand-navy hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all"
            >
              Back to Login
            </Link>
          </div>
        )}

        {/* Form State */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@company.com"
                />
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-navy hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>

      <p className="absolute bottom-6 text-slate-500 text-xs font-medium opacity-50">© {new Date().getFullYear()} Safedify AI Platform</p>
    </div>
  );
};
