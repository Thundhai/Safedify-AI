import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Lock, AlertCircle, CheckCircle, ArrowLeft, HardHat, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const location = useLocation();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setSuccess(data.message);
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
            <ShieldCheck size={28} className="text-brand-orange" />
            Reset Password
          </h1>
          <p className="text-slate-500">Choose a new password for your account.</p>
        </div>

        {/* No token warning */}
        {!token && !success && (
          <div className="bg-amber-50 text-amber-700 text-sm p-4 rounded-lg flex items-start gap-2 border border-amber-200 mb-5">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>No reset token found. Please use the link from your password reset email, or <Link to="/forgot-password" className="underline font-bold">request a new one</Link>.</span>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg flex items-start gap-2 border border-green-100">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
            <Link
              to="/login"
              className="block text-center w-full bg-brand-navy hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
            >
              Sign In with New Password
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
              <label className="text-sm font-bold text-slate-700">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Minimum 8 characters"
                />
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Re-enter your password"
                />
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Password strength hints */}
            <div className="text-xs text-slate-400 space-y-1">
              <p className={password.length >= 8 ? 'text-green-500' : ''}>
                {password.length >= 8 ? '✓' : '○'} At least 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full bg-brand-navy hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>

      <p className="absolute bottom-6 text-slate-500 text-xs font-medium opacity-50">© {new Date().getFullYear()} Safedify AI Platform</p>
    </div>
  );
};
