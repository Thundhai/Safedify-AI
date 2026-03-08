
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  ClipboardCheck, 
  CheckSquare, 
  FileText, 
  Menu, 
  X,
  Wifi,
  WifiOff,
  ShieldAlert,
  Eye,
  GraduationCap,
  HardHat,
  FileSignature,
  Wrench,
  Briefcase,
  Siren,
  BarChart2,
  RefreshCw,
  Cloud,
  CloudOff,
  Camera,
  Map,
  Trophy,
  ChevronDown,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  CreditCard,
  Crown,
  Sparkles,
  Shield,
  Plus,
  Download,
  Globe,
  Users,
  Leaf,
  Brain
} from 'lucide-react';
import { getSyncQueue, processSyncQueue } from '../services/offlineService';
import { AIChatAssistant } from './AIChatAssistant';
import { NotificationBell } from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import { useAuth } from '../context/AuthContext';
import { SubscriptionTier } from '../types';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const { user, logout, checkPermission } = useAuth();
  const navigate = useNavigate();
  
  // Mobile FAB State & PWA
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // Navigation State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Overview': true,
    'Field Reporting': true,
    'Risk & Compliance': false,
    'Resources': false,
    'General': false,
    'Admin': true
  });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' || 
               (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const location = useLocation();

  useEffect(() => {
    // Sync Queue Monitoring
    setPendingSyncs(getSyncQueue().length);

    const handleOnline = () => {
      setIsOnline(true);
      attemptSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
        setPendingSyncs(getSyncQueue().length);
    }, 2000);

    // Simulate PWA Install Prompt Logic
    const isMobile = window.innerWidth < 768;
    // Check if not in standalone mode (browser)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isMobile && !isStandalone && !localStorage.getItem('pwa_banner_dismissed')) {
        setTimeout(() => setShowInstallBanner(true), 3000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Dark Mode Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const attemptSync = async () => {
      const count = getSyncQueue().length;
      if (count > 0 && !syncing) {
          setSyncing(true);
          try {
              await processSyncQueue();
              setPendingSyncs(0);
          } catch (e) {
              console.error("Sync failed", e);
          } finally {
              setSyncing(false);
          }
      }
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const dismissInstallBanner = () => {
      setShowInstallBanner(false);
      localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/analytics', icon: BarChart2, label: 'Analytics & KPIs' },
        { to: '/intelligence', icon: Brain, label: 'AI Intelligence' },
      ]
    },
    {
      title: 'Field Reporting',
      items: [
        { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
        { to: '/observations', icon: Eye, label: 'Observations / STOP' },
        { to: '/environmental-log', icon: Leaf, label: 'Environmental Log' },
        { to: '/smart-camera', icon: Camera, label: 'AI Safety Monitor' },
        { to: '/emergency', icon: Siren, label: 'Emergency' },
      ]
    },
    {
      title: 'Risk & Compliance',
      items: [
        { to: '/risk-assessments', icon: ShieldAlert, label: 'Risk Assessment' },
        { to: '/permits', icon: FileSignature, label: 'Permit to Work' },
        { to: '/inspections', icon: ClipboardCheck, label: 'Inspections' },
        { to: '/geo-fencing', icon: Map, label: 'Geo-Fencing' },
      ]
    },
    {
      title: 'Resources',
      items: [
        { to: '/workers', icon: Users, label: 'Workers' },
        { to: '/training', icon: GraduationCap, label: 'Training' },
        { to: '/ppe', icon: HardHat, label: 'PPE' },
        { to: '/assets', icon: Wrench, label: 'Assets' },
        { to: '/contractors', icon: Briefcase, label: 'Contractors' },
        { to: '/regulatory-news', icon: Globe, label: 'Regulatory News' },
      ]
    },
    {
      title: 'General',
      items: [
        { to: '/actions', icon: CheckSquare, label: 'Action Items' },
        { to: '/documents', icon: FileText, label: 'Documents' },
        { to: '/gamification', icon: Trophy, label: 'Safety Champions' },
      ]
    }
  ];

  // Conditionally add Admin group if user has permission
  if (checkPermission('manage_roles')) {
      navGroups.push({
          title: 'Admin',
          items: [
              { to: '/roles', icon: Shield, label: 'Role Management' }
          ]
      });
  }

  const getPageTitle = () => {
    const allItems = navGroups.flatMap(g => g.items);
    const current = allItems.find(item => location.pathname.startsWith(item.to) && item.to !== '/');
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/pricing') return 'Subscription Plans';
    if (location.pathname === '/roles') return 'Role Management';
    if (location.pathname === '/profile') return 'Account Settings';
    return current ? current.label : 'Safedify';
  };

  const renderNavLinks = () => (
    <div className="space-y-4 px-2">
      {navGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="space-y-1">
          <button 
            onClick={() => toggleGroup(group.title)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
          >
            <span>{group.title}</span>
            {expandedGroups[group.title] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {expandedGroups[group.title] && (
            <div className="space-y-1 ml-1 animate-in slide-in-from-top-1 duration-200">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                      isActive
                        ? 'bg-brand-orange text-brand-navy shadow-md font-bold'
                        : 'text-slate-100 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={18} className={item.to === '/emergency' ? 'text-red-400' : isActive ? 'text-brand-navy' : 'text-slate-400 opacity-80'} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // FAB Handlers
  const handleFabAction = (path: string) => {
      navigate(path);
      setIsFabOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden print:h-auto print:overflow-visible">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-brand-navy text-white shadow-2xl z-20 border-r border-slate-800 print:hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-brand-orange p-1.5 rounded-lg">
              <HardHat className="text-brand-navy" size={20} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Safedify</h1>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-2 pl-1">HSE Platform</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {renderNavLinks()}
        </nav>
        
        {/* Subscription Upgrade Box */}
        {user?.tier === SubscriptionTier.FREE && (
            <div className="px-4 pb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                        <Sparkles size={16} className="text-yellow-300" />
                        Upgrade to Pro
                    </div>
                    <p className="text-xs text-blue-100 mb-3 leading-snug">
                        Unlock AI Risk Analysis & Smart Camera.
                    </p>
                    <button 
                        onClick={() => navigate('/pricing')}
                        className="w-full bg-white text-blue-700 text-xs font-bold py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        View Plans
                    </button>
                </div>
            </div>
        )}

        <div className="p-4 border-t border-slate-800 bg-brand-navy">
          <div className="flex items-center justify-between mb-3 px-2">
             <span className="text-xs text-slate-400 uppercase font-bold">Logged In As</span>
             <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors" title="Logout">
                 <LogOut size={16} />
             </button>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="w-full flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-xs font-bold text-brand-navy shadow-sm">
                {user?.avatar || user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                      user?.tier === SubscriptionTier.ENTERPRISE ? 'bg-purple-500' : 
                      user?.tier === SubscriptionTier.PRO ? 'bg-blue-500' : 'bg-slate-500'
                  }`}></span>
                  <p className="text-xs text-slate-400 truncate">{user?.tier || 'Basic'} Plan</p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden print:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-navy text-white transform transition-transform duration-300 shadow-2xl md:hidden print:hidden flex flex-col ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
             <div className="bg-brand-orange p-1.5 rounded-lg">
                <HardHat className="text-brand-navy" size={20} fill="currentColor" />
             </div>
             <h1 className="text-xl font-bold text-white">Safedify</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {renderNavLinks()}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
            <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/profile'); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-sm font-bold"
            >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                    {user?.name?.charAt(0)}
                </div>
                My Profile
            </button>
            <button 
                onClick={logout} 
                className="flex items-center gap-2 w-full px-4 py-3 text-red-300 hover:bg-red-900/30 rounded-lg transition-colors text-sm font-bold"
            >
                <LogOut size={18} /> Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative print:h-auto print:overflow-visible">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 print:hidden transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-brand-navy dark:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white tracking-tight">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
             {/* Pricing Link */}
             <button 
                onClick={() => navigate('/pricing')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
             >
                 {user?.tier === SubscriptionTier.ENTERPRISE ? <Crown size={14} className="text-yellow-600" /> : <CreditCard size={14} />}
                 {user?.tier === SubscriptionTier.FREE ? 'Upgrade' : 'My Plan'}
             </button>

             {/* Global Search */}
             <GlobalSearch />

             {/* Dark Mode Toggle */}
             <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-brand-grey hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark Mode"
             >
                {isDarkMode ? <Sun size={20} className="text-brand-orange" /> : <Moon size={20} />}
             </button>

             {/* Notifications */}
             <NotificationBell />

             {/* Sync & Connectivity Status */}
             <div className="flex items-center gap-2 md:gap-3">
                 {syncing ? (
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium animate-pulse border border-blue-100 dark:border-blue-800">
                         <RefreshCw size={14} className="animate-spin" />
                         <span className="hidden sm:inline">Syncing...</span>
                     </div>
                 ) : pendingSyncs > 0 ? (
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium border border-orange-100 dark:border-orange-800" title="Items waiting to upload">
                         <CloudOff size={14} />
                         <span className="hidden sm:inline">{pendingSyncs} Pending</span>
                     </div>
                 ) : (
                     <div className="flex items-center gap-2 px-3 py-1.5 text-brand-grey dark:text-slate-500 text-xs font-medium" title="All data synced">
                         <Cloud size={14} />
                         <span className="hidden sm:inline">Synced</span>
                     </div>
                 )}

                 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                     isOnline 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                 }`}>
                    {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                 </div>
             </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8 print:p-0 print:bg-white print:overflow-visible relative scroll-smooth print:h-auto">
          <div className="max-w-7xl mx-auto pb-20 md:pb-0 print:max-w-none print:pb-0 min-h-full">
            <Outlet />
          </div>
          
          {/* Install PWA Banner (Mobile Only) */}
          {showInstallBanner && (
              <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 z-50 flex items-center justify-between shadow-2xl border-t border-slate-700 animate-in slide-in-from-bottom-5">
                  <div className="flex items-center gap-3">
                      <div className="bg-brand-orange p-2 rounded-lg">
                          <HardHat className="text-brand-navy" size={24} />
                      </div>
                      <div>
                          <p className="font-bold text-sm">Install Safedify App</p>
                          <p className="text-xs text-slate-400">Add to home screen for full experience.</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={dismissInstallBanner} 
                        className="text-slate-400 hover:text-white"
                        aria-label="Dismiss install banner"
                        title="Dismiss PWA install banner"
                      >
                          <X size={20} />
                      </button>
                  </div>
              </div>
          )}

          {/* Mobile Quick Action FAB - Visible only on mobile */}
          <div className="md:hidden fixed bottom-24 right-6 z-40 print:hidden flex flex-col items-end gap-3">
              {isFabOpen && (
                  <div className="flex flex-col items-end gap-3 animate-in slide-in-from-bottom-2 fade-in">
                      <button 
                          onClick={() => handleFabAction('/incidents/new')}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full shadow-lg font-medium text-sm hover:bg-red-700 transition-colors"
                      >
                          Report Incident <AlertTriangle size={16} />
                      </button>
                      <button 
                          onClick={() => handleFabAction('/observations/new')}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                      >
                          Log Observation <Eye size={16} />
                      </button>
                      <button 
                          onClick={() => handleFabAction('/permits/new')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full shadow-lg font-medium text-sm hover:bg-green-700 transition-colors"
                      >
                          Create Permit <FileSignature size={16} />
                      </button>
                  </div>
              )}
              <button 
                  onClick={() => setIsFabOpen(!isFabOpen)}
                  className={`p-4 rounded-full shadow-xl transition-all flex items-center justify-center ${
                      isFabOpen ? 'bg-slate-800 text-white rotate-45' : 'bg-blue-600 text-white hover:scale-105'
                  }`}
              >
                  <Plus size={24} />
              </button>
          </div>

          {/* AI Chatbot Overlay */}
          <AIChatAssistant />
        </main>
      </div>
    </div>
  );
};
