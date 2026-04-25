import React, { Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { initOfflineSync } from './services/offlineService';
import { AnnouncerProvider } from './utils/accessibility';

// Providers & Layout (not lazy — needed immediately)
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Auth pages (not lazy — first interaction)
import { Login } from './components/Login';
import { Register } from './components/Register';
import { VerifyEmail } from './components/VerifyEmail';
import { LandingPage } from './components/LandingPage';

/**
 * Retry wrapper for React.lazy — handles stale chunk errors after deployments.
 * If a dynamic import fails (e.g. old hash no longer exists), reload the page
 * once to fetch fresh HTML with updated chunk references.
 */
const lazyRetry = (factory: () => Promise<any>): Promise<any> => {
  const KEY = 'safedify_chunk_retry';
  return factory().catch((err: any) => {
    const hasRetried = sessionStorage.getItem(KEY);
    if (!hasRetried) {
      sessionStorage.setItem(KEY, '1');
      window.location.reload();
      // Return a never-resolving promise so React doesn't render the error
      return new Promise(() => {});
    }
    sessionStorage.removeItem(KEY);
    throw err; // Genuine error — let error boundary handle it
  });
};

// Lazy-loaded pages (split into separate chunks)
const ForgotPassword = React.lazy(() => lazyRetry(() => import('./components/ForgotPassword').then(m => ({ default: m.ForgotPassword }))));
const ResetPassword = React.lazy(() => lazyRetry(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword }))));
const PublicPricing = React.lazy(() => lazyRetry(() => import('./components/PublicPricing').then(m => ({ default: m.PublicPricing }))));
const Dashboard = React.lazy(() => lazyRetry(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard }))));
const AnalyticsDashboard = React.lazy(() => lazyRetry(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))));
const IncidentReport = React.lazy(() => lazyRetry(() => import('./components/IncidentReport').then(m => ({ default: m.IncidentReport }))));
const IncidentDetail = React.lazy(() => lazyRetry(() => import('./components/IncidentDetail').then(m => ({ default: m.IncidentDetail }))));
const IncidentList = React.lazy(() => lazyRetry(() => import('./components/IncidentList').then(m => ({ default: m.IncidentList }))));
const InspectionForm = React.lazy(() => lazyRetry(() => import('./components/InspectionForm').then(m => ({ default: m.InspectionForm }))));
const AITools = React.lazy(() => lazyRetry(() => import('./components/AITools').then(m => ({ default: m.AITools }))));
const SmartCamera = React.lazy(() => lazyRetry(() => import('./components/SmartCamera').then(m => ({ default: m.SmartCamera }))));
const Gamification = React.lazy(() => lazyRetry(() => import('./components/Gamification').then(m => ({ default: m.Gamification }))));
const RiskAssessmentList = React.lazy(() => lazyRetry(() => import('./components/RiskAssessmentList').then(m => ({ default: m.RiskAssessmentList }))));
const RiskAssessmentForm = React.lazy(() => lazyRetry(() => import('./components/RiskAssessmentForm').then(m => ({ default: m.RiskAssessmentForm }))));
const ObservationList = React.lazy(() => lazyRetry(() => import('./components/ObservationList').then(m => ({ default: m.ObservationList }))));
const ObservationForm = React.lazy(() => lazyRetry(() => import('./components/ObservationForm').then(m => ({ default: m.ObservationForm }))));
const TrainingDashboard = React.lazy(() => lazyRetry(() => import('./components/TrainingDashboard').then(m => ({ default: m.TrainingDashboard }))));
const WorkerDetail = React.lazy(() => lazyRetry(() => import('./components/WorkerDetail').then(m => ({ default: m.WorkerDetail }))));
const WorkersList = React.lazy(() => lazyRetry(() => import('./components/WorkersList').then(m => ({ default: m.WorkersList }))));
const WorkerForm = React.lazy(() => lazyRetry(() => import('./components/WorkerForm').then(m => ({ default: m.WorkerForm }))));
const PPEDashboard = React.lazy(() => lazyRetry(() => import('./components/PPEDashboard').then(m => ({ default: m.PPEDashboard }))));
const PermitList = React.lazy(() => lazyRetry(() => import('./components/PermitList').then(m => ({ default: m.PermitList }))));
const PermitForm = React.lazy(() => lazyRetry(() => import('./components/PermitForm').then(m => ({ default: m.PermitForm }))));
const AssetList = React.lazy(() => lazyRetry(() => import('./components/AssetList').then(m => ({ default: m.AssetList }))));
const AssetDetail = React.lazy(() => lazyRetry(() => import('./components/AssetDetail').then(m => ({ default: m.AssetDetail }))));
const ContractorList = React.lazy(() => lazyRetry(() => import('./components/ContractorList').then(m => ({ default: m.ContractorList }))));
const ContractorDetail = React.lazy(() => lazyRetry(() => import('./components/ContractorDetail').then(m => ({ default: m.ContractorDetail }))));
const DocumentList = React.lazy(() => lazyRetry(() => import('./components/DocumentList').then(m => ({ default: m.DocumentList }))));
const DocumentForm = React.lazy(() => lazyRetry(() => import('./components/DocumentForm').then(m => ({ default: m.DocumentForm }))));
const EmergencyDashboard = React.lazy(() => lazyRetry(() => import('./components/EmergencyDashboard').then(m => ({ default: m.EmergencyDashboard }))));
const RegulatoryNews = React.lazy(() => lazyRetry(() => import('./components/RegulatoryNews').then(m => ({ default: m.RegulatoryNews }))));
const PricingPlans = React.lazy(() => lazyRetry(() => import('./components/PricingPlans').then(m => ({ default: m.PricingPlans }))));
const RoleManagement = React.lazy(() => lazyRetry(() => import('./components/RoleManagement').then(m => ({ default: m.RoleManagement }))));
const ProfileSettings = React.lazy(() => lazyRetry(() => import('./components/ProfileSettings').then(m => ({ default: m.ProfileSettings }))));
const EnvironmentalLogPage = React.lazy(() => lazyRetry(() => import('./components/EnvironmentalLogPage').then(m => ({ default: m.EnvironmentalLogPage }))));
const ActionList = React.lazy(() => lazyRetry(() => import('./components/ActionList').then(m => ({ default: m.ActionList }))));
const PredictiveIntelligence = React.lazy(() => lazyRetry(() => import('./components/PredictiveIntelligence').then(m => ({ default: m.PredictiveIntelligence }))));
const LegalPage = React.lazy(() => lazyRetry(() => import('./components/LegalPage').then(m => ({ default: m.LegalPage }))));
const SiteManagement = React.lazy(() => lazyRetry(() => import('./components/SiteManagement').then(m => ({ default: m.SiteManagement }))));

