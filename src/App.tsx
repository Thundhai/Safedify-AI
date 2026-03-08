import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Providers & Layout (not lazy — needed immediately)
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Auth pages (not lazy — first interaction)
import { Login } from './components/Login';
import { Register } from './components/Register';
import { LandingPage } from './components/LandingPage';

// Lazy-loaded pages (split into separate chunks)
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword })));
const PublicPricing = React.lazy(() => import('./components/PublicPricing').then(m => ({ default: m.PublicPricing })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const IncidentReport = React.lazy(() => import('./components/IncidentReport').then(m => ({ default: m.IncidentReport })));
const IncidentDetail = React.lazy(() => import('./components/IncidentDetail').then(m => ({ default: m.IncidentDetail })));
const IncidentList = React.lazy(() => import('./components/IncidentList').then(m => ({ default: m.IncidentList })));
const InspectionForm = React.lazy(() => import('./components/InspectionForm').then(m => ({ default: m.InspectionForm })));
const AITools = React.lazy(() => import('./components/AITools').then(m => ({ default: m.AITools })));
const SmartCamera = React.lazy(() => import('./components/SmartCamera').then(m => ({ default: m.SmartCamera })));
const GeoFencing = React.lazy(() => import('./components/GeoFencing').then(m => ({ default: m.GeoFencing })));
const Gamification = React.lazy(() => import('./components/Gamification').then(m => ({ default: m.Gamification })));
const RiskAssessmentList = React.lazy(() => import('./components/RiskAssessmentList').then(m => ({ default: m.RiskAssessmentList })));
const RiskAssessmentForm = React.lazy(() => import('./components/RiskAssessmentForm').then(m => ({ default: m.RiskAssessmentForm })));
const ObservationList = React.lazy(() => import('./components/ObservationList').then(m => ({ default: m.ObservationList })));
const ObservationForm = React.lazy(() => import('./components/ObservationForm').then(m => ({ default: m.ObservationForm })));
const TrainingDashboard = React.lazy(() => import('./components/TrainingDashboard').then(m => ({ default: m.TrainingDashboard })));
const WorkerDetail = React.lazy(() => import('./components/WorkerDetail').then(m => ({ default: m.WorkerDetail })));
const WorkersList = React.lazy(() => import('./components/WorkersList').then(m => ({ default: m.WorkersList })));
const WorkerForm = React.lazy(() => import('./components/WorkerForm').then(m => ({ default: m.WorkerForm })));
const PPEDashboard = React.lazy(() => import('./components/PPEDashboard').then(m => ({ default: m.PPEDashboard })));
const PermitList = React.lazy(() => import('./components/PermitList').then(m => ({ default: m.PermitList })));
const PermitForm = React.lazy(() => import('./components/PermitForm').then(m => ({ default: m.PermitForm })));
const AssetList = React.lazy(() => import('./components/AssetList').then(m => ({ default: m.AssetList })));
const AssetDetail = React.lazy(() => import('./components/AssetDetail').then(m => ({ default: m.AssetDetail })));
const ContractorList = React.lazy(() => import('./components/ContractorList').then(m => ({ default: m.ContractorList })));
const ContractorDetail = React.lazy(() => import('./components/ContractorDetail').then(m => ({ default: m.ContractorDetail })));
const DocumentList = React.lazy(() => import('./components/DocumentList').then(m => ({ default: m.DocumentList })));
const DocumentForm = React.lazy(() => import('./components/DocumentForm').then(m => ({ default: m.DocumentForm })));
const EmergencyDashboard = React.lazy(() => import('./components/EmergencyDashboard').then(m => ({ default: m.EmergencyDashboard })));
const RegulatoryNews = React.lazy(() => import('./components/RegulatoryNews').then(m => ({ default: m.RegulatoryNews })));
const PricingPlans = React.lazy(() => import('./components/PricingPlans').then(m => ({ default: m.PricingPlans })));
const RoleManagement = React.lazy(() => import('./components/RoleManagement').then(m => ({ default: m.RoleManagement })));
const ProfileSettings = React.lazy(() => import('./components/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const EnvironmentalLogPage = React.lazy(() => import('./components/EnvironmentalLogPage').then(m => ({ default: m.EnvironmentalLogPage })));
const ActionList = React.lazy(() => import('./components/ActionList').then(m => ({ default: m.ActionList })));
const PredictiveIntelligence = React.lazy(() => import('./components/PredictiveIntelligence').then(m => ({ default: m.PredictiveIntelligence })));

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
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1e293b', color: '#f8fafc', minHeight: '100vh' }}>
          <h1 style={{ color: '#f97316', marginBottom: 16 }}>Safedify — Runtime Error</h1>
          <p style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>{this.state.error?.message}</p>
          <pre style={{ background: '#0f172a', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.5 }}>
            {this.state.error?.stack}
          </pre>
          <h3 style={{ marginTop: 24, color: '#94a3b8' }}>Component Stack</h3>
          <pre style={{ background: '#0f172a', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.5 }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.hash = '/welcome'; window.location.reload(); }}
            style={{ marginTop: 24, padding: '12px 24px', background: '#f97316', color: '#1e293b', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}
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
  return (
    <ErrorBoundary>
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="intelligence" element={<PredictiveIntelligence />} />
              <Route path="smart-camera" element={<SmartCamera />} />
              <Route path="geo-fencing" element={<GeoFencing />} />
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
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;