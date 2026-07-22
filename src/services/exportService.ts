// Export Service for Analytics Reports  
import { AdvancedKPIs, RealTimeMetrics } from './advancedAnalyticsService';
import { HSEMetrics, Incident } from '../types';

export interface ExportData {
    metrics: AdvancedKPIs;
    incidents: Incident[];
    period: string;
    generatedAt: Date;
    organizationName?: string;
}

export class ExportService {
    
    // Generate CSV content for Excel export
    static generateCSVReport(data: ExportData): string {
        const { metrics, incidents } = data;
        
        let csv = 'Safedify AI Safety Report\n';
        csv += `Generated: ${data.generatedAt.toLocaleDateString()}\n\n`;
        
        // KPI Section
        csv += 'Key Performance Indicators\n';
        csv += 'Metric,Value,Unit\n';
        csv += `Total Recordable Injury Rate,${metrics.totalRecordableInjuryRate.toFixed(2)},per 200k hours\n`;
        csv += `Lost Time Injury Frequency,${metrics.lostTimeInjuryFrequency.toFixed(2)},per 1M hours\n`;
        csv += `Near Miss Frequency,${metrics.nearMissFrequency.toFixed(1)},per 200k hours\n`;
        csv += `Safety Participation Rate,${metrics.safetyParticipationRate.toFixed(1)},%\n`;
        csv += `Inspection Completion Rate,${metrics.inspectionCompletionRate.toFixed(1)},%\n`;
        csv += `Reporting Culture Score,${metrics.reportingCulture.toFixed(1)},%\n`;
        csv += `Risk Exposure Level,${metrics.riskExposure},categorical\n\n`;
        
        // Incidents Section
        csv += 'Recent Incidents\n';
        csv += 'Date,Type,Severity,Location,Status,Description\n';
        incidents.forEach(incident => {
            const description = incident.description.replace(/,/g, ';').substring(0, 100);
            csv += `${incident.date},${incident.type},${incident.severity},${incident.location},${incident.status},"${description}"\n`;
        });
        
        return csv;
    }
    