/* --- LOADING FALLBACK --- */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-orange rounded-full animate-spin" />
      <span className="text-sm text-slate-500 font-medium">Loading…</span>
    </div>
  </div>
);

/* --- ERROR BOUNDARY --- */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Auto-reload on chunk loading errors (stale deployment)
    const msg = error?.message || '';
    if (msg.includes('dynamically imported module') || msg.includes('Loading chunk') || msg.includes('Failed to fetch')) {
      if (!sessionStorage.getItem('safedify_chunk_retry')) {
        sessionStorage.setItem('safedify_chunk_retry', '1');
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isChunkError = msg.includes('dynamically imported module') || msg.includes('Loading chunk') || msg.includes('Failed to fetch');

      if (isChunkError) {
        return (
          <div className="p-10 font-sans bg-slate-800 text-slate-50 min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-orange-500 mb-4 text-2xl font-bold">New Version Available</h1>
            <p className="text-slate-400 text-base mb-6">A new version of Safedify has been deployed. Please refresh to continue.</p>
            <button 
              onClick={() => { sessionStorage.removeItem('safedify_chunk_retry'); window.location.reload(); }}
              className="py-3 px-8 bg-orange-500 text-slate-800 border-none rounded-lg font-bold cursor-pointer text-base hover:bg-orange-400 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        );
      }

      return (
        <div className="p-10 font-mono bg-slate-800 text-slate-50 min-h-screen">
          <h1 className="text-orange-500 mb-4 text-2xl font-bold">Safedify — Runtime Error</h1>
          <p className="text-red-500 text-lg mb-2">{this.state.error?.message}</p>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-auto text-sm leading-relaxed">
            {this.state.error?.stack}
          </pre>
          <h3 className="mt-6 text-slate-400 text-lg font-semibold">Component Stack</h3>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-auto text-sm leading-relaxed">
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.hash = '/welcome'; window.location.reload(); }}
            className="mt-6 py-3 px-6 bg-orange-500 text-slate-800 border-none rounded-lg font-bold cursor-pointer text-sm hover:bg-orange-400 transition-colors"
          >
            Go to Welcome Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* --- MAIN APP --- */
function App() {
  // Initialize offline sync listeners on mount
  useEffect(() => {
    initOfflineSync();
  }, []);

  return (
    <ErrorBoundary>
      <AnnouncerProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: 500, maxWidth: '420px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 5000 },
        }}
      />
      <AuthProvider>
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/plans" element={<PublicPricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="intelligence" element={<PredictiveIntelligence />} />
              <Route path="smart-camera" element={<SmartCamera />} />
              <Route path="gamification" element={<Gamification />} />
              <Route path="incidents" element={<IncidentList />} />
              <Route path="incidents/new" element={<IncidentReport />} />
              <Route path="incidents/:id" element={<IncidentDetail />} />
              <Route path="environmental-log" element={<EnvironmentalLogPage />} />
              <Route path="emergency" element={<EmergencyDashboard />} />
              <Route path="permits" element={<PermitList />} />
              <Route path="permits/:id" element={<PermitForm />} />
              <Route path="observations" element={<ObservationList />} />
              <Route path="observations/new" element={<ObservationForm />} />
              <Route path="inspections" element={<InspectionForm />} />
              <Route path="risk-assessments" element={<RiskAssessmentList />} />
              <Route path="risk-assessments/:id" element={<RiskAssessmentForm />} />
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
              <Route path="actions" element={<ActionList />} />
              <Route path="ai-tools" element={<AITools />} />
              <Route path="documents" element={<DocumentList />} />
              <Route path="documents/:id" element={<DocumentForm />} />
              <Route path="pricing" element={<PricingPlans />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="regulatory-news" element={<RegulatoryNews />} />
              <Route path="sites" element={<SiteManagement />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </HashRouter>
      </AuthProvider>
      </AnnouncerProvider>
    </ErrorBoundary>
  );
}

export default App;