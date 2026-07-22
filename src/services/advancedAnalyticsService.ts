// Enhanced Analytics Service for Phase 3A
import { 
    HSEMetrics, 
    Incident, 
    IncidentType, 
    IncidentSeverity, 
    HSEStatsLog,
    Inspection,
    RiskAssessment,
    Observation 
} from '../types';
import { 
    getIncidents, 
    getInspections, 
    getRiskAssessments, 
    getObservations,
    getStatsLogs,
    getWorkers
} from './storageService';

// Advanced KPI Calculation Interface
export interface AdvancedKPIs {
    // Safety Performance Indicators
    totalRecordableInjuryRate: number;
    lostTimeInjuryFrequency: number;
    nearMissFrequency: number;
    safetyParticipationRate: number;
    
    // Leading Indicators
    safetyObservationsPerWorker: number;
    hazardsIdentifiedPerMonth: number;
    correctiveActionsCompleted: number;
    safetyTrainingCompletionRate: number;
    
    // Behavioral Indicators  
    reportingCulture: number;
    safetyEngagementScore: number;
    proactiveReporting: number;
    
    // Compliance Metrics
    inspectionCompletionRate: number;
    auditCompliance: number;
    regulatoryCompliance: number;
    
    // Trends and Predictions
    injuryTrend: 'improving' | 'stable' | 'declining';
    riskExposure: 'low' | 'medium' | 'high';
    predictedIncidents: number;
}

// Real-time Metrics Interface
export interface RealTimeMetrics {
    liveIncidents: number;
    todayObservations: number;
    pendingInspections: number;
    overdueTasks: number;
    workersOnSite: number;
    criticalRisks: number;
    lastUpdated: Date;
    trendDirection: 'up' | 'down' | 'stable';
}

// Enhanced Analytics Class
export class AdvancedAnalyticsService {
    
    static async calculateAdvancedKPIs(): Promise<AdvancedKPIs> {
        const [incidents, inspections, observations, workers, statsLogs] = await Promise.all([
            getIncidents(),
            getInspections(), 
            getObservations(),
            getWorkers(),
            getStatsLogs()
        ]);

        const currentYear = new Date().getFullYear();
        const yearlyIncidents = incidents.filter(i => 
            new Date(i.date).getFullYear() === currentYear
        );

        // Calculate total man hours for the year
        const totalManHours = statsLogs
            .filter(log => new Date(log.date).getFullYear() === currentYear)
            .reduce((sum, log) => sum + (log.manHours || 0), 0) || 200000; // Default fallback

        // Safety Performance Indicators
        const ltiIncidents = yearlyIncidents.filter(i => 
            i.type === IncidentType.INJURY && i.severity === IncidentSeverity.MAJOR
        ).length;

        const totalRecordableInjuries = yearlyIncidents.filter(i => 
            i.type === IncidentType.INJURY
        ).length;

        const nearMisses = yearlyIncidents.filter(i => 
            i.type === IncidentType.NEAR_MISS
        ).length;

        // Leading Indicators
        const thisMonth = new Date().getMonth();
        const monthlyObservations = observations.filter(o => 
            new Date(o.date).getMonth() === thisMonth
        ).length;

        const monthlyHazards = yearlyIncidents.filter(i => 
            new Date(i.date).getMonth() === thisMonth && 
            i.type === IncidentType.HAZARD
        ).length;

        // Calculate trends
        const lastMonthIncidents = incidents.filter(i => {
            const incidentDate = new Date(i.date);
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return incidentDate.getMonth() === lastMonth.getMonth();
        }).length;

        const thisMonthIncidents = incidents.filter(i => {
            const incidentDate = new Date(i.date);
            return incidentDate.getMonth() === thisMonth;
        }).length;

        let injuryTrend: 'improving' | 'stable' | 'declining';
        if (thisMonthIncidents < lastMonthIncidents) injuryTrend = 'improving';
        else if (thisMonthIncidents > lastMonthIncidents) injuryTrend = 'declining';
        else injuryTrend = 'stable';

        return {
            // Safety Performance Indicators
            totalRecordableInjuryRate: (totalRecordableInjuries * 200000) / totalManHours,
            lostTimeInjuryFrequency: (ltiIncidents * 1000000) / totalManHours,
            nearMissFrequency: (nearMisses * 200000) / totalManHours,
            safetyParticipationRate: Math.min(100, (observations.length / workers.length) * 20),
            
            // Leading Indicators  
            safetyObservationsPerWorker: workers.length > 0 ? observations.length / workers.length : 0,
            hazardsIdentifiedPerMonth: monthlyHazards,
            correctiveActionsCompleted: incidents.filter(i => i.status === 'Closed').length,
            safetyTrainingCompletionRate: 85, // Mock data - would integrate with training system
            
            // Behavioral Indicators
            reportingCulture: Math.min(100, (observations.length / incidents.length) * 50 || 75),
            safetyEngagementScore: Math.min(100, monthlyObservations * 5),
            proactiveReporting: Math.min(100, (nearMisses / totalRecordableInjuries) * 25 || 80),
            
            // Compliance Metrics
            inspectionCompletionRate: Math.min(100, (inspections.length / 12) * 100), // Assuming monthly inspections
            auditCompliance: 92, // Mock data
            regulatoryCompliance: 96, // Mock data
            
            // Trends and Predictions
            injuryTrend,
            riskExposure: totalRecordableInjuries > 5 ? 'high' : totalRecordableInjuries > 2 ? 'medium' : 'low',
            predictedIncidents: Math.round(thisMonthIncidents * 1.2) // Simple prediction
        };
    }

