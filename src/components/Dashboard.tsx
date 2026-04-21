
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, ClipboardCheck, Sparkles, BarChart2, Zap, ShieldCheck, X, ChevronRight, Calendar, ArrowUpRight, Target, Eye, TrendingDown, Activity, GraduationCap } from 'lucide-react';
import { getIncidents, getActions, calculateSiteSafetyScore, getInspections, getRiskAssessments, getObservations, calculateHSEMetrics, getTrainingModules, getTrainingRecords } from '../services/storageService';
import { IncidentSeverity, SiteSafetyScore, SubscriptionTier, HSEMetrics } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WelcomeScreen } from './WelcomeScreen';
import { EmptyState } from './EmptyState';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { generateComprehensiveDashboardPDF } from '../services/pdfExportService';

export const Dashboard: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Check if user has completed onboarding
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(() => {
    return localStorage.getItem('onboardingCompleted') !== 'true';
  });
  
  // Data State — ALL hooks must be declared before any early return
  const [stats, setStats] = useState({
    totalIncidents: 0,
    openActions: 0,
    inspectionCount: 0,
    closedActions: 0,
    totalActions: 0,
    daysSinceLastIncident: 0,
    totalObservations: 0,
    openObservations: 0,
    closedObservations: 0,
    latestObservation: null as { type: string; description: string; date: string; location: string; status: string } | null,
    severityBreakdown: [] as { name: string; value: number }[],
    monthlyTrends: [] as { name: string; incidents: number; observations: number }[]
  });
  const [siteScore, setSiteScore] = useState<SiteSafetyScore | null>(null);
  const [hseMetrics, setHseMetrics] = useState<HSEMetrics | null>(null);
  const [hasData, setHasData] = useState(false);
  const [rawIncidents, setRawIncidents] = useState<any[]>([]);
  const [rawActions, setRawActions] = useState<any[]>([]);
  const [trainingStats, setTrainingStats] = useState({ totalModules: 0, totalRecords: 0, validRecords: 0, expiredRecords: 0, complianceRate: 0 });

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingProgress, setOnboardingProgress] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState({
      incidents: false,
      inspections: false,
      risks: false
  });

  const handleWelcomeComplete = () => {
    setIsFirstTimeUser(false);
    localStorage.setItem('onboardingCompleted', 'true');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const incidents = (await getIncidents()) || [];
        const actions = (await getActions()) || [];
        const inspections = (await getInspections()) || [];
        const risks = (await getRiskAssessments()) || [];
        const observations = (await getObservations()) || [];

        const anyData = incidents.length > 0 || actions.length > 0 || inspections.length > 0 || risks.length > 0;
        setHasData(anyData);
        setRawIncidents(incidents);
        setRawActions(actions);

        // Skip further processing if showing welcome screen
        if (isFirstTimeUser && !anyData) return;

        // Calculate Onboarding
        const hasIncidents = incidents.length > 0;
        const hasInspections = inspections.length > 0;
        const hasRisks = risks.length > 0;

        let completedCount = 0;
        if (hasIncidents) completedCount++;
        if (hasInspections) completedCount++;
        if (hasRisks) completedCount++;

        setTasksCompleted({ incidents: hasIncidents, inspections: hasInspections, risks: hasRisks });
        setOnboardingProgress(Math.round((completedCount / 3) * 100));

        // Hide onboarding if complete
        if (completedCount === 3) setShowOnboarding(false);

        // Calculate Site Score
        setSiteScore(await calculateSiteSafetyScore());

        // Calculate Training Stats
        try {
          const trainingModules = (await getTrainingModules()) || [];
          const trainingRecords = (await getTrainingRecords()) || [];
          const validRecs = trainingRecords.filter(r => r.status === 'Valid').length;
          const expiredRecs = trainingRecords.filter(r => r.status === 'Expired').length;
          const compRate = trainingRecords.length > 0 ? Math.round((validRecs / trainingRecords.length) * 100) : 0;
          setTrainingStats({ totalModules: trainingModules.length, totalRecords: trainingRecords.length, validRecords: validRecs, expiredRecords: expiredRecs, complianceRate: compRate });
        } catch { /* training data optional */ }

        // Calculate HSE Metrics (TRIR, LTIFR etc.)
        setHseMetrics(await calculateHSEMetrics());

        // Calculate Severity Breakdown
        const severityCounts: Record<string, number> = {};
        Object.values(IncidentSeverity).forEach(s => severityCounts[s] = 0);
        incidents.forEach(inc => {
          severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
        });

        const severityData = Object.keys(severityCounts).map(key => ({
          name: key,
          value: severityCounts[key] ?? 0
        }));

        // Monthly Trends — aggregate real incident + observation data by month
        const monthMap = new Map<string, { incidents: number; observations: number }>();
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString('default', { month: 'short' });
          monthMap.set(key, { incidents: 0, observations: 0 });
        }
        incidents.forEach(inc => {
          const d = new Date(inc.date);
          const key = d.toLocaleString('default', { month: 'short' });
          const entry = monthMap.get(key);
          if (entry) entry.incidents++;
        });
        observations.forEach((obs: any) => {
          const d = new Date(obs.date || obs.created_at);
          const key = d.toLocaleString('default', { month: 'short' });
          const entry = monthMap.get(key);
          if (entry) entry.observations++;
        });
        const monthlyData = Array.from(monthMap.entries()).map(([name, counts]) => ({
          name,
          incidents: counts.incidents,
          observations: counts.observations,
        }));

        // Days since last incident
        let daysSinceLastIncident = 0;
        if (incidents.length > 0) {
          const sorted = [...incidents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          daysSinceLastIncident = Math.floor((Date.now() - new Date(sorted[0]!.date).getTime()) / (1000 * 60 * 60 * 24));
        }

        // Action closure rate
        const closedActions = actions.filter(a => a.status === 'Done').length;

        // Observation stats
        const openObs = observations.filter((o: any) => o.status === 'Open').length;
        const closedObs = observations.filter((o: any) => o.status === 'Closed').length;
        const sortedObs = [...observations].sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());
        const latest = sortedObs.length > 0 ? sortedObs[0] as any : null;

        setStats({
          totalIncidents: incidents.length,
          openActions: (actions || []).filter(a => a.status !== 'Done').length,
          closedActions,
          totalActions: actions.length,
          daysSinceLastIncident,
          inspectionCount: inspections.length,
          totalObservations: observations.length,
          openObservations: openObs,
          closedObservations: closedObs,
          latestObservation: latest ? { type: latest.type, description: latest.description, date: latest.date || latest.created_at, location: latest.location, status: latest.status } : null,
          severityBreakdown: severityData,
          monthlyTrends: monthlyData
        });
        setError(null);
      } catch (error) {
        setError('Dashboard data loading error: ' + ((error as Error)?.message || 'Unknown error'));
        // Set safe defaults to prevent crashes
        setStats({
          totalIncidents: 0,
          openActions: 0,
          inspectionCount: 0,
          closedActions: 0,
          totalActions: 0,
          daysSinceLastIncident: 0,
          totalObservations: 0,
          openObservations: 0,
          closedObservations: 0,
          latestObservation: null,
          severityBreakdown: [],
          monthlyTrends: []
        });
        setSiteScore({
          score: 0,
          rating: 'Poor',
          breakdown: { incidents: 0, observations: 0, inspections: 0, training: 0, actions: 0 }
        });
        setOnboardingProgress(0);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isFirstTimeUser]);

  const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-500';
      if (score >= 75) return 'text-blue-500';
      if (score >= 60) return 'text-yellow-500';
      return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
      if (score >= 90) return 'from-green-500 to-emerald-600';
      if (score >= 75) return 'from-blue-500 to-indigo-600';
      if (score >= 60) return 'from-yellow-500 to-amber-600';
      return 'from-red-500 to-rose-600';
  };

  const SEVERITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

  const closureRate = stats.totalActions > 0 ? Math.round((stats.closedActions / stats.totalActions) * 100) : 0;

  const handleExportPDF = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    generateComprehensiveDashboardPDF({
      siteName: user?.org_name || user?.email || 'Main Site',
      generatedBy: user?.name || user?.email || 'System',
      dateRange: {
        from: sixMonthsAgo.toISOString().split('T')[0]!,
        to: now.toISOString().split('T')[0]!,
      },
      safetyScore: siteScore,
      hseMetrics,
      incidents: rawIncidents,
      actions: rawActions,
      stats: {
        totalIncidents: stats.totalIncidents,
        openActions: stats.openActions,
        closedActions: stats.closedActions,
        totalActions: stats.totalActions,
        daysSinceLastIncident: stats.daysSinceLastIncident,
        inspectionCount: stats.inspectionCount,
        totalObservations: stats.totalObservations,
        openObservations: stats.openObservations,
        closedObservations: stats.closedObservations,
        trainingModules: trainingStats.totalModules,
        complianceRate: trainingStats.complianceRate,
      },
    });
  };

  // Show welcome screen for first-time users (AFTER all hooks)
  if (isFirstTimeUser && !hasData) {
    return (
      <WelcomeScreen 
        onComplete={handleWelcomeComplete}
        userName={user?.name || user?.email || 'there'}
        organizationName="Your Organization"
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* ONBOARDING WIDGET (Visible only if not complete and not dismissed) */}
      {showOnboarding && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <button 
                  onClick={() => setShowOnboarding(false)} 
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  aria-label="Close onboarding widget"
                  title="Dismiss onboarding guide"
              >
                  <X size={20} />
              </button>
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="md:w-1/3">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">👋 {t('dashboard.welcome')}</h2>
                      <p className="text-slate-500 text-sm mb-4">{t('dashboard.welcomeSub')}</p>
                      
                      <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 transition-all duration-1000 progress-bar-fill" style={{ '--progress': `${onboardingProgress}%` } as React.CSSProperties}></div>
                          </div>
                          <span className="text-sm font-bold text-blue-600">{onboardingProgress}%</span>
                      </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                      <button 
                          onClick={() => navigate('/incidents/new')}
                          className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${tasksCompleted.incidents ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <div className={`p-1.5 rounded ${tasksCompleted.incidents ? 'bg-green-100 text-green-600' : 'bg-white text-slate-500'}`}>
                                  <AlertTriangle size={18} />
                              </div>
                              {tasksCompleted.incidents && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          <p className={`font-bold text-sm ${tasksCompleted.incidents ? 'text-green-800' : 'text-slate-700'}`}>{t('dashboard.reportIncident')}</p>
                          <p className="text-xs text-slate-500 mt-1">{t('dashboard.logFirstEvent')}</p>
                      </button>

                      <button 
                          onClick={() => navigate('/inspections')}
                          className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${tasksCompleted.inspections ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <div className={`p-1.5 rounded ${tasksCompleted.inspections ? 'bg-green-100 text-green-600' : 'bg-white text-slate-500'}`}>
                                  <ClipboardCheck size={18} />
                              </div>
                              {tasksCompleted.inspections && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          <p className={`font-bold text-sm ${tasksCompleted.inspections ? 'text-green-800' : 'text-slate-700'}`}>{t('dashboard.runInspection')}</p>
                          <p className="text-xs text-slate-500 mt-1">{t('dashboard.startChecklist')}</p>
                      </button>

                      <button 
                          onClick={() => navigate('/risk-assessments')}
                          className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${tasksCompleted.risks ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <div className={`p-1.5 rounded ${tasksCompleted.risks ? 'bg-green-100 text-green-600' : 'bg-white text-slate-500'}`}>
                                  <ShieldCheck size={18} />
                              </div>
                              {tasksCompleted.risks && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          <p className={`font-bold text-sm ${tasksCompleted.risks ? 'text-green-800' : 'text-slate-700'}`}>{t('dashboard.assessRisk')}</p>
                          <p className="text-xs text-slate-500 mt-1">{t('dashboard.createJha')}</p>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* COMMERCIAL UPSELL BANNER FOR FREE USERS */}
      {user?.tier === SubscriptionTier.FREE && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-indigo-500/30 relative overflow-hidden">
            {/* Background sparkle effect */}
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={180} />
            </div>
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/10">
                    <Sparkles className="text-yellow-400" size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-1">{t('dashboard.upgradeTitle')}</h2>
                    <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
                        {t('dashboard.upgradeSub')}
                    </p>
                </div>
            </div>
            <button 
                onClick={() => navigate('/pricing')}
                className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg whitespace-nowrap flex items-center gap-2 relative z-10"
            >
                <Zap size={16} className="text-yellow-600" /> {t('dashboard.upgradeToPro')}
            </button>
        </div>
      )}

      {/* SECTION 1: SAFETY PERFORMANCE HIGHLIGHTS */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                <BarChart2 className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('dashboard.safetyPerformance')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.keyHighlights')}</p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition"
            >
              {t('dashboard.fullAnalytics')} <ArrowUpRight size={14} />
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-lg transition"
              title="Download PDF Safety Report"
            >
              {t('dashboard.exportPdf')} ↓
            </button>
        </div>

        {/* Hero Row: Safety Score + Days Incident-Free + Observations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Safety Score Hero Card */}
            <button
              onClick={() => navigate('/analytics')}
              className={`group relative bg-gradient-to-br ${getScoreBg(siteScore?.score || 0)} text-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all text-left overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target size={120} />
              </div>
              <div className="relative z-10">
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">{t('dashboard.safetyScore')}</p>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-5xl font-black leading-none">{siteScore?.score || 0}</span>
                  <span className="text-lg font-bold text-white/80 mb-1">/ 100</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur rounded-full text-xs font-bold uppercase tracking-wide">{siteScore?.rating || 'N/A'}</span>
                </div>
                {/* Mini breakdown */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
                  <div>
                    <p className="text-white/60 text-[10px] uppercase">{t('dashboard.incidentsLabel')}</p>
                    <p className="font-bold text-sm">-{siteScore?.breakdown.incidents || 0} {t('dashboard.pts')}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] uppercase">{t('dashboard.observationsLabel')}</p>
                    <p className="font-bold text-sm">+{siteScore?.breakdown.observations || 0} {t('dashboard.pts')}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] uppercase">{t('dashboard.actionsLabel')}</p>
                    <p className="font-bold text-sm">-{siteScore?.breakdown.actions || 0} {t('dashboard.pts')}</p>
                  </div>
                </div>
              </div>
            </button>

            {/* Incident Overview Hero Card — Days Incident-Free + Total Incidents + Severity */}
            <button
              onClick={() => navigate('/incidents')}
              className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldCheck size={120} className="text-green-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Calendar className="text-green-600 dark:text-green-400" size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Incident Overview</p>
                </div>
                <div className="flex items-end gap-2 mt-3">
                  <span className={`text-5xl font-black leading-none ${stats.daysSinceLastIncident >= 30 ? 'text-green-500' : stats.daysSinceLastIncident >= 7 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {stats.totalIncidents > 0 ? stats.daysSinceLastIncident : '∞'}
                  </span>
                  <span className="text-lg font-bold text-slate-400 mb-1">{t('dashboard.daysWithoutIncident')}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">
                  {stats.daysSinceLastIncident >= 30 ? t('dashboard.excellentStreak') : stats.daysSinceLastIncident >= 7 ? t('dashboard.goodProgress') : stats.totalIncidents === 0 ? t('dashboard.noIncidents') : t('dashboard.recentIncident')}
                </p>

                {/* Merged incident stats */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                    <p className="text-xl font-black text-red-600 dark:text-red-400">{stats.totalIncidents}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.total')}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.severityBreakdown.filter(s => s.name === 'High' || s.name === 'Critical').reduce((sum, s) => sum + s.value, 0)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.highCrit')}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                    <p className="text-xl font-black text-green-600 dark:text-green-400">{stats.severityBreakdown.filter(s => s.name === 'Low' || s.name === 'Medium').reduce((sum, s) => sum + s.value, 0)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.lowMed')}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mt-3 group-hover:gap-2 transition-all">
                  View Incidents <ChevronRight size={14} />
                </span>
              </div>
            </button>

            {/* Observations Hero Card */}
            <button
              onClick={() => navigate('/observations')}
              className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-700 transition-all text-left overflow-hidden md:col-span-2 lg:col-span-1"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Eye size={120} className="text-amber-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Eye className="text-amber-600 dark:text-amber-400" size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.observations')}</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-black text-slate-800 dark:text-white">{stats.totalObservations}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.total')}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.openObservations}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.open')}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-black text-green-600 dark:text-green-400">{stats.closedObservations}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.closed')}</p>
                  </div>
                </div>

                {/* Latest Observation */}
                {stats.latestObservation ? (
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3 border border-slate-100 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${stats.latestObservation.status === 'Open' ? 'bg-amber-400' : 'bg-green-400'}`} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{t('dashboard.latest')}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{new Date(stats.latestObservation.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{stats.latestObservation.type}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{stats.latestObservation.description}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('dashboard.noObservationsYet')}</p>
                )}

                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mt-3 group-hover:gap-2 transition-all">
                  View All Observations <ChevronRight size={14} />
                </span>
              </div>
            </button>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Training */}
            <button
              onClick={() => navigate('/training')}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <GraduationCap className="text-purple-500" size={18} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{trainingStats.totalModules}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t('dashboard.trainingModules')}</p>
              {trainingStats.totalRecords > 0 && (
                <>
                  <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-700 progress-bar-fill" style={{ '--progress': `${trainingStats.complianceRate}%` } as React.CSSProperties} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{trainingStats.complianceRate}% {t('dashboard.compliant')}</p>
                </>
              )}
            </button>

            {/* Open Actions */}
            <button
              onClick={() => navigate('/actions')}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-700 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="text-yellow-500" size={18} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-yellow-400 transition-colors" />
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.openActions}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t('dashboard.openActions')}</p>
              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all duration-700 progress-bar-fill" style={{ '--progress': `${closureRate}%` } as React.CSSProperties} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{closureRate}% {t('dashboard.closed')}</p>
            </button>

            {/* Inspections */}
            <button
              onClick={() => navigate('/inspections')}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <ClipboardCheck className="text-blue-500" size={18} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.inspectionCount}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t('dashboard.inspections')}</p>
            </button>

            {/* Compliance */}
            <button
              onClick={() => navigate('/analytics')}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="text-green-500" size={18} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-green-400 transition-colors" />
              </div>
              <p className={`text-2xl font-black ${getScoreColor(siteScore?.score || 0)}`}>{siteScore ? `${siteScore.score}%` : '—'}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t('dashboard.complianceRate')}</p>
            </button>
        </div>
      </section>

      {/* SECTION 1B: LEADING INDICATORS & TREND WIDGETS */}
      <section>
        <div className="flex items-center gap-3 mb-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-sm">
                <Activity className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('dashboard.leadingIndicators')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.leadingIndicatorsSub')}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* TRIR Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="text-red-500" size={16} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TRIR</p>
              </div>
              <p className={`text-3xl font-black ${!hseMetrics || hseMetrics.trir === 0 ? 'text-green-600' : hseMetrics.trir < 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {hseMetrics ? hseMetrics.trir.toFixed(2) : '0.00'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{t('dashboard.trirFull')}</p>
              <p className="text-[10px] text-slate-400">{t('dashboard.perManHours200k')}</p>
            </div>

            {/* LTIFR Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <TrendingDown className="text-orange-500" size={16} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">LTIFR</p>
              </div>
              <p className={`text-3xl font-black ${!hseMetrics || hseMetrics.ltifr === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {hseMetrics ? hseMetrics.ltifr.toFixed(2) : '0.00'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{t('dashboard.ltifrFull')}</p>
              <p className="text-[10px] text-slate-400">{t('dashboard.perManHours1m')}</p>
            </div>

            {/* Action Closure Rate Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <CheckCircle className="text-blue-500" size={16} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.actionClosure')}</p>
              </div>
              <p className={`text-3xl font-black ${closureRate >= 80 ? 'text-green-600' : closureRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {closureRate}%
              </p>
              <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-700 progress-bar-fill" style={{ '--progress': `${closureRate}%` } as React.CSSProperties} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{stats.closedActions} {t('common.of', { defaultValue: 'of' })} {stats.totalActions} {t('dashboard.actionsLabel')} {t('dashboard.closed')}</p>
            </div>

            {/* Near Miss Reporting Rate */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Eye className="text-purple-500" size={16} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.nearMissRate')}</p>
              </div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">
                {hseMetrics ? hseMetrics.nearMissReportingRate.toFixed(1) : '0.0'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{t('dashboard.nearMissPerIncident')}</p>
              <p className="text-[10px] text-slate-400">{hseMetrics && hseMetrics.nearMissReportingRate >= 5 ? t('dashboard.strongSafetyCulture') : t('dashboard.targetPerIncident')}</p>
            </div>
        </div>

        {/* Charts Row: Monthly Trend & Severity Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Trend Sparkline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">{t('dashboard.monthlyTrend')}</h3>
                  <p className="text-xs text-slate-400">{t('dashboard.monthlyTrendSub')}</p>
                </div>
                <button onClick={() => navigate('/analytics')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  {t('dashboard.fullAnalytics')} →
                </button>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyTrends} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="observationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} fill="url(#incidentGrad)" name="Incidents" />
                    <Area type="monotone" dataKey="observations" stroke="#3b82f6" strokeWidth={2} fill="url(#observationGrad)" name="Observations" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-red-500 rounded" />
                  <span className="text-[10px] text-slate-400">{t('dashboard.incidentsLabel')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-blue-500 rounded" />
                  <span className="text-[10px] text-slate-400">{t('dashboard.observationsLabel')}</span>
                </div>
              </div>
            </div>

            {/* Severity Breakdown Donut */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{t('dashboard.severityBreakdown')}</h3>
              <p className="text-xs text-slate-400 mb-4">{t('dashboard.severityBreakdownSub')}</p>
              {stats.severityBreakdown.some(s => s.value > 0) ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.severityBreakdown.filter(s => s.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {stats.severityBreakdown.filter(s => s.value > 0).map((_, idx) => (
                            <Cell key={idx} fill={SEVERITY_COLORS[idx % SEVERITY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {stats.severityBreakdown.filter(s => s.value > 0).map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full dynamic-bg" style={{ '--bg-color': SEVERITY_COLORS[idx % SEVERITY_COLORS.length] } as React.CSSProperties} />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-slate-400 italic">{t('dashboard.noIncidentDataYet')}</p>
                </div>
              )}
            </div>
        </div>
      </section>

      {/* SECTION 2: QUICK ACCESS CARDS */}
      <section>
        <div className="flex items-center gap-3 mb-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                <Sparkles className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('dashboard.quickAccess')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.quickAccessSub')}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* AI Intelligence Card */}
            <button
              onClick={() => navigate('/intelligence')}
              className="group bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="text-yellow-300" size={20} />
                  </div>
                  <h3 className="font-bold text-lg">{t('dashboard.aiIntelligence')}</h3>
                </div>
                <p className="text-purple-100 text-sm leading-relaxed mb-3">{t('dashboard.aiIntelligenceSub')}</p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-200 uppercase tracking-wide group-hover:gap-2 transition-all">
                  {t('dashboard.viewFullReport')} <ChevronRight size={14} />
                </span>
              </div>
            </button>

            {/* Environmental Log Card */}
            <button
              onClick={() => navigate('/environmental-log')}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ClipboardCheck className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">{t('dashboard.environmentalLog')}</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">{t('dashboard.environmentalLogSub')}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide group-hover:gap-2 transition-all">
                {t('dashboard.openLog')} <ChevronRight size={14} />
              </span>
            </button>

            {/* Analytics Card */}
            <button
              onClick={() => navigate('/analytics')}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BarChart2 className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">{t('dashboard.analyticsKpis')}</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">{t('dashboard.analyticsKpisSub')}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide group-hover:gap-2 transition-all">
                {t('dashboard.viewAnalytics')} <ChevronRight size={14} />
              </span>
            </button>
        </div>
      </section>

    </div>
  );
};
