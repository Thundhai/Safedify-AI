
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, ClipboardCheck, Sparkles, Loader2, Gauge, BarChart2, Zap, ShieldCheck, Plus, X, ChevronRight, PlayCircle } from 'lucide-react';
import { getIncidents, getActions, calculateSiteSafetyScore, calculateHSEMetrics, getInspections, getRiskAssessments } from '../services/storageService';
import { predictiveSafetyAlertsAI } from '../services/geminiService';
import { Incident, ActionItem, IncidentSeverity, SiteSafetyScore, SubscriptionTier } from '../types';
import { EnvironmentalCard } from './EnvironmentalCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [stats, setStats] = useState({
    totalIncidents: 0,
    openActions: 0,
    severityBreakdown: [] as { name: string; value: number }[],
    monthlyTrends: [] as { name: string; incidents: number }[]
  });
  const [siteScore, setSiteScore] = useState<SiteSafetyScore | null>(null);
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingProgress, setOnboardingProgress] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState({
      incidents: false,
      inspections: false,
      risks: false
  });

  useEffect(() => {
    try {
      const incidents = getIncidents() || [];
      const actions = getActions() || [];
      const inspections = getInspections() || [];
      const risks = getRiskAssessments() || [];
    
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
    setSiteScore(calculateSiteSafetyScore());

    // Calculate Severity Breakdown
    const severityCounts: Record<string, number> = {};
    Object.values(IncidentSeverity).forEach(s => severityCounts[s] = 0);
    incidents.forEach(inc => {
      severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
    });
    
    const severityData = Object.keys(severityCounts).map(key => ({
      name: key,
      value: severityCounts[key]
    }));

    // Mock Monthly Trends
    const monthlyData = [
      { name: 'Jan', incidents: 4 },
      { name: 'Feb', incidents: 2 },
      { name: 'Mar', incidents: 5 },
      { name: 'Apr', incidents: incidents.length } 
    ];

    setStats({
      totalIncidents: incidents.length,
      openActions: (actions || []).filter(a => a.status !== 'Done').length,
      severityBreakdown: severityData,
      monthlyTrends: monthlyData
    });

    // Run Predictive Analysis (Only if Pro or higher AND there is data)
    if (user?.tier !== SubscriptionTier.FREE && incidents.length > 0) {
        setLoadingPredictions(true);
        const metrics = calculateHSEMetrics();
        predictiveSafetyAlertsAI(metrics, incidents)
            .then(res => {
                if (res && Array.isArray(res.predictions)) {
                    setPredictiveAlerts(res.predictions);
                } else {
                    setPredictiveAlerts([]);
                }
            })
            .catch(err => {
                console.error("Predictive Alert Error:", err);
                setPredictiveAlerts([]);
            })
            .finally(() => setLoadingPredictions(false));
    }

    } catch (error) {
      console.error('Dashboard data loading error:', error);
      // Set safe defaults to prevent crashes
      setStats({
        totalIncidents: 0,
        openActions: 0,
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
  }, [user]);

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

  const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-600';
      if (score >= 75) return 'text-blue-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
  };

  const gaugeData = [
    { name: 'Poor', value: 60, fill: '#ef4444' },      // 0-60
    { name: 'Fair', value: 15, fill: '#eab308' },      // 60-75
    { name: 'Good', value: 15, fill: '#3b82f6' },      // 75-90
    { name: 'Excellent', value: 10, fill: '#22c55e' }, // 90-100
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* ONBOARDING WIDGET (Visible only if not complete and not dismissed) */}
      {showOnboarding && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <button 
                  onClick={() => setShowOnboarding(false)} 
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                  <X size={20} />
              </button>
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="md:w-1/3">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">👋 Welcome to Safedify!</h2>
                      <p className="text-slate-500 text-sm mb-4">Get your safety workspace ready in 3 simple steps.</p>
                      
                      <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${onboardingProgress}%` }}></div>
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
                          <p className={`font-bold text-sm ${tasksCompleted.incidents ? 'text-green-800' : 'text-slate-700'}`}>Report Incident</p>
                          <p className="text-xs text-slate-500 mt-1">Log your first event</p>
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
                          <p className={`font-bold text-sm ${tasksCompleted.inspections ? 'text-green-800' : 'text-slate-700'}`}>Run Inspection</p>
                          <p className="text-xs text-slate-500 mt-1">Start a digital checklist</p>
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
                          <p className={`font-bold text-sm ${tasksCompleted.risks ? 'text-green-800' : 'text-slate-700'}`}>Assess Risk</p>
                          <p className="text-xs text-slate-500 mt-1">Create a JHA or HIRA</p>
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
                    <h2 className="text-xl font-bold mb-1">Unlock AI Safety Intelligence</h2>
                    <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
                        You are on the <b>Basic Plan</b>. Upgrade to Pro to enable AI Risk Assessments, Predictive Trends, Smart Camera Hazards, and unlimited history.
                    </p>
                </div>
            </div>
            <button 
                onClick={() => navigate('/pricing')}
                className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg whitespace-nowrap flex items-center gap-2 relative z-10"
            >
                <Zap size={16} className="text-yellow-600" /> Upgrade to Pro
            </button>
        </div>
      )}

      {/* SECTION 1: STATISTICS & METRICS */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                <BarChart2 className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Safety Performance</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Real-time KPIs and incident statistics</p>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left Column: KPIs & Charts (Span 3) */}
            <div className="xl:col-span-3 space-y-6">
                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1: Incidents */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Incidents</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.totalIncidents}</h3>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle size={20} />
                        </div>
                    </div>

                    {/* KPI 2: Open Actions */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Open Actions</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.openActions}</h3>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-yellow-600 dark:text-yellow-400">
                            <Clock size={20} />
                        </div>
                    </div>

                    {/* KPI 3: Compliance */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compliance</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">94%</h3>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-green-600 dark:text-green-400">
                            <CheckCircle size={20} />
                        </div>
                    </div>

                    {/* KPI 4: Inspections */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inspections</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">12</h3>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                            <ClipboardCheck size={20} />
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wide">Incident Trends (YTD)</h3>
                        <div className="h-64 w-full" style={{ minHeight: '200px', minWidth: '300px' }}>
                            {stats.totalIncidents > 0 && Array.isArray(stats.monthlyTrends) && stats.monthlyTrends.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                                    <BarChart data={stats.monthlyTrends || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                            itemStyle={{color: '#1e293b'}}
                                        />
                                        <Bar dataKey="incidents" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="bg-green-50 p-4 rounded-full mb-3">
                                        <ShieldCheck size={32} className="text-green-600" />
                                    </div>
                                    <p className="text-slate-800 font-bold">Excellent Safety Record!</p>
                                    <p className="text-slate-500 text-sm">No incidents reported yet.</p>
                                    <button onClick={() => navigate('/incidents/new')} className="mt-3 text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                        <Plus size={12} /> Report Incident
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wide">Severity Breakdown</h3>
                        <div className="h-64 w-full" style={{ minHeight: '200px', minWidth: '300px' }}>
                            {stats.totalIncidents > 0 && Array.isArray(stats.severityBreakdown) && stats.severityBreakdown.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                                        <PieChart>
                                            <Pie
                                                data={stats.severityBreakdown || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                            {(stats.severityBreakdown || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % (COLORS?.length || 5)]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                                itemStyle={{color: '#1e293b'}}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-slate-800 dark:text-white block">{stats.totalIncidents}</span>
                                            <span className="text-xs text-slate-500 uppercase">Total</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="bg-slate-100 p-4 rounded-full mb-3">
                                        <Sparkles size={32} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 text-sm">Waiting for data...</p>
                                </div>
                            )}
                        </div>
                        {stats.totalIncidents > 0 && (
                            <div className="flex flex-wrap justify-center gap-3 mt-2">
                                {stats.severityBreakdown.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % (COLORS?.length || 5)] }}></div>
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Score (Span 1) */}
            <div className="xl:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between h-full min-h-[400px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Gauge size={150} className="text-brand-navy dark:text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-brand-navy dark:text-white">Digital Safety Score</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time compliance rating</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center relative my-6">
                        <ResponsiveContainer width="100%" height={220} minWidth={250} minHeight={200}>
                            <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="75%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {gaugeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        
                        <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                             <div className="relative w-0 h-0">
                                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-navy dark:bg-white rounded-full z-10 shadow-md" />
                                 <div 
                                    className="absolute bottom-2 left-1/2 -ml-0.5 w-1 h-20 bg-brand-navy dark:bg-white rounded-t-full origin-bottom transition-transform duration-1000 ease-out shadow-sm"
                                    style={{ transform: `rotate(${(siteScore?.score || 0) * 1.8 - 90}deg)` }}
                                 />
                             </div>
                             <div className="mt-6 text-center">
                                 <span className={`text-5xl font-bold ${getScoreColor(siteScore?.score || 0)}`}>{siteScore?.score || 0}</span>
                                 <p className="text-sm font-bold text-slate-400 uppercase mt-1 tracking-widest">{siteScore?.rating || 'N/A'}</p>
                             </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Incidents Impact</span>
                            <span className="font-bold text-red-500">-{siteScore?.breakdown.incidents} pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Observations Bonus</span>
                            <span className="font-bold text-green-500">+{siteScore?.breakdown.observations} pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Open Actions Penalty</span>
                            <span className="font-bold text-orange-500">-{siteScore?.breakdown.actions} pts</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* SECTION 2: INTELLIGENCE & ENVIRONMENT */}
      <section>
        <div className="flex items-center gap-3 mb-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
                <Sparkles className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Predictive & Environmental Intelligence</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI-driven forecasts and site condition monitoring</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Environmental Card */}
            <EnvironmentalCard />

            {/* Predictive Risk Forecast */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md border border-slate-700 relative overflow-hidden flex flex-col h-full min-h-[300px]">
                {/* Overlay for Free Users */}
                {user?.tier === SubscriptionTier.FREE && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
                        <Sparkles size={48} className="text-yellow-400 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Predictive AI Analytics</h3>
                        <p className="text-slate-300 mb-6 text-sm">Upgrade to Pro to unlock 7-day risk forecasting and trend analysis.</p>
                        <button 
                            onClick={() => navigate('/pricing')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
                        >
                            Unlock Intelligence
                        </button>
                    </div>
                )}

                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={150} />
                </div>
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Sparkles className="text-yellow-400" size={20} />
                        </div>
                        <h3 className="text-lg font-bold">Predictive Risk Forecast (7 Days)</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {loadingPredictions ? (
                            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                <Loader2 className="animate-spin" /> Analyzing historical data...
                            </div>
                        ) : (predictiveAlerts || []).length > 0 ? (
                            predictiveAlerts.map((alert, idx) => (
                                <div key={idx} className="bg-white/10 border border-white/10 p-4 rounded-xl flex items-start gap-4 backdrop-blur-sm hover:bg-white/20 transition-colors">
                                    <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${alert.likelihood === 'High' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'bg-yellow-500'}`}></div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${alert.likelihood === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                {alert.likelihood} Probability
                                            </span>
                                        </div>
                                        <p className="font-bold text-white mb-1">{alert.alert}</p>
                                        <p className="text-sm text-slate-300">{alert.suggestedMitigation}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <CheckCircle size={48} className="text-green-500/50 mb-2" />
                                <p>No critical risk patterns detected for the upcoming week.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </section>

    </div>
  );
};
