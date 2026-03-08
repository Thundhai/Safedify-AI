
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar,
    ScatterChart, Scatter, ZAxis, ComposedChart
} from 'recharts';
import { 
    AlertTriangle, TrendingUp, Activity, CheckSquare, Sparkles, Loader2, 
    FileText, Calendar, Users, MapPin, Plus, X, Calculator, Lock, BarChart3, Shield
} from 'lucide-react';
import { calculateHSEMetrics, getIncidents, saveStatsLog } from '../services/storageService';
import { generateExecutiveReportAI } from '../services/geminiService';
import { HSEMetrics, Incident, IncidentType, HSEStatsLog, SubscriptionTier } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AnalyticsDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<HSEMetrics | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeTab, setActiveTab] = useState<'kpi' | 'trends' | 'risk' | 'ai'>('kpi');
    
    // AI State
    const [aiReport, setAiReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    // Stats Input Modal State
    const [showInputModal, setShowInputModal] = useState(false);
    
    // Calculation State
    const [hoursPerDay, setHoursPerDay] = useState(10);
    const [daysWorked, setDaysWorked] = useState(1);

    const [statsEntry, setStatsEntry] = useState<Partial<HSEStatsLog>>({
        date: new Date().toISOString().split('T')[0],
        period: 'Daily',
        manHours: 0,
        activeWorkers: 0,
        remarks: ''
    });

    const refreshData = useCallback(async () => {
        const calculated = await calculateHSEMetrics();
        setMetrics(calculated);
        setIncidents(await getIncidents());
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Derived: Man Hours = Manpower × Hours × Days (useMemo avoids render loops)
    const calculatedManHours = useMemo(() => {
        const workers = Number(statsEntry.activeWorkers) || 0;
        return workers * hoursPerDay * daysWorked;
    }, [statsEntry.activeWorkers, hoursPerDay, daysWorked]);

    const handleSaveStats = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newLog: HSEStatsLog = {
            id: `log-${Date.now()}`,
            date: statsEntry.date!,
            period: statsEntry.period as any,
            manHours: calculatedManHours,
            activeWorkers: Number(statsEntry.activeWorkers),
            remarks: statsEntry.remarks
        };
        
        await saveStatsLog(newLog);
        await refreshData();
        setShowInputModal(false);
        
        // Reset form
        setStatsEntry({
            date: new Date().toISOString().split('T')[0],
            period: 'Daily',
            manHours: 0,
            activeWorkers: 0,
            remarks: ''
        });
        setHoursPerDay(10);
        setDaysWorked(1);
        
        toast.success("Statistics logged successfully!");
    };

    const handlePeriodChange = (period: string) => {
        setStatsEntry(prev => ({ ...prev, period: period as any }));
        // Suggest days based on period
        if (period === 'Daily') setDaysWorked(1);
        if (period === 'Weekly') setDaysWorked(6);
        if (period === 'Monthly') setDaysWorked(26);
    };

    const handleGenerateReport = async () => {
        if (user?.tier === SubscriptionTier.FREE) {
            navigate('/pricing');
            return;
        }
        if (!metrics) return;
        setLoadingReport(true);
        try {
            const report = await generateExecutiveReportAI(metrics);
            setAiReport(report);
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate AI report.");
        } finally {
            setLoadingReport(false);
        }
    };

    // --- All useMemo hooks MUST be called unconditionally (before any early return) ---

    // Incident Trend Data (Based on Current Data Only)
    const incidentTrendData = useMemo(() => [
        { month: 'Current Period', count: incidents.length, lti: metrics?.ltiCount ?? 0 },
    ], [incidents.length, metrics?.ltiCount]);

    const typeData = useMemo(() => [
        { name: 'Near Miss', value: metrics?.nmCount ?? 0 },
        { name: 'First Aid', value: metrics?.facCount ?? 0 },
        { name: 'Medical Tx', value: metrics?.mtcCount ?? 0 },
        { name: 'LTI', value: metrics?.ltiCount ?? 0 },
    ].filter(d => d.value > 0), [metrics?.nmCount, metrics?.facCount, metrics?.mtcCount, metrics?.ltiCount]);

    const locationChartData = useMemo(() => {
        const locationMap = incidents.reduce((acc, curr) => {
            const loc = curr.location.split('-')[0].trim() || 'Unknown';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.keys(locationMap).map(k => ({ name: k, count: locationMap[k] }));
    }, [incidents]);

    // Monthly trend data grouped by month
    const monthlyTrendData = useMemo(() => {
        const months: Record<string, { total: number; lti: number; nm: number; fac: number; mtc: number }> = {};
        incidents.forEach(inc => {
            const d = new Date(inc.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { total: 0, lti: 0, nm: 0, fac: 0, mtc: 0 };
            months[key].total++;
            if (inc.category === 'Lost Time Injury') months[key].lti++;
            if (inc.category === 'Near Miss') months[key].nm++;
            if (inc.category === 'First Aid Case') months[key].fac++;
            if (inc.category === 'Medical Treatment Case') months[key].mtc++;
        });
        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, data]) => ({ month, ...data }));
    }, [incidents]);

    // Severity rate
    const severityRate = useMemo(() => (metrics?.totalManHours ?? 0) > 0
        ? (((metrics?.ltiCount ?? 0) * 200000) / (metrics?.totalManHours ?? 1))
        : 0, [metrics?.ltiCount, metrics?.totalManHours]);

    // Risk matrix data: 5x5 grid (likelihood x severity)
    const riskMatrixData = useMemo(() => {
        const severityMap: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
        const likelihoodMap: Record<string, number> = { 'Near Miss': 4, 'First Aid Case': 3, 'Medical Treatment Case': 2, 'Lost Time Injury': 1 };
        const grid: Record<string, number> = {};
        incidents.forEach(inc => {
            const sev = severityMap[inc.severity] || 2;
            const lik = likelihoodMap[inc.category] || 2;
            const key = `${lik}-${sev}`;
            grid[key] = (grid[key] || 0) + 1;
        });
        const result: Array<{ likelihood: number; severity: number; count: number; riskLevel: string }> = [];
        for (let l = 1; l <= 5; l++) {
            for (let s = 1; s <= 5; s++) {
                const count = grid[`${l}-${s}`] || 0;
                const score = l * s;
                const riskLevel = score >= 15 ? 'Critical' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low';
                result.push({ likelihood: l, severity: s, count, riskLevel });
            }
        }
        return result;
    }, [incidents]);

    // Leading vs lagging comparison
    const leadingVsLagging = useMemo(() => [
        { name: 'Near Misses', value: metrics?.nmCount ?? 0, type: 'Leading' },
        { name: 'Inspections', value: Math.round(metrics?.inspectionCompliance ?? 0), type: 'Leading' },
        { name: 'First Aid', value: metrics?.facCount ?? 0, type: 'Lagging' },
        { name: 'Medical Tx', value: metrics?.mtcCount ?? 0, type: 'Lagging' },
        { name: 'LTI', value: metrics?.ltiCount ?? 0, type: 'Lagging' },
    ], [metrics?.nmCount, metrics?.inspectionCompliance, metrics?.facCount, metrics?.mtcCount, metrics?.ltiCount]);

    const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

    // --- Guard clause: show loader while metrics are loading ---
    if (!metrics) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Analytics & KPIs</h2>
                    <p className="text-slate-500">Executive dashboard and safety performance monitoring.</p>
                </div>
                
                {/* Stats Action */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase mr-2">Total Man Hours:</span>
                    <span className="text-sm font-bold text-slate-800 mr-4">{metrics.totalManHours.toLocaleString()}</span>
                    <button 
                        onClick={() => setShowInputModal(true)}
                        className="flex items-center gap-1 text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={14} /> Log Data
                    </button>
                </div>
            </div>

            {/* Input Stats Modal */}
            {showInputModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Calculator size={20} className="text-blue-600"/> Log Safe Man-Hours
                            </h3>
                            <button onClick={() => setShowInputModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveStats} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input 
                                        required
                                        type="date" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                        value={statsEntry.date}
                                        onChange={e => setStatsEntry({...statsEntry, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                        value={statsEntry.period}
                                        onChange={e => handlePeriodChange(e.target.value)}
                                    >
                                        <option value="Daily">Daily Report</option>
                                        <option value="Weekly">Weekly Summary</option>
                                        <option value="Monthly">Monthly Aggregate</option>
                                    </select>
                                </div>
                            </div>

                            {/* Safe Man Hours Formula Inputs */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                <p className="text-xs text-slate-500 font-bold uppercase border-b border-slate-200 pb-2 mb-2">Calculation Formula</p>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Manpower</label>
                                        <input 
                                            required
                                            type="number"
                                            min="0"
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-center font-bold"
                                            value={statsEntry.activeWorkers || ''}
                                            onChange={e => setStatsEntry({...statsEntry, activeWorkers: parseInt(e.target.value)})}
                                            placeholder="Workers"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center justify-center pt-5">
                                        <span className="text-slate-400 font-bold">×</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Hours / Day</label>
                                        <input 
                                            required
                                            type="number"
                                            min="0"
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-center font-bold"
                                            value={hoursPerDay}
                                            onChange={e => setHoursPerDay(parseFloat(e.target.value))}
                                            placeholder="Hrs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Days Worked</label>
                                        <input 
                                            required
                                            type="number"
                                            min="0"
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-center font-bold"
                                            value={daysWorked}
                                            onChange={e => setDaysWorked(parseFloat(e.target.value))}
                                            placeholder="Days"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <div className="bg-blue-100 p-3 rounded-lg border border-blue-200 text-center">
                                            <span className="block text-xs text-blue-700 uppercase font-bold mb-1">Total Safe Man-Hours</span>
                                            <span className="text-2xl font-bold text-blue-900">{calculatedManHours.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Optional)</label>
                                <textarea 
                                    rows={2}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm resize-none"
                                    value={statsEntry.remarks}
                                    onChange={e => setStatsEntry({...statsEntry, remarks: e.target.value})}
                                    placeholder="e.g., Night shift included"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowInputModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                                >
                                    Save Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('kpi')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'kpi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Activity size={16} /> Key Performance Indicators
                </button>
                <button 
                    onClick={() => setActiveTab('trends')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'trends' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <TrendingUp size={16} /> Trends & Heatmaps
                </button>
                <button 
                    onClick={() => setActiveTab('risk')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'risk' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Shield size={16} /> Risk Matrix
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Sparkles size={16} /> AI Executive Report
                </button>
            </div>

            {/* KPI VIEW */}
            {activeTab === 'kpi' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Top Level Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">TRIR</p>
                            <h3 className={`text-3xl font-bold mt-1 ${metrics.trir === 0 ? 'text-green-600' : metrics.trir < 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {metrics.trir.toFixed(2)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">Target: &lt; 1.0</p>
                            <div className="absolute -right-4 -bottom-4 opacity-10 text-slate-500">
                                <Activity size={80} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">LTIFR</p>
                            <h3 className={`text-3xl font-bold mt-1 ${metrics.ltifr === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {metrics.ltifr.toFixed(2)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">Target: 0.0</p>
                            <div className="absolute -right-4 -bottom-4 opacity-10 text-slate-500">
                                <AlertTriangle size={80} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Severity Rate</p>
                            <h3 className={`text-3xl font-bold mt-1 ${severityRate === 0 ? 'text-green-600' : severityRate < 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {severityRate.toFixed(1)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">Lost days per 200k hrs</p>
                            <div className="absolute -right-4 -bottom-4 opacity-10 text-slate-500">
                                <Shield size={80} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Closure Rate</p>
                             <div className="flex items-center gap-4 mt-2">
                                <div className="text-3xl font-bold text-blue-600">{metrics.actionClosureRate.toFixed(0)}%</div>
                                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${metrics.actionClosureRate}%` }}></div>
                                </div>
                             </div>
                        </div>
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspection Score</p>
                             <div className="flex items-center gap-4 mt-2">
                                <div className="text-3xl font-bold text-green-600">{metrics.inspectionCompliance.toFixed(0)}%</div>
                                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: `${metrics.inspectionCompliance}%` }}></div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6">Lagging Indicators (Incident Types)</h3>
                                <div className="h-64 w-full" style={{ minHeight: '200px', minWidth: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                                    <BarChart data={[
                                        { name: 'LTI', count: metrics.ltiCount },
                                        { name: 'Medical', count: metrics.mtcCount },
                                        { name: 'First Aid', count: metrics.facCount },
                                        { name: 'Near Miss', count: metrics.nmCount }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                            {
                                                [
                                                    { name: 'LTI', color: '#ef4444' },
                                                    { name: 'Medical', color: '#f97316' },
                                                    { name: 'First Aid', color: '#eab308' },
                                                    { name: 'Near Miss', color: '#22c55e' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6">Incident Ratios</h3>
                            <div className="h-64 w-full" style={{ minHeight: '200px', minWidth: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                                    <PieChart>
                                        <Pie
                                            data={typeData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {typeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} iconSize={10}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TRENDS VIEW */}
            {activeTab === 'trends' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-2">Monthly Incident Trend</h3>
                            <p className="text-xs text-slate-400 mb-6">Incident breakdown by type over recent months</p>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    {monthlyTrendData.length > 0 ? (
                                        <ComposedChart data={monthlyTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="nm" name="Near Miss" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="fac" name="First Aid" fill="#eab308" stackId="a" />
                                            <Bar dataKey="mtc" name="Medical Tx" fill="#f97316" stackId="a" />
                                            <Bar dataKey="lti" name="LTI" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                                            <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                                        </ComposedChart>
                                    ) : (
                                        <AreaChart data={incidentTrendData}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-2">Location Risk Heatmap</h3>
                            <p className="text-xs text-slate-400 mb-6">Frequency of incidents by site zone</p>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={locationChartData}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Leading vs Lagging Indicators */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-2">Leading vs Lagging Indicators</h3>
                        <p className="text-xs text-slate-400 mb-6">Proactive (leading) vs reactive (lagging) safety metrics</p>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={leadingVsLagging}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {leadingVsLagging.map((entry, i) => (
                                            <Cell key={i} fill={entry.type === 'Leading' ? '#22c55e' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center gap-6 mt-3 justify-center">
                            <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Leading (Proactive)</span>
                            <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Lagging (Reactive)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* RISK MATRIX VIEW */}
            {activeTab === 'risk' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-2">5×5 Risk Assessment Matrix</h3>
                        <p className="text-xs text-slate-400 mb-6">Likelihood vs Severity — click cells to see incident count</p>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full max-w-2xl mx-auto border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-xs text-slate-500 font-medium w-24"></th>
                                        {['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'].map((s, i) => (
                                            <th key={s} className="p-2 text-xs text-slate-600 font-bold text-center">{s}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'].map((likLabel, li) => (
                                        <tr key={likLabel}>
                                            <td className="p-2 text-xs text-slate-600 font-bold text-right pr-3">{likLabel}</td>
                                            {[1, 2, 3, 4, 5].map(sev => {
                                                const lik = 5 - li;
                                                const cell = riskMatrixData.find(c => c.likelihood === lik && c.severity === sev);
                                                const score = lik * sev;
                                                const bg = score >= 15 ? 'bg-red-500 text-white' : score >= 10 ? 'bg-orange-400 text-white' : score >= 5 ? 'bg-yellow-300 text-slate-800' : 'bg-green-300 text-slate-800';
                                                return (
                                                    <td key={sev} className={`p-3 text-center rounded-sm border border-white/50 ${bg} cursor-default transition-transform hover:scale-105`}>
                                                        <div className="text-lg font-bold">{score}</div>
                                                        {(cell?.count ?? 0) > 0 && (
                                                            <div className="text-[10px] font-medium opacity-80 mt-0.5">
                                                                {cell!.count} incident{cell!.count > 1 ? 's' : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center gap-4 mt-6 justify-center text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-300 inline-block border border-green-400" /> Low (1-4)</span>
                            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-yellow-300 inline-block border border-yellow-400" /> Medium (5-9)</span>
                            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-orange-400 inline-block border border-orange-500" /> High (10-14)</span>
                            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500 inline-block border border-red-600" /> Critical (15-25)</span>
                        </div>
                    </div>

                    {/* Risk Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Risk Distribution by Severity</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Low', value: incidents.filter(i => i.severity === 'Low').length || 0 },
                                                { name: 'Medium', value: incidents.filter(i => i.severity === 'Medium').length || 0 },
                                                { name: 'High', value: incidents.filter(i => i.severity === 'High').length || 0 },
                                                { name: 'Critical', value: incidents.filter(i => i.severity === 'Critical').length || 0 },
                                            ].filter(d => d.value > 0)}
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#22c55e" />
                                            <Cell fill="#eab308" />
                                            <Cell fill="#f97316" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Incident Severity Summary</h3>
                            <div className="space-y-4 mt-6">
                                {[
                                    { label: 'Critical', count: incidents.filter(i => i.severity === 'Critical').length, color: 'bg-red-500', textColor: 'text-red-700' },
                                    { label: 'High', count: incidents.filter(i => i.severity === 'High').length, color: 'bg-orange-500', textColor: 'text-orange-700' },
                                    { label: 'Medium', count: incidents.filter(i => i.severity === 'Medium').length, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                                    { label: 'Low', count: incidents.filter(i => i.severity === 'Low').length, color: 'bg-green-500', textColor: 'text-green-700' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-3">
                                        <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                                        <span className="text-sm font-medium text-slate-700 w-16">{item.label}</span>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} transition-all`}
                                                style={{ width: `${incidents.length ? (item.count / incidents.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <span className={`text-sm font-bold ${item.textColor} w-8 text-right`}>{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI REPORT VIEW */}
            {activeTab === 'ai' && (
                <div className="max-w-4xl mx-auto animate-in fade-in">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Sparkles size={200} />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                    <Sparkles size={24} className="text-yellow-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">AI Executive Safety Report</h2>
                                    <p className="text-indigo-200">Powered by Gemini models</p>
                                </div>
                            </div>

                            {!aiReport ? (
                                <div className="py-12 text-center">
                                    <p className="text-indigo-200 mb-6 max-w-lg mx-auto">
                                        Generate a comprehensive analysis of your current HSE performance, including strategic recommendations for the board.
                                    </p>
                                    <button 
                                        onClick={handleGenerateReport}
                                        disabled={loadingReport}
                                        className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-70 flex items-center gap-2 mx-auto"
                                    >
                                        {user?.tier === SubscriptionTier.FREE ? <Lock size={18} /> : (loadingReport ? <Loader2 className="animate-spin" /> : <FileText />)}
                                        {loadingReport ? 'Generating Insights...' : (user?.tier === SubscriptionTier.FREE ? 'Unlock Report' : 'Generate Report Now')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                                        <h3 className="text-lg font-bold text-yellow-400 mb-3">Executive Summary</h3>
                                        <p className="leading-relaxed text-indigo-50">
                                            {aiReport.executiveSummary}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-4">Strategic Recommendations</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {aiReport.recommendations?.map((rec: any, idx: number) => (
                                                <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-sm">{rec.title}</h4>
                                                            <p className="text-sm text-slate-300 mt-1">{rec.description}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-center pt-4">
                                        <button 
                                            onClick={() => setAiReport(null)}
                                            className="text-sm text-indigo-300 hover:text-white"
                                        >
                                            Clear Report
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
