
import React, { useState, useEffect } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar 
} from 'recharts';
import { 
    AlertTriangle, TrendingUp, Activity, CheckSquare, Sparkles, Loader2, 
    FileText, Calendar, Users, MapPin, Plus, X, Calculator, Lock
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
    const [activeTab, setActiveTab] = useState<'kpi' | 'trends' | 'ai'>('kpi');
    
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

    useEffect(() => {
        refreshData();
    }, []);

    // Auto-calculate Man Hours based on formula: Manpower * Hours * Days
    useEffect(() => {
        const workers = Number(statsEntry.activeWorkers) || 0;
        const total = workers * hoursPerDay * daysWorked;
        setStatsEntry(prev => ({ ...prev, manHours: total }));
    }, [statsEntry.activeWorkers, hoursPerDay, daysWorked]);

    const refreshData = () => {
        const calculated = calculateHSEMetrics();
        setMetrics(calculated);
        setIncidents(getIncidents());
    };

    const handleSaveStats = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newLog: HSEStatsLog = {
            id: `log-${Date.now()}`,
            date: statsEntry.date!,
            period: statsEntry.period as any,
            manHours: Number(statsEntry.manHours), // Calculated value
            activeWorkers: Number(statsEntry.activeWorkers),
            remarks: statsEntry.remarks
        };
        
        saveStatsLog(newLog);
        refreshData();
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
        
        alert("Statistics logged successfully!");
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
            alert("Failed to generate AI report.");
        } finally {
            setLoadingReport(false);
        }
    };

    if (!metrics) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    // --- Mock Data for Charts (Simulating Historical Data) ---
    const incidentTrendData = [
        { month: 'Jan', count: 4, lti: 0 },
        { month: 'Feb', count: 3, lti: 0 },
        { month: 'Mar', count: 6, lti: 1 },
        { month: 'Apr', count: 2, lti: 0 },
        { month: 'May', count: 5, lti: 0 },
        { month: 'Jun', count: incidents.length, lti: metrics.ltiCount }, // Current
    ];

    const typeData = [
        { name: 'Near Miss', value: metrics.nmCount },
        { name: 'First Aid', value: metrics.facCount },
        { name: 'Medical Tx', value: metrics.mtcCount },
        { name: 'LTI', value: metrics.ltiCount },
    ].filter(d => d.value > 0);

    const locationData = incidents.reduce((acc, curr) => {
        // Simple extraction of Zone/Area from location string
        const loc = curr.location.split('-')[0].trim() || 'Unknown';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const locationChartData = Object.keys(locationData).map(k => ({ name: k, count: locationData[k] }));

    const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

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
                                            <span className="text-2xl font-bold text-blue-900">{statsEntry.manHours?.toLocaleString()}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'LTI', count: metrics.ltiCount },
                                        { name: 'Medical', count: metrics.mtcCount },
                                        { name: 'First Aid', count: metrics.facCount },
                                        { name: 'Near Miss', count: metrics.nmCount },
                                        { name: 'Property', count: 2 } // Mock
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
                                                    { name: 'Near Miss', color: '#22c55e' },
                                                    { name: 'Property', color: '#64748b' }
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
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
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
                            <h3 className="font-bold text-slate-800 mb-2">Rolling 6-Month TRIR Trend</h3>
                            <p className="text-xs text-slate-400 mb-6">Total Recordable Incident Rate over time</p>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
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
