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
