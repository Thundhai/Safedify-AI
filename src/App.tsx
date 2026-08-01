import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

// Providers & Layout (keep these as regular imports for immediate loading)
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoadingFallback } from './components/LoadingFallback';

// Critical pages that need immediate loading
import { Login } from './components/Login';
import { Register } from './components/Register';
import { LandingPage } from './components/LandingPage';
import { PublicPricing } from './components/PublicPricing';
import { Dashboard } from './components/Dashboard';

// Lazy load all other pages for code splitting
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard').then(module => ({default: module.AnalyticsDashboard})));
const IncidentReport = React.lazy(() => import('./components/IncidentReport').then(module => ({default: module.IncidentReport})));
const IncidentDetail = React.lazy(() => import('./components/IncidentDetail').then(module => ({default: module.IncidentDetail})));
const InspectionForm = React.lazy(() => import('./components/InspectionForm').then(module => ({default: module.InspectionForm})));
const AITools = React.lazy(() => import('./components/AITools').then(module => ({default: module.AITools})));
const SmartCamera = React.lazy(() => import('./components/SmartCamera').then(module => ({default: module.SmartCamera})));
const Gamification = React.lazy(() => import('./components/Gamification').then(module => ({default: module.Gamification})));
const RiskAssessmentList = React.lazy(() => import('./components/RiskAssessmentList').then(module => ({default: module.RiskAssessmentList})));
const RiskAssessmentForm = React.lazy(() => import('./components/RiskAssessmentForm').then(module => ({default: module.RiskAssessmentForm})));
const LiftingPlanList = React.lazy(() => import('./components/LiftingPlanList').then(module => ({default: module.LiftingPlanList})));
const LiftingPlanForm = React.lazy(() => import('./components/LiftingPlanForm').then(module => ({default: module.LiftingPlanForm})));
const ObservationList = React.lazy(() => import('./components/ObservationList').then(module => ({default: module.ObservationList})));
const ObservationForm = React.lazy(() => import('./components/ObservationForm').then(module => ({default: module.ObservationForm})));
const TrainingDashboard = React.lazy(() => import('./components/TrainingDashboard').then(module => ({default: module.TrainingDashboard})));
const WorkerDetail = React.lazy(() => import('./components/WorkerDetail').then(module => ({default: module.WorkerDetail})));
const WorkersList = React.lazy(() => import('./components/WorkersList').then(module => ({default: module.WorkersList})));
const WorkerForm = React.lazy(() => import('./components/WorkerForm').then(module => ({default: module.WorkerForm})));
const PPEDashboard = React.lazy(() => import('./components/PPEDashboard').then(module => ({default: module.PPEDashboard})));
const PermitList = React.lazy(() => import('./components/PermitList').then(module => ({default: module.PermitList})));
const PermitForm = React.lazy(() => import('./components/PermitForm').then(module => ({default: module.PermitForm})));
const AssetList = React.lazy(() => import('./components/AssetList').then(module => ({default: module.AssetList})));
const AssetDetail = React.lazy(() => import('./components/AssetDetail').then(module => ({default: module.AssetDetail})));
const ContractorList = React.lazy(() => import('./components/ContractorList').then(module => ({default: module.ContractorList})));
const ContractorDetail = React.lazy(() => import('./components/ContractorDetail').then(module => ({default: module.ContractorDetail})));
const DocumentList = React.lazy(() => import('./components/DocumentList').then(module => ({default: module.DocumentList})));
const DocumentForm = React.lazy(() => import('./components/DocumentForm').then(module => ({default: module.DocumentForm})));
const EmergencyDashboard = React.lazy(() => import('./components/EmergencyDashboard').then(module => ({default: module.EmergencyDashboard})));
const RegulatoryNews = React.lazy(() => import('./components/RegulatoryNews').then(module => ({default: module.RegulatoryNews})));
const PricingPlans = React.lazy(() => import('./components/PricingPlans').then(module => ({default: module.PricingPlans})));
const RoleManagement = React.lazy(() => import('./components/RoleManagement').then(module => ({default: module.RoleManagement})));
const ProfileSettings = React.lazy(() => import('./components/ProfileSettings').then(module => ({default: module.ProfileSettings})));
const CAPAModule = React.lazy(() => import('./components/CAPAModule').then(module => ({default: module.CAPAModule})));

// PWA and Mobile Components
import MobileNavigation from './components/MobileNavigation';
import MobileDashboard from './components/MobileDashboard';
import MobileIncidentForm from './components/MobileIncidentForm';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import pushNotificationService from './services/pushNotificationService';

