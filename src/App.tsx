import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers & Layout
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages & Components
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { LandingPage } from './components/LandingPage';
import { PublicPricing } from './components/PublicPricing';
import { Dashboard } from './components/Dashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { IncidentReport } from './components/IncidentReport';
import { IncidentDetail } from './components/IncidentDetail';
import { IncidentList } from './components/IncidentList';
import { InspectionForm } from './components/InspectionForm';
import { AITools } from './components/AITools';
import { SmartCamera } from './components/SmartCamera';
import { GeoFencing } from './components/GeoFencing';
import { Gamification } from './components/Gamification';
import { RiskAssessmentList } from './components/RiskAssessmentList';
import { RiskAssessmentForm } from './components/RiskAssessmentForm';
import { ObservationList } from './components/ObservationList';
import { ObservationForm } from './components/ObservationForm';
import { TrainingDashboard } from './components/TrainingDashboard';
import { WorkerDetail } from './components/WorkerDetail';
import { WorkersList } from './components/WorkersList';
import { WorkerForm } from './components/WorkerForm';
import { PPEDashboard } from './components/PPEDashboard';
import { PermitList } from './components/PermitList';
import { PermitForm } from './components/PermitForm';
import { AssetList } from './components/AssetList';
import { AssetDetail } from './components/AssetDetail';
import { ContractorList } from './components/ContractorList';
import { ContractorDetail } from './components/ContractorDetail';
import { DocumentList } from './components/DocumentList';
import { DocumentForm } from './components/DocumentForm';
import { EmergencyDashboard } from './components/EmergencyDashboard';
import { RegulatoryNews } from './components/RegulatoryNews';
import { PricingPlans } from './components/PricingPlans';
import { RoleManagement } from './components/RoleManagement';
import { ProfileSettings } from './components/ProfileSettings';
import { EnvironmentalLogPage } from './components/EnvironmentalLogPage';
import { ActionList } from './components/ActionList';

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
      <AuthProvider>
        <HashRouter>
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
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;