    static async getRealTimeMetrics(): Promise<RealTimeMetrics> {
        const [incidents, observations, inspections] = await Promise.all([
            getIncidents(),
            getObservations(), 
            getInspections()
        ]);

        const today = new Date().toISOString().split('T')[0];
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);

        const todayObservations = observations.filter(o => 
            o.date.split('T')[0] === today
        ).length;

        const recentIncidents = incidents.filter(i => 
            new Date(i.date) >= thisWeek
        ).length;

        const pendingInspections = inspections.filter(i => 
            i.status === 'Pending' || i.status === 'In Progress'
        ).length;

        return {
            liveIncidents: incidents.filter(i => i.status === 'Open').length,
            todayObservations,
            pendingInspections,
            overdueTasks: 3, // Mock data - would integrate with task system
            workersOnSite: 42, // Mock data - would integrate with attendance system  
            criticalRisks: incidents.filter(i => 
                i.severity === IncidentSeverity.CRITICAL && i.status === 'Open'
            ).length,
            lastUpdated: new Date(),
            trendDirection: recentIncidents > 3 ? 'up' : recentIncidents < 2 ? 'down' : 'stable'
        };
    }

    // Historical trend analysis
    static async getHistoricalTrends(months: number = 12) {
        const incidents = await getIncidents();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const monthlyData = [];
        for (let i = 0; i < months; i++) {
            const monthDate = new Date();
            monthDate.setMonth(monthDate.getMonth() - i);
            
            const monthIncidents = incidents.filter(incident => {
                const incidentDate = new Date(incident.date);
                return incidentDate.getMonth() === monthDate.getMonth() && 
                       incidentDate.getFullYear() === monthDate.getFullYear();
            });

            monthlyData.unshift({
                month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                incidents: monthIncidents.length,
                nearMisses: monthIncidents.filter(i => i.type === IncidentType.NEAR_MISS).length,
                injuries: monthIncidents.filter(i => i.type === IncidentType.INJURY).length,
                date: monthDate
            });
        }

        return monthlyData;
    }

    // Benchmark comparison
    static async getBenchmarkData() {
        const kpis = await this.calculateAdvancedKPIs();
        
        // Industry benchmarks (would typically come from external API)
        const industryBenchmarks = {
            totalRecordableInjuryRate: 2.8,
            lostTimeInjuryFrequency: 1.5, 
            nearMissFrequency: 15.0,
            safetyParticipationRate: 75,
            inspectionCompletionRate: 85
        };

        return {
            current: kpis,
            industry: industryBenchmarks,
            performance: {
                trir: kpis.totalRecordableInjuryRate < industryBenchmarks.totalRecordableInjuryRate ? 'above' : 'below',
                ltifr: kpis.lostTimeInjuryFrequency < industryBenchmarks.lostTimeInjuryFrequency ? 'above' : 'below',
                participation: kpis.safetyParticipationRate > industryBenchmarks.safetyParticipationRate ? 'above' : 'below'
            }
        };
    }
}