// Real-Time Metrics Dashboard Component
import React, { useState, useEffect } from 'react';
import { Activity, Users, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus, Zap } from '../utils/icons';
import { AdvancedAnalyticsService, RealTimeMetrics, AdvancedKPIs } from '../services/advancedAnalyticsService';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    trend, 
    trendValue, 
    icon, 
    color, 
    subtitle 
}) => {
    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return <TrendingUp size={16} className="text-green-600" />;
            case 'down': return <TrendingDown size={16} className="text-red-600" />;
            case 'stable': return <Minus size={16} className="text-gray-600" />;
            default: return null;
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${color}`}>
                    {icon}
                </div>
                {trend && (
                    <div className="flex items-center gap-1">
                        {getTrendIcon()}
                        {trendValue && (
                            <span className={`text-sm font-medium ${
                                trend === 'up' ? 'text-green-600' : 
                                trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                                {trendValue}
                            </span>
                        )}
                    </div>
                )}
            </div>
            
            <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">{value}</h3>
                <p className="text-sm font-medium text-slate-600">{title}</p>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
};

export const RealTimeDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
    const [kpis, setKpis] = useState<AdvancedKPIs | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const refreshMetrics = async () => {
        try {
            const [realTimeData, kpiData] = await Promise.all([
                AdvancedAnalyticsService.getRealTimeMetrics(),
                AdvancedAnalyticsService.calculateAdvancedKPIs()
            ]);
            setMetrics(realTimeData);
            setKpis(kpiData);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshMetrics();
        
        // Auto-refresh every 5 minutes
        const interval = setInterval(refreshMetrics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Loading real-time metrics...</span>
            </div>
        );
    }

    if (!metrics || !kpis) {
        return (
            <div className="text-center p-8 text-slate-600">
                Failed to load metrics. Please try refreshing.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Real-Time Safety Metrics</h2>
                    <p className="text-slate-600">
                        Live data updates • Last refresh: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <button 
                    onClick={refreshMetrics}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Activity size={16} />
                    Refresh
                </button>
            </div>

            {/* Real-Time Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Live Incidents"
                    value={metrics.liveIncidents}
                    icon={<AlertTriangle size={20} className="text-red-600" />}
                    color="bg-red-50"
                    trend={metrics.trendDirection}
                    subtitle="Open incidents requiring attention"
                />
                
                <MetricCard
                    title="Today's Observations"
                    value={metrics.todayObservations}
                    icon={<Users size={20} className="text-blue-600" />}
                    color="bg-blue-50"
                    subtitle="Safety observations reported today"
                />
                
                <MetricCard
                    title="Pending Inspections"
                    value={metrics.pendingInspections}
                    icon={<Clock size={20} className="text-orange-600" />}
                    color="bg-orange-50"
                    subtitle="Inspections awaiting completion"
                />
                
                <MetricCard
                    title="Workers On-Site"
                    value={metrics.workersOnSite}
                    icon={<Users size={20} className="text-green-600" />}
                    color="bg-green-50"
                    subtitle="Active personnel count"
                />
            </div>

            {/* Advanced KPIs Grid */}
            <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Key Performance Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MetricCard
                        title="Total Recordable Injury Rate"
                        value={kpis.totalRecordableInjuryRate.toFixed(2)}
                        icon={<AlertTriangle size={20} className="text-red-600" />}
                        color="bg-red-50"
                        trend={kpis.injuryTrend === 'improving' ? 'down' : kpis.injuryTrend === 'declining' ? 'up' : 'stable'}
                        subtitle="Per 200,000 work hours"
                    />
                    
                    <MetricCard
                        title="Near Miss Frequency"
                        value={kpis.nearMissFrequency.toFixed(1)}
                        icon={<Zap size={20} className="text-yellow-600" />}
                        color="bg-yellow-50"
                        subtitle="Proactive reporting indicator"
                    />
                    
                    <MetricCard
                        title="Safety Participation"
                        value={`${kpis.safetyParticipationRate.toFixed(0)}%`}
                        icon={<Users size={20} className="text-green-600" />}
                        color="bg-green-50"
                        subtitle="Worker engagement in safety"
                    />
                    
                    <MetricCard
                        title="Inspection Completion"
                        value={`${kpis.inspectionCompletionRate.toFixed(0)}%`}
                        icon={<Clock size={20} className="text-blue-600" />}
                        color="bg-blue-50"
                        subtitle="Scheduled inspections completed"
                    />
                    
                    <MetricCard
                        title="Reporting Culture"
                        value={`${kpis.reportingCulture.toFixed(0)}%`}
                        icon={<Activity size={20} className="text-purple-600" />}
                        color="bg-purple-50"
                        subtitle="Quality of safety culture"
                    />
                    
                    <MetricCard
                        title="Risk Exposure"
                        value={kpis.riskExposure.toUpperCase()}
                        icon={<AlertTriangle size={20} className={
                            kpis.riskExposure === 'high' ? 'text-red-600' :
                            kpis.riskExposure === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        } />}
                        color={
                            kpis.riskExposure === 'high' ? 'bg-red-50' :
                            kpis.riskExposure === 'medium' ? 'bg-yellow-50' : 'bg-green-50'
                        }
                        subtitle="Current organizational risk level"
                    />
                </div>
            </div>

            {/* Critical Alerts */}
            {metrics.criticalRisks > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="text-red-600" size={24} />
                        <h3 className="text-lg font-semibold text-red-800">Critical Risks Alert</h3>
                    </div>
                    <p className="text-red-700">
                        {metrics.criticalRisks} critical risk{metrics.criticalRisks !== 1 ? 's' : ''} require immediate attention.
                    </p>
                </div>
            )}
        </div>
    );
};