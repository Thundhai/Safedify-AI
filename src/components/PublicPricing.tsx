
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowLeft, HardHat } from 'lucide-react';
import { PricingPlans } from './PricingPlans';

export const PublicPricing: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden flex flex-col">
      
      {/* Navbar (Simplified for Public Pages) */}
      <nav className="w-full bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/welcome')}>
              <div className="bg-brand-orange p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                 <HardHat className="text-brand-navy" size={24} fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Safedify</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate('/welcome')} className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Home</button>
              <div className="h-4 w-px bg-slate-700"></div>
              <button onClick={() => navigate('/login')} className="text-white hover:text-brand-orange font-medium text-sm transition-colors">Log In</button>
              <button onClick={() => navigate('/register')} className="bg-brand-orange hover:bg-orange-500 text-brand-navy px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg">Get Started</button>
            </div>

            <div className="md:hidden">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 hover:text-white p-2">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
          </div>
        </div>
        
        {isMobileMenuOpen && (
            <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex flex-col gap-4">
                <button onClick={() => navigate('/welcome')} className="text-slate-300 hover:text-white font-medium text-left px-2">Home</button>
                <button onClick={() => navigate('/login')} className="text-white font-medium text-left px-2">Log In</button>
                <button onClick={() => navigate('/register')} className="bg-brand-orange text-brand-navy font-bold text-center py-2 rounded-lg">Get Started</button>
            </div>
        )}
      </nav>

      <div className="flex-1 pt-12 pb-20">
          <div className="max-w-7xl mx-auto px-4">
              <button onClick={() => navigate('/welcome')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors">
                  <ArrowLeft size={18} /> Back to Home
              </button>
              <PricingPlans />
          </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center justify-start gap-2 mb-4 text-white">
                <div className="bg-brand-orange p-1.5 rounded-lg">
                    <HardHat className="text-brand-navy" size={20} fill="currentColor" />
                </div>
                <span className="font-bold text-xl">Safedify</span>
            </div>
            <p className="text-sm">Building safer workplaces through intelligent technology.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/welcome')} className="hover:text-white text-left">Incidents</button></li>
              <li><button onClick={() => navigate('/welcome')} className="hover:text-white text-left">Permits</button></li>
              <li><button onClick={() => navigate('/welcome')} className="hover:text-white text-left">Inspections</button></li>
              <li><button onClick={() => navigate('/welcome')} className="hover:text-white text-left">AI Tools</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/plans" className="hover:text-white">Pricing Plans</Link></li>
              <li><Link to="/register" className="hover:text-white">Register</Link></li>
              <li><Link to="/login" className="hover:text-white">Login</Link></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/#/privacy" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="/#/terms" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-900 text-center text-xs">
          © {new Date().getFullYear()} Safedify Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
