
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { Loader2, ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft, HardHat, KeyRound, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWith2FA } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result === '2fa_required') {
        setNeeds2FA(true);
      } else if (result === 'password_change_required') {
        setNeedsPasswordChange(true);
      } else if (result === true) {
        navigate('/');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('verify your email')) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
      } else {
        setError(msg || 'An error occurred during login.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const success = await loginWith2FA(totpCode);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid 2FA code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword === password) {
      setError('New password must be different from the current password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(password, newPassword);
      // Password changed successfully — log in again with new password
      const result = await login(email, newPassword);
      if (result === true) {
        navigate('/');
      } else {
        setError('Password changed. Please sign in with your new password.');
        setNeedsPasswordChange(false);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
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

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-10 min-h-[600px]">
        
        {/* Left Side: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
            <Link to="/welcome" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 transition-colors">
               <ArrowLeft size={14} /> Back to Home
            </Link>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <div className="bg-brand-orange p-2 rounded-lg">
                       <HardHat className="text-brand-navy" size={24} />
                    </div>
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">Safedify</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
                <p className="text-slate-500">Enter your credentials to access your workspace.</p>
            </div>

            <form onSubmit={needsPasswordChange ? handlePasswordChangeSubmit : needs2FA ? handle2FASubmit : handleSubmit} className="space-y-5">
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in">
                <AlertCircle size={16} /> {error}
                </div>
            )}

            {needsPasswordChange ? (
              <>
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-3">
                    <Lock size={28} className="text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Password Change Required</h2>
                  <p className="text-sm text-slate-500">Please set a new password to continue.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Enter new password"
                      minLength={8}
                      autoFocus
                    />
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Confirm new password"
                      minLength={8}
                    />
                    <CheckCircle className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  </div>
                </div>
              </>
            ) : needs2FA ? (
              <>
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
                    <KeyRound size={28} className="text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Two-Factor Authentication</h2>
                  <p className="text-sm text-slate-500">Enter the 6-digit code from your authenticator app</p>
                </div>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-2xl font-mono tracking-[0.3em] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="000000"
                    maxLength={8}
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 text-center">You can also use a backup code</p>
                </div>
              </>
            ) : (
              <>
            <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Email</label>
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

            <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                </div>
            </div>

            <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    Forgot password?
                </Link>
            </div>
              </>
            )}

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-brand-navy hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : needsPasswordChange ? 'Set New Password' : needs2FA ? 'Verify Code' : 'Sign In'}
            </button>


            </form>
        </div>

        {/* Right Side: Registration CTA */}
        <div className="bg-slate-50 border-l border-slate-100 p-8 md:p-12 flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-brand-orange rounded-2xl shadow-md flex items-center justify-center mb-6 overflow-hidden">
                <HardHat className="text-brand-navy" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">New to Safedify?</h2>
            <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
                Join thousands of safety professionals managing risks, incidents, and compliance with AI.
            </p>
            
            <Link 
                to="/register"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 font-bold text-blue-600 transition-all duration-200 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
            >
                Create Account
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="mt-12 grid grid-cols-3 gap-4 text-center w-full max-w-xs opacity-60 grayscale">
                 <div className="flex flex-col items-center gap-1">
                     <span className="font-bold text-lg text-slate-800">99%</span>
                     <span className="text-[10px] uppercase text-slate-500">Uptime</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                     <span className="font-bold text-lg text-slate-800">AI</span>
                     <span className="text-[10px] uppercase text-slate-500">Powered</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                     <span className="font-bold text-lg text-slate-800">ISO</span>
                     <span className="text-[10px] uppercase text-slate-500">Ready</span>
                 </div>
            </div>
        </div>

      </div>
      
      <p className="absolute bottom-6 text-slate-500 text-xs font-medium opacity-50">© {new Date().getFullYear()} Safedify AI Platform</p>
    </div>
  );
};