// Services & Types
import { getActions, getIncidents, saveAction } from './services/storageService';
import { addToSyncQueue } from './services/offlineService';
import { initializeWalletService } from './services/walletService';
import { Incident, ActionItem, IncidentSeverity, IncidentType } from './types';

// Icons
import { 
  Filter, ArrowDownUp, X, Search, Calendar, 
  AlertTriangle, Printer, Plus, Link as LinkIcon, User 
} from 'lucide-react';

/* --- ACTION LIST COMPONENT --- */
const ActionList: React.FC = () => {
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        assignee: '',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        relatedIncidentId: ''
    });

    // Load data on mount
    useEffect(() => {
        setActions(getActions());
        setIncidents(getIncidents());
    }, []);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const action: ActionItem = {
            id: `act-${Date.now()}`,
            title: newItem.title,
            assignee: newItem.assignee,
            dueDate: newItem.dueDate,
            priority: newItem.priority as any,
            status: 'Open',
            relatedIncidentId: newItem.relatedIncidentId || undefined
        };
        saveAction(action);
        addToSyncQueue('SAVE_ACTION', `New Action: ${action.title}`);
        setActions(prev => [action, ...prev]);
        setShowModal(false);
        setNewItem({
            title: '', assignee: '', priority: 'Medium',
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            relatedIncidentId: ''
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Action Items</h2>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shadow-sm flex items-center gap-2"
                >
                    <Plus size={18} /> New Action
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {actions.map(action => {
                        const linkedIncident = incidents.find(i => i.id === action.relatedIncidentId);
                        return (
                            <div key={action.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-slate-800 dark:text-slate-100">{action.title}</p>
                                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                                            action.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                            action.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {action.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1"><User size={12}/> {action.assignee}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12}/> Due: {action.dueDate}</span>
                                        {linkedIncident && (
                                            <Link to={`/incidents/${linkedIncident.id}`} className="flex items-center gap-1 text-brand-orange hover:underline bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full text-xs">
                                                <LinkIcon size={10} /> Ref: Incident #{linkedIncident.id.split('-')[1]}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium self-start sm:self-center ${
                                    action.status === 'Done' ? 'bg-green-100 text-green-700' :
                                    action.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                    {action.status}
                                </span>
                            </div>
                        );
                    })}
                    {actions.length === 0 && <p className="p-6 text-center text-slate-400">No actions found.</p>}
                </div>
            </div>

            {/* Modal - Dark Mode Ready */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create Action Item</h3>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close modal"
                                title="Close action item modal"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange"
                                    value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="What needs to be done?" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
                                    <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-orange"
                                        value={newItem.assignee} onChange={e => setNewItem({...newItem, assignee: e.target.value})} placeholder="Name" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                                    <input 
                                        required 
                                        type="date" 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none"
                                        aria-label="Due date for action item"
                                        title="Select due date"
                                        value={newItem.dueDate} onChange={e => setNewItem({...newItem, dueDate: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-navy text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg mt-2">Create Action</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* --- INCIDENT LIST COMPONENT --- */
const IncidentList: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [sortBy, setSortBy] = useState('DateDesc');

    useEffect(() => {
        setIncidents(getIncidents());
    }, []);

    const filteredAndSortedIncidents = useMemo(() => {
        let result = [...incidents];
        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            result = result.filter(i => i.description.toLowerCase().includes(low) || i.location.toLowerCase().includes(low));
        }
        if (statusFilter !== 'All') result = result.filter(i => i.status === statusFilter);
        if (severityFilter !== 'All') result = result.filter(i => i.severity === severityFilter);
        
        result.sort((a, b) => sortBy === 'DateDesc' ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime());
        return result;
    }, [incidents, searchTerm, statusFilter, severityFilter, sortBy]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Incident Registry</h2>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                        <Printer size={18} /> Print
                    </button>
                    <Link to="/incidents/new" className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">+ Report New</Link>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden">
                <div className="p-4 border-b dark:border-slate-800 flex items-center gap-3">
                    <Search size={18} className="text-slate-400" />
                    <input type="text" placeholder="Search incidents..." className="bg-transparent border-none outline-none text-sm w-full dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="divide-y dark:divide-slate-800">
                    {filteredAndSortedIncidents.length === 0 ? (
                        incidents.length === 0 ? (
                            // No incidents at all - show EmptyState
                            <div className="p-8">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="mb-6 opacity-80">
                                        <AlertTriangle className="w-16 h-16 text-yellow-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Incidents Reported Yet</h3>
                                    <p className="text-gray-600 mb-8 max-w-md">
                                        Start building your safety record by reporting incidents, near misses, and observations. Our AI will help you identify patterns and suggest improvements.
                                    </p>
                                    <Link
                                        to="/incidents/new"
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Report First Incident
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            // Has incidents but filtered results empty
                            <div className="p-8 text-center">
                                <p className="text-slate-500">No incidents match your current filters.</p>
                                <button 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('All');
                                        setSeverityFilter('All');
                                        setTypeFilter('All');
                                        setDateFilter('All');
                                    }}
                                    className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )
                    ) : (
                        filteredAndSortedIncidents.map(inc => (
                            <Link to={`/incidents/${inc.id}`} key={inc.id} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{inc.description}</p>
                                        <p className="text-xs text-slate-500">{inc.location} • {new Date(inc.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {inc.severity}
                                    </span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* --- MAIN APP --- */
function App() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    const userAgent = navigator.userAgent;
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || 
           window.innerWidth <= 768;
  });

  // PWA functionality
  useEffect(() => {
    // Initialize push notifications
    pushNotificationService.init();

    // Handle mobile responsiveness
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize wallet service on app startup
  useEffect(() => {
    try {
      initializeWalletService();
    } catch (error) {
      console.warn('Wallet service initialization failed:', error);
    }
  }, []);

  // Mobile quick action handler
  const handleMobileQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'incident':
        window.location.hash = '/incidents/mobile-new';
        break;
      case 'observation':
        window.location.hash = '/observations/new';
        break;
      case 'photo':
        // Trigger camera capture
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.click();
        break;
      case 'voice':
        // Show voice recording interface
        alert('Voice recording feature coming soon!');
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  };

  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          {/* PWA Install Prompt */}
          <PWAInstallPrompt />
          
          {/* Mobile Navigation for PWA */}
          {isMobile && <MobileNavigation onQuickAction={handleMobileQuickAction} />}
          
          <Routes>
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/plans" element={<PublicPricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Mobile-optimized routes */}
            <Route path="/mobile-dashboard" element={
              <ProtectedRoute>
                <MobileDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/incidents/mobile-new" element={
              <ProtectedRoute>
                <MobileIncidentForm 
                  onSubmit={() => window.location.hash = '/mobile-dashboard'} 
                  onCancel={() => window.location.hash = '/mobile-dashboard'} 
                />
              </ProtectedRoute>
            } />

            <Route path="/" element={
              <ProtectedRoute>
                {isMobile ? <MobileDashboard /> : <Layout />}
              </ProtectedRoute>
            }>
              {!isMobile && (
                <>
                  <Route index element={<Dashboard />} />
                  <Route path="analytics" element={<AnalyticsDashboard />} />
                  <Route path="smart-camera" element={<SmartCamera />} />
                  <Route path="gamification" element={<Gamification />} />
                  <Route path="incidents" element={<IncidentList />} />
                  <Route path="incidents/new" element={<IncidentReport />} />
                  <Route path="incidents/:id" element={<IncidentDetail />} />
                  <Route path="emergency" element={<EmergencyDashboard />} />
                  <Route path="permits" element={<PermitList />} />
                  <Route path="permits/:id" element={<PermitForm />} />
                  <Route path="observations" element={<ObservationList />} />
                  <Route path="observations/new" element={<ObservationForm />} />
                  <Route path="inspections" element={<InspectionForm />} />
                  <Route path="risk-assessments" element={<RiskAssessmentList />} />
                  <Route path="risk-assessments/:id" element={<RiskAssessmentForm />} />
                  <Route path="lifting-plans" element={<LiftingPlanList />} />
                  <Route path="lifting-plans/:id" element={<LiftingPlanForm />} />
                  <Route path="contractors" element={<ContractorList />} />
                  <Route path="contractors/:id" element={<ContractorDetail />} />
                  <Route path="workers" element={<WorkersList />} />
                  <Route path="workers/new" element={<WorkerForm />} />
                  <Route path="workers/:id/edit" element={<WorkerForm />} />
                  <Route path="training" element={<TrainingDashboard />} />
                  <Route path="training/worker/:id" element={<WorkerDetail />} />
                  <Route path="ppe" element={<PPEDashboard />} />
                  <Route path="assets" element={<AssetList />} />
                  <Route path="assets/:id" element={<AssetDetail />} />
                  <Route path="actions" element={<CAPAModule />} />
                  <Route path="ai-tools" element={<AITools />} />
                  <Route path="documents" element={<DocumentList />} />
                  <Route path="documents/:id" element={<DocumentForm />} />
                  <Route path="pricing" element={<PricingPlans />} />
                  <Route path="roles" element={<RoleManagement />} />
                  <Route path="profile" element={<ProfileSettings />} />
                  <Route path="regulatory-news" element={<RegulatoryNews />} />
                </>
              )}
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;