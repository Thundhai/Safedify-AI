
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoles } from '../services/storageService';
import { Role, UserRoles } from '../types';
import { Loader2, ShieldCheck, Lock, Mail, User, Briefcase, AlertCircle, ArrowLeft, HardHat, CheckSquare, Building2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(UserRoles.WORKER);
  const [organizationName, setOrganizationName] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [agreed, setAgreed] = useState(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || undefined;

  useEffect(() => {
      getRoles().then(roles => {
        // Filter out Admin from registration for security
        const publicRoles = roles.filter(r => r.name !== UserRoles.ADMIN);
        setAvailableRoles(publicRoles);
        
        // Default to Worker if available, otherwise first available
        const workerRole = publicRoles.find(r => r.name === UserRoles.WORKER);
        if (workerRole) setRole(workerRole.name);
        else if (publicRoles.length > 0) setRole(publicRoles[0]!.name);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
        setError("You must agree to the Terms of Service.");
        return;
    }

    if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
    }

    if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
    }

    setIsSubmitting(true);

    try {
      const result = await register(name, email, password, role, organizationName || undefined, inviteToken);
      if (result === 'verification_required') {
        navigate('/verify-email');
      } else if (result === true) {
        navigate('/');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
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

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-brand-orange"></div>
        
        <div className="p-8 pb-0">
           <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 transition-colors">
               <ArrowLeft size={14} /> Back to Login
           </Link>
           
           <div className="mb-4 flex justify-center">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-orange p-1.5 rounded-lg">
                       <HardHat className="text-brand-navy" size={20} />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Safedify</span>
                </div>
           </div>

           <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Account</h1>
           <p className="text-slate-500 text-sm">Get started with a free Basic plan.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Full Name</label>
            <div className="relative">
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="John Doe"
              />
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="you@company.com"
              />
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Role</label>
            <div className="relative">
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white text-sm"
              >
                  {availableRoles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
              </select>
              <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
          </div>

          {!inviteToken && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Organization Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="Your company name (optional)"
                />
                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={18} />
              </div>
              <p className="text-xs text-slate-400">Leave blank to create a personal workspace.</p>
            </div>
          )}

          {inviteToken && (
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg border border-blue-100">
              You've been invited to join an organization. Complete registration to accept.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Password</label>
                <div className="relative">
                <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="••••••"
                />
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Confirm</label>
                <div className="relative">
                <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="••••••"
                />
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                </div>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer mt-2">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)} 
                className="mt-1"
              />
              <span className="text-xs text-slate-500">
                  I agree to the <a href="#/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </span>
          </label>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-brand-navy hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Account'}
          </button>
        </form>
      </div>
      
      <p className="absolute bottom-6 text-slate-500 text-xs font-medium opacity-50">© {new Date().getFullYear()} Safedify AI Platform</p>
    </div>
  );
};
