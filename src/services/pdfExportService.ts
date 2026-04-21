/**
 * PDF Export Service
 * Generates professional safety reports using jsPDF
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Incident, ActionItem, HSEMetrics, SiteSafetyScore } from '../types';

interface ReportData {
  title: string;
  dateRange: { from: string; to: string };
  siteName: string;
  generatedBy: string;
  safetyScore: SiteSafetyScore | null;
  hseMetrics: HSEMetrics | null;
  incidents: Incident[];
  actions: ActionItem[];
  stats: {
    totalIncidents: number;
    openActions: number;
    closedActions: number;
    totalActions: number;
    daysSinceLastIncident: number;
    inspectionCount: number;
    totalObservations: number;
  };
}

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],     // blue-800
  secondary: [71, 85, 105] as [number, number, number],   // slate-500
  success: [22, 163, 74] as [number, number, number],     // green-600
  danger: [220, 38, 38] as [number, number, number],      // red-600
  warning: [234, 179, 8] as [number, number, number],     // yellow-500
  dark: [15, 23, 42] as [number, number, number],         // slate-900
  light: [241, 245, 249] as [number, number, number],     // slate-100
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Generate a comprehensive HSE summary report as PDF
 */
export function generateSafetyReport(data: ReportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ---- HEADER ----
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title || 'HSE Safety Report', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Site: ${data.siteName}`, margin, 28);
  doc.text(`Period: ${data.dateRange.from} — ${data.dateRange.to}`, margin, 34);
  doc.text(`Generated: ${new Date().toLocaleDateString()} by ${data.generatedBy}`, margin, 40);

  y = 55;

  // ---- EXECUTIVE SUMMARY ----
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 8;

  // KPI Cards Row
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const kpiCards = [
    {
      label: 'Safety Score',
      value: data.safetyScore ? `${data.safetyScore.score}/100` : 'N/A',
      sub: data.safetyScore?.rating || '',
      color: COLORS.primary,
    },
    {
      label: 'TRIR',
      value: data.hseMetrics ? data.hseMetrics.trir.toFixed(2) : '0.00',
      sub: 'per 200k hrs',
      color: data.hseMetrics && data.hseMetrics.trir > 3 ? COLORS.danger : COLORS.success,
    },
    {
      label: 'LTIFR',
      value: data.hseMetrics ? data.hseMetrics.ltifr.toFixed(2) : '0.00',
      sub: 'per 1M hrs',
      color: data.hseMetrics && data.hseMetrics.ltifr > 0 ? COLORS.danger : COLORS.success,
    },
    {
      label: 'Days Incident-Free',
      value: String(data.stats.daysSinceLastIncident),
      sub: data.stats.daysSinceLastIncident >= 30 ? 'Excellent' : 'Needs Attention',
      color: data.stats.daysSinceLastIncident >= 30 ? COLORS.success : COLORS.warning,
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = margin + idx * (cardWidth + 4);
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(x, y, cardWidth, 28, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + 4, y + 7);

    doc.setFontSize(16);
    doc.setTextColor(...card.color);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 4, y + 18);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(card.sub, x + 4, y + 24);
  });

  y += 36;

  // ---- STATS TABLE ----
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Statistics', margin, y);
  y += 4;

  const closureRate = data.stats.totalActions > 0
    ? Math.round((data.stats.closedActions / data.stats.totalActions) * 100)
    : 0;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Value']],
    body: [
      ['Total Incidents', String(data.stats.totalIncidents)],
      ['Open Actions', String(data.stats.openActions)],
      ['Closed Actions', String(data.stats.closedActions)],
      ['Action Closure Rate', `${closureRate}%`],
      ['Inspections Completed', String(data.stats.inspectionCount)],
      ['Total Observations', String(data.stats.totalObservations)],
      ['Total Man-Hours', data.hseMetrics ? data.hseMetrics.totalManHours.toLocaleString() : '0'],
      ['Near Miss Reporting Rate', data.hseMetrics ? data.hseMetrics.nearMissReportingRate.toFixed(1) : '0'],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ---- INCIDENT TABLE ----
  if (data.incidents.length > 0) {
    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Incident Register', margin, y);
    y += 4;

    const incidentRows = data.incidents.slice(0, 25).map(inc => [
      new Date(inc.date).toLocaleDateString(),
      inc.type,
      inc.severity,
      inc.location,
      inc.description.substring(0, 60) + (inc.description.length > 60 ? '...' : ''),
      inc.status,
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Type', 'Severity', 'Location', 'Description', 'Status']],
      body: incidentRows,
      headStyles: { fillColor: COLORS.danger, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 22 },
        2: { cellWidth: 18 },
        3: { cellWidth: 25 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 18 },
      },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- OPEN ACTIONS TABLE ----
  const openActions = data.actions.filter(a => a.status !== 'Done');
  if (openActions.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Open Corrective Actions', margin, y);
    y += 4;

    const actionRows = openActions.slice(0, 25).map(act => [
      (act.description || act.title || '').substring(0, 50) + ((act.description || act.title || '').length > 50 ? '...' : ''),
      act.assignee || 'Unassigned',
      act.priority,
      act.dueDate ? new Date(act.dueDate).toLocaleDateString() : 'N/A',
      act.status,
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Action', 'Assignee', 'Priority', 'Due Date', 'Status']],
      body: actionRows,
      headStyles: { fillColor: COLORS.warning, textColor: COLORS.dark, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [254, 252, 232] as [number, number, number] },
      theme: 'grid',
    });
  }

  // ---- FOOTER on each page ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, pageH - 12, pageWidth, 12, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Safedify HSE Platform — Confidential', margin, pageH - 4);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageH - 4);
  }

  // Save
  const filename = `safedify-report-${data.dateRange.from}-to-${data.dateRange.to}.pdf`;
  doc.save(filename);
}

/**
 * Quick export: Incident list as PDF table
 */
export function exportIncidentsPDF(incidents: Incident[], siteName: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Incident Register', margin, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${siteName} — Exported ${new Date().toLocaleDateString()}`, pageWidth - margin - 80, 16);

  const rows = incidents.map(inc => [
    inc.id.substring(0, 8),
    new Date(inc.date).toLocaleDateString(),
    inc.type,
    inc.category,
    inc.severity,
    inc.location,
    inc.department,
    inc.description.substring(0, 80) + (inc.description.length > 80 ? '...' : ''),
    inc.status,
  ]);

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [['ID', 'Date', 'Type', 'Category', 'Severity', 'Location', 'Dept', 'Description', 'Status']],
    body: rows,
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    theme: 'grid',
  });

  doc.save(`incident-register-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Quick export: Actions list as PDF table
 */
export function exportActionsPDF(actions: ActionItem[], siteName: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Corrective Actions Register', margin, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${siteName} — Exported ${new Date().toLocaleDateString()}`, pageWidth - margin - 80, 16);

  const rows = actions.map(act => [
    act.id.substring(0, 8),
    (act.description || act.title || '').substring(0, 60) + ((act.description || act.title || '').length > 60 ? '...' : ''),
    act.assignee || 'Unassigned',
    act.priority,
    act.dueDate ? new Date(act.dueDate).toLocaleDateString() : 'N/A',
    act.status,
    act.relatedIncidentId ? act.relatedIncidentId.substring(0, 8) : 'N/A',
  ]);

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [['ID', 'Description', 'Assignee', 'Priority', 'Due Date', 'Status', 'Incident Ref']],
    body: rows,
    headStyles: { fillColor: COLORS.warning, textColor: COLORS.dark, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [254, 252, 232] as [number, number, number] },
    theme: 'grid',
  });

  doc.save(`actions-register-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// AI EXECUTIVE REPORT PDF
// ============================================================

export interface AIReportData {
  executiveSummary: string;
  recommendations: Array<{
    title: string;
    description: string;
    priority?: string;
    timeframe?: string;
  }>;
  keyInsights?: string[];
  riskAreas?: string[];
  overallScore?: number;
}

export interface ExecutivePDFData {
  aiReport: AIReportData;
  metrics: HSEMetrics;
  incidents: Incident[];
  siteName: string;
  generatedBy: string;
  dateRange: { from: string; to: string };
}

function addPageHeader(doc: jsPDF, title: string, subtitle: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, margin, 20);
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(7);
  doc.text(`Page generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 48, 20);
  return 38;
}

