
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, BrainCircuit, WifiOff, FileSignature, 
  ArrowRight, CheckCircle2, BarChart2, Smartphone, 
  Users, Globe, Zap, Menu, X, Building2, HardHat, Factory,
  Check, Crown, Sparkles, FileText, Lock, Shield
} from 'lucide-react';
import { PricingPlans } from './PricingPlans';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc, color }) => (
  <div className={`p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow bg-white`}>
    <div className={`mb-4 w-14 h-14 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{desc}</p>
  </div>
);

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'security' | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const LegalModal = () => {
      if (!legalModal) return null;
      
      let title = '';
      let icon = null;
      
      switch(legalModal) {
          case 'privacy': title = 'Privacy Policy'; icon = <Lock size={20} className="text-blue-600"/>; break;
          case 'terms': title = 'Terms of Service'; icon = <FileText size={20} className="text-blue-600"/>; break;
          case 'security': title = 'Security Policy'; icon = <Shield size={20} className="text-blue-600"/>; break;
      }

      const content = (
          <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
              {legalModal === 'security' ? (
                  <>
                    <p><strong>Security at Safedify</strong></p>
                    <p>We take the security of your data seriously. Our platform is built on enterprise-grade infrastructure.</p>
                    <h4 className="font-bold text-slate-800 mt-4">1. Data Encryption</h4>
                    <p>All data is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption standards.</p>
                    <h4 className="font-bold text-slate-800 mt-4">2. Infrastructure</h4>
                    <p>Hosted on secure cloud providers (GCP/AWS) with SOC 2 Type II compliance.</p>
                    <h4 className="font-bold text-slate-800 mt-4">3. Access Control</h4>
                    <p>Role-Based Access Control (RBAC) ensures users only access data permitted by their role level.</p>
                  </>
              ) : legalModal === 'privacy' ? (
                  <>
                    <p><strong>Effective Date: October 2023</strong></p>
                    <p>Safedify ("we", "our") is committed to protecting your privacy. This policy outlines our data practices.</p>
                    <h4 className="font-bold text-slate-800 mt-4">1. Information Collection</h4>
                    <p>We collect information you provide directly (e.g., incident reports, inspection data, user profiles) and automated usage data.</p>
                    <h4 className="font-bold text-slate-800 mt-4">2. Data Usage</h4>
                    <p>Your data is used to provide HSE services, generate analytics, and ensure compliance. We do not sell your data.</p>
                  </>
              ) : (
                  <>
                    <p><strong>Effective Date: October 2023</strong></p>
                    <p>By accessing or using Safedify, you agree to be bound by these Terms.</p>
                    <h4 className="font-bold text-slate-800 mt-4">1. License to Use</h4>
                    <p>We grant you a limited, non-exclusive license to use the platform for internal business safety management.</p>
                    <h4 className="font-bold text-slate-800 mt-4">2. User Responsibilities</h4>
                    <p>You are responsible for the accuracy of data entered. Safedify is a tool and does not replace professional legal advice.</p>
                  </>
              )}
          </div>
      );

      return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          {icon} {title}
                      </h3>
                      <button onClick={() => setLegalModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      {content}
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl text-right">
                      <button onClick={() => setLegalModal(null)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-900/20">Close</button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <LegalModal />
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-brand-orange p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                 <HardHat className="text-brand-navy" size={24} fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Safedify</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Features</button>
              <button onClick={() => scrollTo('solutions')} className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Solutions</button>
              <button onClick={() => scrollTo('pricing')} className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Pricing</button>
              <div className="h-4 w-px bg-slate-700"></div>
              <button onClick={() => navigate('/login')} className="text-white hover:text-brand-orange font-medium text-sm transition-colors">Log In</button>
              <button onClick={() => navigate('/register')} className="bg-brand-orange hover:bg-orange-500 text-brand-navy px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-orange-500/20">Get Started</button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-slate-300 hover:text-white p-2 transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 p-4 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2 z-50">
                <button onClick={() => scrollTo('features')} className="text-slate-300 hover:text-white font-medium text-left px-2 py-1">Features</button>
                <button onClick={() => scrollTo('solutions')} className="text-slate-300 hover:text-white font-medium text-left px-2 py-1">Solutions</button>
                <button onClick={() => scrollTo('pricing')} className="text-slate-300 hover:text-white font-medium text-left px-2 py-1">Pricing</button>
                <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
                    <button onClick={() => navigate('/login')} className="text-white hover:text-brand-orange font-medium text-center py-2 border border-slate-700 rounded-lg">Log In</button>
                    <button onClick={() => navigate('/register')} className="bg-brand-orange text-brand-navy font-bold text-center py-2 rounded-lg">Get Started</button>
                </div>
            </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 bg-slate-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-orange/20 blur-[100px]" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4">
            <Sparkles size={14} /> New: AI Hazard Detection 2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Safety Intelligence for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-brand-orange">The Modern Workforce</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 mb-10 leading-relaxed">
            Replace paper forms with AI-powered risk assessments, instant incident reporting, and real-time safety analytics. 
            <span className="text-slate-300"> Works offline.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-brand-orange hover:bg-orange-500 text-brand-navy rounded-xl font-bold text-lg shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={20} />
            </button>
            <button onClick={() => navigate('/login')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold text-lg transition-all">
              Live Demo
            </button>
          </div>
          
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 grayscale">
             {/* Mock Logos */}
             <div className="flex items-center justify-center gap-2 text-white font-bold text-xl"><Globe size={24}/> GlobalCorp</div>
             <div className="flex items-center justify-center gap-2 text-white font-bold text-xl"><Zap size={24}/> PowerGrid</div>
             <div className="flex items-center justify-center gap-2 text-white font-bold text-xl"><Users size={24}/> BuildSafe</div>
             <div className="flex items-center justify-center gap-2 text-white font-bold text-xl"><ShieldCheck size={24}/> SecureInd</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to ensure Zero Harm</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">From the frontline worker to the boardroom, Safedify connects your entire safety ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<BrainCircuit size={32} className="text-purple-600" />}
              title="AI Risk Assistant"
              desc="Generative AI analyzes task descriptions to identify hazards and suggest controls instantly, even for complex permits."
              color="bg-purple-50"
            />
            <FeatureCard 
              icon={<WifiOff size={32} className="text-blue-600" />}
              title="Offline First"
              desc="Work anywhere. Data syncs automatically when connection is restored. Perfect for remote sites and basements."
              color="bg-blue-50"
            />
            <FeatureCard 
              icon={<FileSignature size={32} className="text-green-600" />}
              title="Digital Permits"
              desc="Streamline PTW with digital approvals, LOTO verification, and QR code scanning for instant validity checks."
              color="bg-green-50"
            />
            <FeatureCard 
              icon={<Smartphone size={32} className="text-orange-600" />}
              title="Smart Camera"
              desc="Take a photo of a hazard or a worksite. Our AI identifies PPE violations and unsafe conditions automatically."
              color="bg-orange-50"
            />
            <FeatureCard 
              icon={<BarChart2 size={32} className="text-indigo-600" />}
              title="Predictive Analytics"
              desc="Move from lagging indicators to leading insights. Forecast risk spikes based on historical data trends."
              color="bg-indigo-50"
            />
            <FeatureCard 
              icon={<Users size={32} className="text-red-600" />}
              title="Worker Competency"
              desc="Track training, certifications, and perform AI gap analysis to ensure only qualified personnel perform tasks."
              color="bg-red-50"
            />
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-24 bg-slate-50 border-t border-slate-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="md:w-1/2">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Built for High-Risk Industries</h2>
                    <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                        Safedify is tailored to meet the rigorous demands of sectors where safety is critical. Our platform adapts to your specific regulatory requirements.
                    </p>
                    
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <HardHat size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Construction</h3>
                                <p className="text-slate-600 text-sm mt-1">Manage sub-contractors, site inductions, and daily SWMS on dynamic jobsites.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                <Factory size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Manufacturing</h3>
                                <p className="text-slate-600 text-sm mt-1">Monitor LOTO compliance, machine guarding inspections, and shift handovers.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Energy & Utilities</h3>
                                <p className="text-slate-600 text-sm mt-1">Remote worker safety tracking, geo-fencing for hazardous zones, and offline sync.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="md:w-1/2">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Safety Compliance Score</div>
                                <div className="text-xs text-slate-500">Real-time Site Status</div>
                            </div>
                            <div className="ml-auto text-2xl font-bold text-green-600">98%</div>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <span>Daily Inspection Completed - Zone A</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <span>Toolbox Talk Attendance Verified</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <span>Zero LTI Days: 45</span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            <div className="flex-1 bg-blue-50 rounded-lg border border-blue-100 p-3 flex flex-col items-center justify-center text-center">
                                <FileSignature size={20} className="text-blue-600 mb-1" />
                                <span className="text-xl font-bold text-slate-800">12</span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Active Permits</span>
                            </div>
                            <div className="flex-1 bg-purple-50 rounded-lg border border-purple-100 p-3 flex flex-col items-center justify-center text-center">
                                <Users size={20} className="text-purple-600 mb-1" />
                                <span className="text-xl font-bold text-slate-800">100%</span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Training Status</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200 scroll-mt-16">
        <PricingPlans />
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to modernize your safety culture?</h2>
          <p className="text-xl text-blue-200 mb-10">Join forward-thinking HSE teams reducing incidents by up to 40% in the first year.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-white text-brand-navy rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors">
              Get Started for Free
            </button>
            <button onClick={() => scrollTo('pricing')} className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors">
              View Pricing
            </button>
          </div>
          <p className="mt-6 text-sm text-blue-400">No credit card required for Basic plan.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
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
              <li><button onClick={() => scrollTo('features')} className="hover:text-white text-left">Incidents</button></li>
              <li><button onClick={() => scrollTo('features')} className="hover:text-white text-left">Permits</button></li>
              <li><button onClick={() => scrollTo('features')} className="hover:text-white text-left">Inspections</button></li>
              <li><button onClick={() => scrollTo('features')} className="hover:text-white text-left">AI Tools</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/plans" className="hover:text-white">Pricing Plans</Link></li>
              <li><Link to="/register" className="hover:text-white">Register</Link></li>
              <li><Link to="/login" className="hover:text-white">Login</Link></li>
              <li><a href="mailto:hello@safedify.com" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setLegalModal('privacy')} className="hover:text-white">Privacy Policy</button></li>
              <li><button onClick={() => setLegalModal('terms')} className="hover:text-white">Terms of Service</button></li>
              <li><button onClick={() => setLegalModal('security')} className="hover:text-white">Security</button></li>
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