    // Download CSV file
    static downloadCSV(data: ExportData, filename: string = 'safety-report.csv') {
        const csvContent = this.generateCSVReport(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // Generate HTML content for PDF export (using browser print)
    static generateHTMLReport(data: ExportData): string {
        const { metrics, incidents } = data;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Safedify AI Safety Report</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 10px;
                }
                .report-info {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .kpi-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                }
                .kpi-value {
                    font-size: 28px;
                    font-weight: bold;
                    color: #1e40af;
                    margin: 10px 0;
                }
                .kpi-label {
                    font-size: 14px;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .section-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin: 30px 0 20px 0;
                    color: #1e40af;
                    border-left: 4px solid #2563eb;
                    padding-left: 15px;
                }
                .incidents-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .incidents-table th,
                .incidents-table td {
                    border: 1px solid #e2e8f0;
                    padding: 12px 8px;
                    text-align: left;
                    font-size: 12px;
                }
                .incidents-table th {
                    background-color: #f1f5f9;
                    font-weight: bold;
                }
                .incidents-table tr:nth-child(even) {
                    background-color: #f8fafc;
                }
                .risk-high { color: #dc2626; font-weight: bold; }
                .risk-medium { color: #d97706; font-weight: bold; }
                .risk-low { color: #059669; font-weight: bold; }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #64748b;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }
                @media print {
                    body { margin: 0; }
                    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🛡️ Safedify AI</div>
                <h1>Safety Analytics Report</h1>
                <p>Comprehensive Health, Safety & Environment Analysis</p>
            </div>
            
            <div class="report-info">
                <strong>Report Generated:</strong> ${data.generatedAt.toLocaleDateString()} at ${data.generatedAt.toLocaleTimeString()}<br>
                <strong>Reporting Period:</strong> ${data.period}<br>
                <strong>Organization:</strong> ${data.organizationName || 'Your Organization'}
            </div>
            
            <div class="section-title">📊 Key Performance Indicators</div>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-value">${metrics.totalRecordableInjuryRate.toFixed(2)}</div>
                    <div class="kpi-label">Total Recordable Injury Rate</div>
                    <small>(per 200,000 work hours)</small>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${metrics.lostTimeInjuryFrequency.toFixed(2)}</div>
                    <div class="kpi-label">Lost Time Injury Frequency</div>
                    <small>(per 1,000,000 work hours)</small>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${metrics.nearMissFrequency.toFixed(1)}</div>
                    <div class="kpi-label">Near Miss Frequency</div>
                    <small>(per 200,000 work hours)</small>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${metrics.safetyParticipationRate.toFixed(0)}%</div>
                    <div class="kpi-label">Safety Participation Rate</div>
                    <small>(worker engagement)</small>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${metrics.inspectionCompletionRate.toFixed(0)}%</div>
                    <div class="kpi-label">Inspection Completion Rate</div>
                    <small>(scheduled vs completed)</small>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value risk-${metrics.riskExposure}">${metrics.riskExposure.toUpperCase()}</div>
                    <div class="kpi-label">Risk Exposure Level</div>
                    <small>(current risk assessment)</small>
                </div>
            </div>
            
            <div class="section-title">📋 Recent Incidents</div>
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${incidents.slice(0, 20).map(incident => `
                        <tr>
                            <td>${new Date(incident.date).toLocaleDateString()}</td>
                            <td>${incident.type}</td>
                            <td class="risk-${incident.severity.toLowerCase()}">${incident.severity}</td>
                            <td>${incident.location}</td>
                            <td>${incident.status}</td>
                            <td>${incident.description.substring(0, 100)}${incident.description.length > 100 ? '...' : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="section-title">📈 Safety Performance Summary</div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
                <p><strong>Injury Trend:</strong> ${metrics.injuryTrend} trend observed in recent reporting period.</p>
                <p><strong>Leading Indicators:</strong> ${metrics.safetyObservationsPerWorker.toFixed(1)} observations per worker demonstrate proactive safety engagement.</p>
                <p><strong>Compliance Status:</strong> ${metrics.regulatoryCompliance}% regulatory compliance maintained with ${metrics.auditCompliance}% audit compliance rate.</p>
                <p><strong>Predictive Analysis:</strong> Current trends suggest approximately ${metrics.predictedIncidents} incidents may occur next month without intervention.</p>
            </div>
            
            <div class="footer">
                <p>This report was generated automatically by Safedify AI Safety Management Platform</p>
                <p>For questions about this report, contact your safety administrator</p>
            </div>
        </body>
        </html>
        `;
    }
    
    // Generate and download PDF report (using browser print dialog)
    static downloadPDFReport(data: ExportData, filename: string = 'safety-report.pdf') {
        const htmlContent = this.generateHTMLReport(data);
        const printWindow = window.open('', '_blank');
        
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };
        } else {
            alert('Please allow pop-ups to generate PDF reports');
        }
    }
    
    // Generate summary JSON for API export
    static generateJSONReport(data: ExportData): string {
        return JSON.stringify({
            reportMetadata: {
                generatedAt: data.generatedAt,
                period: data.period,
                organizationName: data.organizationName || 'Unknown',
                version: '1.0'
            },
            kpis: data.metrics,
            incidentsSummary: {
                total: data.incidents.length,
                byType: data.incidents.reduce((acc, incident) => {
                    acc[incident.type] = (acc[incident.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                bySeverity: data.incidents.reduce((acc, incident) => {
                    acc[incident.severity] = (acc[incident.severity] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>)
            },
            incidents: data.incidents.map(incident => ({
                id: incident.id,
                date: incident.date,
                type: incident.type,
                severity: incident.severity,
                location: incident.location,
                status: incident.status,
                description: incident.description.substring(0, 200)
            }))
        }, null, 2);
    }
    
    // Download JSON report
    static downloadJSONReport(data: ExportData, filename: string = 'safety-report.json') {
        const jsonContent = this.generateJSONReport(data);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}