function addSectionHeader(doc: jsPDF, title: string, y: number, color = COLORS.primary): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  doc.setFillColor(...color);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), margin + 3, y + 5);
  return y + 12;
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/**
 * Generate a professional AI Executive Safety Report PDF
 */
export function generateExecutiveAIPDF(data: ExecutivePDFData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // =========================================================
  // COVER PAGE
  // =========================================================
  // Background gradient simulation
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageH, 'F');

  // Top accent bar
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Logo / Brand block
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, 30, 50, 15, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SAFEDIFY', margin + 5, 40);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('HSE PLATFORM', margin + 5, 44);

  // Main title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('AI EXECUTIVE', margin, 90);
  doc.text('SAFETY REPORT', margin, 104);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Powered by Gemini Artificial Intelligence', margin, 116);

  // Divider line
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(margin, 122, pageWidth - margin, 122);

  // Metadata block
  const metaY = 134;
  const metaData: [string, string][] = [
    ['Site / Organization', data.siteName],
    ['Reporting Period', `${data.dateRange.from} — ${data.dateRange.to}`],
    ['Generated By', data.generatedBy],
    ['Report Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Classification', 'CONFIDENTIAL'],
  ];
  metaData.forEach(([label, value], i) => {
    const yy = metaY + i * 14;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, margin, yy);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(226, 232, 240); // slate-200
    doc.text(value, margin, yy + 5);
  });

  // AI Overall Score badge (if available)
  if (data.aiReport.overallScore !== undefined) {
    const score = data.aiReport.overallScore;
    const scoreColor: [number, number, number] = score >= 75 ? [22, 163, 74] : score >= 50 ? [234, 179, 8] : [220, 38, 38];
    doc.setFillColor(...scoreColor);
    doc.roundedRect(pageWidth - margin - 40, metaY - 5, 40, 40, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(String(score), pageWidth - margin - 28, metaY + 15);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('AI SCORE', pageWidth - margin - 32, metaY + 22);
    doc.text('/ 100', pageWidth - margin - 26, metaY + 28);
  }

  // Man-hours highlight
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(margin, 220, contentWidth, 22, 3, 3, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL MAN-HOURS WORKED (LOGGED)', margin + 5, 228);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(data.metrics.totalManHours.toLocaleString(), margin + 5, 237);
  // TRIR & LTIFR quick values
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('TRIR', pageWidth - margin - 55, 228);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.metrics.trir > 3 ? 239 : 255, data.metrics.trir > 3 ? 68 : 255, data.metrics.trir > 3 ? 68 : 255);
  doc.text(data.metrics.trir.toFixed(2), pageWidth - margin - 55, 237);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('LTIFR', pageWidth - margin - 25, 228);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.metrics.ltifr > 0 ? 239 : 255, data.metrics.ltifr > 0 ? 68 : 255, data.metrics.ltifr > 0 ? 68 : 255);
  doc.text(data.metrics.ltifr.toFixed(2), pageWidth - margin - 25, 237);

  // Footer
  doc.setFillColor(37, 99, 235);
  doc.rect(0, pageH - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Safedify HSE Platform — AI Executive Report — CONFIDENTIAL', margin, pageH - 4);
  doc.text('Page 1', pageWidth - margin - 10, pageH - 4);

  // =========================================================
  // PAGE 2: EXECUTIVE SUMMARY + KEY INSIGHTS
  // =========================================================
  doc.addPage();
  let y = addPageHeader(doc, 'AI EXECUTIVE SAFETY REPORT', `${data.siteName} | ${data.dateRange.from} — ${data.dateRange.to}`, margin);

  // Section: Executive Summary
  y = addSectionHeader(doc, '01 — Executive Summary', y, COLORS.primary);
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  y = wrapText(doc, data.aiReport.executiveSummary, margin, y, contentWidth, 5) + 8;

  // Section: Key Insights
  if (data.aiReport.keyInsights && data.aiReport.keyInsights.length > 0) {
    if (y > 200) { doc.addPage(); y = addPageHeader(doc, 'AI EXECUTIVE SAFETY REPORT', `${data.siteName}`, margin); }
    y = addSectionHeader(doc, '02 — Key Insights', y, [79, 70, 229] as [number, number, number]);
    data.aiReport.keyInsights.forEach((insight, i) => {
      if (y > 260) { doc.addPage(); y = addPageHeader(doc, 'AI EXECUTIVE SAFETY REPORT', `${data.siteName}`, margin); }
      doc.setFillColor(...COLORS.light);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      // Bullet indicator
      doc.setFillColor(37, 99, 235);
      doc.circle(margin + 5, y + 5, 2, 'F');
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const insightLines = doc.splitTextToSize(insight, contentWidth - 14);
      doc.text(insightLines[0] || '', margin + 11, y + 5.5);
      y += 13;
    });
    y += 4;
  }

  // Section: Risk Areas
  if (data.aiReport.riskAreas && data.aiReport.riskAreas.length > 0) {
    if (y > 200) { doc.addPage(); y = addPageHeader(doc, 'AI EXECUTIVE SAFETY REPORT', `${data.siteName}`, margin); }
    y = addSectionHeader(doc, '03 — Identified Risk Areas', y, COLORS.danger);
    data.aiReport.riskAreas.forEach((risk, i) => {
      if (y > 260) { doc.addPage(); y = addPageHeader(doc, 'AI EXECUTIVE SAFETY REPORT', `${data.siteName}`, margin); }
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      doc.setFillColor(...COLORS.danger);
      doc.circle(margin + 5, y + 5, 2, 'F');
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const riskLines = doc.splitTextToSize(risk, contentWidth - 14);
      doc.text(riskLines[0] || '', margin + 11, y + 5.5);
      y += 13;
    });
    y += 4;
  }

  // =========================================================
  // PAGE 3: KPI DASHBOARD + MAN-HOURS
  // =========================================================
  doc.addPage();
  y = addPageHeader(doc, 'SAFETY KPI DASHBOARD', `${data.siteName} | Metric Snapshot`, margin);

  // Big KPI cards row
  const kpiW = (contentWidth - 9) / 4;
  const kpis = [
    {
      label: 'TOTAL MAN-HOURS',
      value: data.metrics.totalManHours.toLocaleString(),
      sub: 'Logged to date',
      fill: COLORS.primary,
    },
    {
      label: 'TRIR',
      value: data.metrics.trir.toFixed(2),
      sub: 'per 200,000 hrs',
      fill: data.metrics.trir === 0 ? COLORS.success : data.metrics.trir < 3 ? COLORS.warning : COLORS.danger,
    },
    {
      label: 'LTIFR',
      value: data.metrics.ltifr.toFixed(2),
      sub: 'per 1,000,000 hrs',
      fill: data.metrics.ltifr === 0 ? COLORS.success : COLORS.danger,
    },
    {
      label: 'SEVERITY RATE',
      value: data.metrics.severityRate.toFixed(2),
      sub: 'Days lost / 200k hrs',
      fill: data.metrics.severityRate === 0 ? COLORS.success : COLORS.warning,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiW + 3);
    doc.setFillColor(...kpi.fill);
    doc.roundedRect(x, y, kpiW, 32, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.label, x + 3, y + 7);
    doc.setFontSize(16);
    doc.text(kpi.value, x + 3, y + 20);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.sub, x + 3, y + 28);
  });
  y += 40;

  // Second row KPIs
  const kpi2W = (contentWidth - 6) / 3;
  const kpis2 = [
    {
      label: 'ACTION CLOSURE RATE',
      value: `${data.metrics.actionClosureRate.toFixed(0)}%`,
      sub: 'Corrective actions closed',
      fill: data.metrics.actionClosureRate >= 80 ? COLORS.success : data.metrics.actionClosureRate >= 50 ? COLORS.warning : COLORS.danger,
    },
    {
      label: 'NEAR MISS RATE',
      value: data.metrics.nearMissReportingRate.toFixed(1),
      sub: 'Per 200,000 man-hours',
      fill: data.metrics.nearMissReportingRate >= 5 ? COLORS.success : COLORS.secondary,
    },
    {
      label: 'INSPECTION COMPLIANCE',
      value: `${data.metrics.inspectionCompliance.toFixed(0)}%`,
      sub: 'Inspections completed',
      fill: data.metrics.inspectionCompliance >= 80 ? COLORS.success : data.metrics.inspectionCompliance >= 50 ? COLORS.warning : COLORS.danger,
    },
  ];
  kpis2.forEach((kpi, idx) => {
    const x = margin + idx * (kpi2W + 3);
    doc.setFillColor(...kpi.fill);
    doc.roundedRect(x, y, kpi2W, 26, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.label, x + 3, y + 7);
    doc.setFontSize(14);
    doc.text(kpi.value, x + 3, y + 18);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.sub, x + 3, y + 23);
  });
  y += 34;

  // Incident Breakdown Table
  y = addSectionHeader(doc, '04 — Incident Classification Breakdown', y, COLORS.danger);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Incident Type', 'Count', 'Rate (per 200k hrs)', 'Status']],
    body: [
      ['Fatalities', String(data.metrics.fatalityCount), data.metrics.fatalityCount > 0 ? 'CRITICAL' : '—', data.metrics.fatalityCount > 0 ? '⚠ ACTION REQUIRED' : '✓ None recorded'],
      ['Lost Time Injuries (LTI)', String(data.metrics.ltiCount), data.metrics.totalManHours > 0 ? ((data.metrics.ltiCount * 200000) / data.metrics.totalManHours).toFixed(2) : '0.00', data.metrics.ltiCount > 0 ? 'Review required' : 'Satisfactory'],
      ['Restricted Work Cases (RWC)', String(data.metrics.rwcCount), '—', data.metrics.rwcCount > 0 ? 'Monitor' : 'Satisfactory'],
      ['Medical Treatment Cases (MTC)', String(data.metrics.mtcCount), '—', data.metrics.mtcCount > 0 ? 'Monitor' : 'Satisfactory'],
      ['First Aid Cases (FAC)', String(data.metrics.facCount), '—', 'Track & Monitor'],
      ['Near Misses (NM)', String(data.metrics.nmCount), data.metrics.nearMissReportingRate.toFixed(1), data.metrics.nmCount >= 5 ? 'Good reporting culture' : 'Encourage reporting'],
      ['Total Recordable Incidents', String(data.metrics.recordableIncidents), data.metrics.trir.toFixed(2) + ' (TRIR)', data.metrics.trir === 0 ? 'Excellent' : data.metrics.trir < 3 ? 'Acceptable' : 'Above benchmark'],
    ],
    headStyles: { fillColor: COLORS.danger, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' } },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Man-Hours Detail
  if (y > 220) { doc.addPage(); y = addPageHeader(doc, 'SAFETY KPI DASHBOARD', `${data.siteName}`, margin); }
  y = addSectionHeader(doc, '05 — Man-Hours & Exposure Data', y, COLORS.primary);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Value', 'Benchmark', 'Assessment']],
    body: [
      ['Total Man-Hours Logged', data.metrics.totalManHours.toLocaleString(), '> 100,000 for statistical validity', data.metrics.totalManHours >= 100000 ? '✓ Valid sample size' : 'Small sample — interpret with caution'],
      ['Days Lost to Injuries', String(data.metrics.daysLost), '0', data.metrics.daysLost === 0 ? '✓ Zero days lost' : `${data.metrics.daysLost} days lost`],
      ['Severity Rate', data.metrics.severityRate.toFixed(2), '< 2.0 per 200k hrs', data.metrics.severityRate <= 2 ? '✓ Within benchmark' : '⚠ Above benchmark'],
      ['Total Recordable Incidents', String(data.metrics.recordableIncidents), 'TRIR < 3.0', data.metrics.trir < 3 ? '✓ Within benchmark' : '⚠ Above benchmark'],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Leading vs Lagging Indicators
  if (y > 210) { doc.addPage(); y = addPageHeader(doc, 'SAFETY KPI DASHBOARD', `${data.siteName}`, margin); }
  y = addSectionHeader(doc, '06 — Leading vs. Lagging Indicators', y, [22, 163, 74] as [number, number, number]);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Indicator', 'Type', 'Value', 'Closure Rate', 'Assessment']],
    body: [
      ['Proactive Safety Actions', 'Leading', String(data.metrics.leadingActions), `${data.metrics.leadingClosureRate.toFixed(0)}%`, data.metrics.leadingClosureRate >= 80 ? '✓ Good' : '⚠ Needs improvement'],
      ['Reactive Corrective Actions', 'Lagging', String(data.metrics.laggingActions), `${data.metrics.laggingClosureRate.toFixed(0)}%`, data.metrics.laggingClosureRate >= 80 ? '✓ Good' : '⚠ Needs improvement'],
      ['Near Miss Reports', 'Leading', String(data.metrics.nmCount), 'N/A', data.metrics.nmCount >= 5 ? '✓ Active reporting' : 'Improve reporting culture'],
      ['Inspections Completed', 'Leading', String(data.metrics.inspectionsCompleted), `${data.metrics.inspectionCompliance.toFixed(0)}%`, data.metrics.inspectionCompliance >= 80 ? '✓ Compliant' : '⚠ Below target'],
    ],
    headStyles: { fillColor: [22, 163, 74] as [number, number, number], textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [240, 253, 244] as [number, number, number] },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // =========================================================
  // PAGE: STRATEGIC RECOMMENDATIONS
  // =========================================================
  if (data.aiReport.recommendations && data.aiReport.recommendations.length > 0) {
    doc.addPage();
    y = addPageHeader(doc, 'STRATEGIC RECOMMENDATIONS', `AI-Generated | ${data.siteName}`, margin);
    y = addSectionHeader(doc, '07 — Board-Level Recommendations', y, [79, 70, 229] as [number, number, number]);

    data.aiReport.recommendations.forEach((rec, idx) => {
      if (y > 240) { doc.addPage(); y = addPageHeader(doc, 'STRATEGIC RECOMMENDATIONS', `${data.siteName}`, margin); }

      const priorityColor: [number, number, number] = rec.priority === 'High'
        ? COLORS.danger : rec.priority === 'Medium' ? COLORS.warning : COLORS.success;

      // Card background
      doc.setFillColor(...COLORS.light);
      const recHeight = 30;
      doc.roundedRect(margin, y, contentWidth, recHeight, 3, 3, 'F');

      // Priority stripe
      doc.setFillColor(...priorityColor);
      doc.roundedRect(margin, y, 4, recHeight, 2, 2, 'F');

      // Number badge
      doc.setFillColor(79, 70, 229);
      doc.circle(margin + 12, y + 8, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(String(idx + 1), margin + 10, y + 10);

      // Priority badge
      doc.setFillColor(...priorityColor);
      doc.roundedRect(margin + contentWidth - 28, y + 3, 24, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(rec.priority || 'Medium', margin + contentWidth - 24, y + 8);

      // Title
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(rec.title, margin + 20, y + 10);

      // Description
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      const descLines = doc.splitTextToSize(rec.description, contentWidth - 40);
      doc.text(descLines.slice(0, 2), margin + 20, y + 17);

      // Timeframe
      if (rec.timeframe) {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Timeframe: ${rec.timeframe}`, margin + 20, y + 27);
      }

      y += recHeight + 5;
    });
  }

  // =========================================================
  // PAGE: INCIDENT REGISTER APPENDIX
  // =========================================================
  if (data.incidents.length > 0) {
    doc.addPage();
    y = addPageHeader(doc, 'INCIDENT REGISTER — APPENDIX', `${data.siteName} | Detailed Records`, margin);
    y = addSectionHeader(doc, '08 — Incident Register', y, COLORS.danger);

    const incRows = data.incidents.slice(0, 30).map(inc => [
      new Date(inc.date).toLocaleDateString(),
      inc.type,
      inc.severity,
      inc.category,
      inc.location || '—',
      inc.description.substring(0, 55) + (inc.description.length > 55 ? '…' : ''),
      inc.status,
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Type', 'Severity', 'Category', 'Location', 'Description', 'Status']],
      body: incRows,
      headStyles: { fillColor: COLORS.danger, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 22 },
        2: { cellWidth: 16 },
        3: { cellWidth: 24 },
        4: { cellWidth: 22 },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 16 },
      },
      theme: 'grid',
    });
  }

  // =========================================================
  // FOOTER ON ALL PAGES
  // =========================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, ph - 10, pageWidth, 10, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(0, ph - 10, 3, 10, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Safedify HSE Platform — AI Executive Report — CONFIDENTIAL', margin + 5, ph - 4);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 16, ph - 4);
  }

  const filename = `safedify-AI-executive-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// ============================================================
// COMPREHENSIVE DASHBOARD PDF (Executive + Safety Performance + Man-Hours)
// ============================================================

export interface ComprehensiveDashboardData {
  siteName: string;
  generatedBy: string;
  dateRange: { from: string; to: string };
  safetyScore: SiteSafetyScore | null;
  hseMetrics: HSEMetrics | null;
  incidents: Incident[];
  actions: ActionItem[];
  stats: {
    totalIncidents: number;
    openActions: number;
    closedActions: number;
    totalActions: number;
    daysSinceLastIncident: number;
    inspectionCount: number;
    totalObservations: number;
    openObservations: number;
    closedObservations: number;
    trainingModules: number;
    complianceRate: number;
  };
}

/**
 * Generate a comprehensive Executive Dashboard + Safety Performance PDF
 * Covers all KPIs, man-hours, incidents, actions, and monitoring data
 */
export function generateComprehensiveDashboardPDF(data: ComprehensiveDashboardData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const closureRate = data.stats.totalActions > 0
    ? Math.round((data.stats.closedActions / data.stats.totalActions) * 100)
    : 0;

  // =========================================================
  // COVER PAGE
  // =========================================================
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, pageH, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Brand
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, 30, 50, 15, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SAFEDIFY', margin + 5, 40);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('HSE PLATFORM', margin + 5, 44);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE SAFETY', margin, 88);
  doc.text('PERFORMANCE REPORT', margin, 102);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Comprehensive HSE Dashboard & Safety Monitoring', margin, 114);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(margin, 120, pageWidth - margin, 120);

  const metaItems: [string, string][] = [
    ['Site / Organization', data.siteName],
    ['Reporting Period', `${data.dateRange.from} — ${data.dateRange.to}`],
    ['Prepared By', data.generatedBy],
    ['Report Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Classification', 'CONFIDENTIAL — INTERNAL USE ONLY'],
  ];
  metaItems.forEach(([lbl, val], i) => {
    const yy = 132 + i * 13;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, margin, yy);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(226, 232, 240);
    doc.text(val, margin, yy + 5);
  });

  // Safety score badge
  if (data.safetyScore) {
    const sc = data.safetyScore.score;
    const fc: [number, number, number] = sc >= 80 ? [22, 163, 74] : sc >= 60 ? [234, 179, 8] : [220, 38, 38];
    doc.setFillColor(...fc);
    doc.roundedRect(pageWidth - margin - 45, 130, 45, 45, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(String(sc), pageWidth - margin - 33, 153);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SAFETY SCORE', pageWidth - margin - 42, 162);
    doc.text(data.safetyScore.rating || '', pageWidth - margin - 36, 168);
  }

  // Man-hours highlight block
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, 220, contentWidth, 28, 3, 3, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL MAN-HOURS WORKED', margin + 5, 229);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text((data.hseMetrics?.totalManHours ?? 0).toLocaleString(), margin + 5, 240);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Logged hours — used for TRIR, LTIFR and severity rate calculations', margin + 5, 245);

  // Quick stats row
  const qs = [
    { lbl: 'INCIDENTS', val: String(data.stats.totalIncidents) },
    { lbl: 'TRIR', val: data.hseMetrics?.trir.toFixed(2) ?? '0.00' },
    { lbl: 'LTIFR', val: data.hseMetrics?.ltifr.toFixed(2) ?? '0.00' },
    { lbl: 'DAYS SAFE', val: data.stats.daysSinceLastIncident >= 999 ? '∞' : String(data.stats.daysSinceLastIncident) },
  ];
  const qsW = (contentWidth - 9) / 4;
  qs.forEach((q, i) => {
    const x = margin + i * (qsW + 3);
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(x, 253, qsW, 18, 2, 2, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(q.lbl, x + 3, 259);
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(q.val, x + 3, 267);
  });

  // Cover footer
  doc.setFillColor(37, 99, 235);
  doc.rect(0, pageH - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('Safedify HSE Platform — Executive Safety Performance Report — CONFIDENTIAL', margin, pageH - 4);

  // =========================================================
  // PAGE 2: EXECUTIVE DASHBOARD KPIs
  // =========================================================
  doc.addPage();
  let y = addPageHeader(doc, 'EXECUTIVE DASHBOARD', `${data.siteName} | ${data.dateRange.from} — ${data.dateRange.to}`, margin);

  y = addSectionHeader(doc, '01 — Digital Safety Score', y, COLORS.primary);
  // Score breakdown table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Component', 'Value', 'Impact', 'Rating']],
    body: [
      ['Overall Safety Score', data.safetyScore ? `${data.safetyScore.score}/100` : 'N/A', 'Composite', data.safetyScore?.rating ?? 'N/A'],
      ['Incidents Deduction', data.safetyScore ? `-${data.safetyScore.breakdown.incidents} pts` : 'N/A', 'Negative', 'Lagging indicator'],
      ['Observations Contribution', data.safetyScore ? `+${data.safetyScore.breakdown.observations} pts` : 'N/A', 'Positive', 'Leading indicator'],
      ['Actions Deduction', data.safetyScore ? `-${data.safetyScore.breakdown.actions} pts` : 'N/A', 'Negative', 'Lagging indicator'],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  y = addSectionHeader(doc, '02 — Key Performance Indicators', y, COLORS.primary);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['KPI', 'Current Value', 'Unit / Context', 'Industry Benchmark', 'Status']],
    body: [
      ['Total Man-Hours', (data.hseMetrics?.totalManHours ?? 0).toLocaleString(), 'Logged hours', '> 100,000 for validity', data.hseMetrics && data.hseMetrics.totalManHours >= 100000 ? '✓ Valid' : '⚠ Small sample'],
      ['Days Without Incident', data.stats.daysSinceLastIncident >= 999 ? 'No incidents' : String(data.stats.daysSinceLastIncident), 'Days', '≥ 30 excellent', data.stats.daysSinceLastIncident >= 30 ? '✓ Excellent streak' : data.stats.daysSinceLastIncident >= 7 ? '⚠ Monitor' : '⚠ Recent incident'],
      ['TRIR', data.hseMetrics?.trir.toFixed(2) ?? '0.00', 'per 200,000 hrs', '< 3.0', data.hseMetrics && data.hseMetrics.trir < 3 ? '✓ Within benchmark' : '⚠ Above benchmark'],
      ['LTIFR', data.hseMetrics?.ltifr.toFixed(2) ?? '0.00', 'per 1,000,000 hrs', '< 1.0', data.hseMetrics && data.hseMetrics.ltifr < 1 ? '✓ Within benchmark' : '⚠ Above benchmark'],
      ['Severity Rate', data.hseMetrics?.severityRate.toFixed(2) ?? '0.00', 'Days lost per 200k hrs', '< 2.0', data.hseMetrics && data.hseMetrics.severityRate <= 2 ? '✓ Within benchmark' : '⚠ Above benchmark'],
      ['Total Incidents', String(data.stats.totalIncidents), 'Total recorded', '0 = target', data.stats.totalIncidents === 0 ? '✓ Zero incidents' : `${data.stats.totalIncidents} incident(s) recorded`],
      ['Total Observations', String(data.stats.totalObservations), `Open: ${data.stats.openObservations} | Closed: ${data.stats.closedObservations}`, '≥ 5:1 vs incidents', 'Monitor trend'],
      ['Inspections Completed', String(data.stats.inspectionCount), 'Total', 'Site-specific target', 'On track'],
      ['Training Modules', String(data.stats.trainingModules), 'Available modules', 'Site-specific', `${data.stats.complianceRate}% compliance`],
      ['Action Closure Rate', `${closureRate}%`, `${data.stats.closedActions} of ${data.stats.totalActions}`, '≥ 80%', closureRate >= 80 ? '✓ Meets target' : closureRate >= 50 ? '⚠ In progress' : '⚠ Below target'],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 38 },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // =========================================================
  // PAGE 3: SAFETY PERFORMANCE MONITORING
  // =========================================================
  if (y > 200) { doc.addPage(); y = addPageHeader(doc, 'SAFETY PERFORMANCE MONITORING', `${data.siteName}`, margin); }
  else { y = addSectionHeader(doc, '03 — Safety Performance Monitoring', y, COLORS.secondary); }

  if (y <= 200) {
    y = addSectionHeader(doc, '03 — Incident Type Breakdown', y, COLORS.danger);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Incident Category', 'Count', 'Contribution to TRIR', 'Action Required']],
      body: [
        ['Fatalities', String(data.hseMetrics?.fatalityCount ?? 0), 'CRITICAL', data.hseMetrics && data.hseMetrics.fatalityCount > 0 ? 'Immediate Board Action' : 'None'],
        ['Lost Time Injuries (LTI)', String(data.hseMetrics?.ltiCount ?? 0), 'Yes (highest weight)', data.hseMetrics && data.hseMetrics.ltiCount > 0 ? 'Investigate & report' : 'None'],
        ['Restricted Work Cases (RWC)', String(data.hseMetrics?.rwcCount ?? 0), 'Yes', 'Monitor & track'],
        ['Medical Treatment Cases (MTC)', String(data.hseMetrics?.mtcCount ?? 0), 'Yes', 'Monitor & track'],
        ['First Aid Cases (FAC)', String(data.hseMetrics?.facCount ?? 0), 'No (not recordable)', 'Document only'],
        ['Near Misses', String(data.hseMetrics?.nmCount ?? 0), 'No (leading indicator)', 'Investigate root cause'],
      ],
      headStyles: { fillColor: COLORS.danger, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================
  // PAGE: INCIDENT REGISTER
  // =========================================================
  if (data.incidents.length > 0) {
    if (y > 200) { doc.addPage(); y = addPageHeader(doc, 'SAFETY PERFORMANCE MONITORING', `${data.siteName}`, margin); }
    y = addSectionHeader(doc, '04 — Incident Register', y, COLORS.danger);
    const incRows = data.incidents.slice(0, 30).map(inc => [
      new Date(inc.date).toLocaleDateString(),
      inc.type,
      inc.severity,
      inc.location || '—',
      inc.description.substring(0, 55) + (inc.description.length > 55 ? '…' : ''),
      inc.status,
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Type', 'Severity', 'Location', 'Description', 'Status']],
      body: incRows,
      headStyles: { fillColor: COLORS.danger, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 25 },
        2: { cellWidth: 18 },
        3: { cellWidth: 24 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 18 },
      },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================
  // PAGE: CORRECTIVE ACTIONS
  // =========================================================
  if (data.actions.length > 0) {
    if (y > 200) { doc.addPage(); y = addPageHeader(doc, 'CORRECTIVE ACTIONS', `${data.siteName}`, margin); }
    y = addSectionHeader(doc, '05 — Corrective Actions Register', y, COLORS.warning);
    const openActions = data.actions.filter(a => a.status !== 'Done');
    const closedActions = data.actions.filter(a => a.status === 'Done');
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Action Description', 'Assignee', 'Priority', 'Due Date', 'Status']],
      body: [
        ...openActions.slice(0, 20).map(act => [
          (act.description || act.title || '').substring(0, 55) + ((act.description || act.title || '').length > 55 ? '…' : ''),
          act.assignee || 'Unassigned',
          act.priority,
          act.dueDate ? new Date(act.dueDate).toLocaleDateString() : 'N/A',
          act.status,
        ]),
      ],
      headStyles: { fillColor: COLORS.warning, textColor: COLORS.dark, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [254, 252, 232] as [number, number, number] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`Summary: ${openActions.length} open, ${closedActions.length} closed — Closure rate: ${closureRate}%`, margin, y);
    y += 8;
  }

  // =========================================================
  // FOOTER ON ALL PAGES
  // =========================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, ph - 10, pageWidth, 10, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(0, ph - 10, 3, 10, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Safedify HSE Platform — Executive Safety Performance Report — CONFIDENTIAL', margin + 5, ph - 4);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 16, ph - 4);
  }

  const filename = `safedify-executive-dashboard-${data.dateRange.from}-to-${data.dateRange.to}.pdf`;
  doc.save(filename);
}
