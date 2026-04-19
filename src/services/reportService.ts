/**
 * Report Service — Individual Incident / Observation / Investigation PDF & CSV exports
 *
 * Document numbering: ORG-INC-001 (incidents) | ORG-OBR-001 (observations)
 * When no org: SAF-INC-001 / SAF-OBR-001
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Incident, Observation, Investigation } from '../types';

// ─── Colours ────────────────────────────────────────────────────
const C = {
  primary:  [30, 64, 175]   as [number, number, number],
  dark:     [15, 23, 42]    as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  light:    [241, 245, 249] as [number, number, number],
  grey:     [71, 85, 105]   as [number, number, number],
  red:      [220, 38, 38]   as [number, number, number],
  green:    [22, 163, 74]   as [number, number, number],
  amber:    [217, 119, 6]   as [number, number, number],
  blueLight:[219, 234, 254] as [number, number, number],
};

// ─── Document numbering ────────────────────────────────────────
// Persistent per-session serial counter keyed by orgAbbr+docType
const serialCounters = new Map<string, number>();

function orgAbbrev(orgName?: string): string {
  if (!orgName) return 'SAF';
  // Take first 3 uppercase letters, or first 3 chars uppercase
  const words = orgName.trim().split(/\s+/);
  if (words.length >= 3) return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  return orgName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SAF';
}

export function generateDocNumber(orgName: string | undefined, docType: 'INC' | 'OBR', serialHint?: number): string {
  const abbr = orgAbbrev(orgName);
  const key = `${abbr}-${docType}`;
  let serial: number;
  if (serialHint != null) {
    serial = serialHint;
  } else {
    serial = (serialCounters.get(key) ?? 0) + 1;
    serialCounters.set(key, serial);
  }
  return `${abbr}-${docType}-${String(serial).padStart(3, '0')}`;
}

// ─── Helpers ────────────────────────────────────────────────────
function fmtDate(d?: string): string {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtDateTime(d?: string): string {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}
function yn(v: boolean | null | undefined): string { return v === true ? 'Yes' : v === false ? 'No' : 'N/A'; }
function s(v: any): string { return v != null && v !== '' ? String(v) : 'N/A'; }

function addFooter(doc: jsPDF, docNumber: string) {
  const totalPages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.dark);
    doc.rect(0, pageH - 12, pageW, 12, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document: ${docNumber}`, 15, pageH - 4);
    doc.text(`Safedify HSE Platform — Confidential`, pageW / 2 - 25, pageH - 4);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 35, pageH - 4);
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 15;
  }
  return y;
}

// ═══════════════════════════════════════════════════════════════
//  INCIDENT PDF
// ═══════════════════════════════════════════════════════════════
export function downloadIncidentPDF(
  incident: Incident,
  orgName?: string,
  serialNumber?: number,
): string {
  const docNum = generateDocNumber(orgName, 'INC', serialNumber);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = 0;

  // ── Header banner ──
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 48, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName || 'Safedify HSE', M, 18);
  doc.setFontSize(14);
  doc.text('Incident Report', M, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document No: ${docNum}`, M, 37);
  doc.text(`Generated: ${fmtDateTime(new Date().toISOString())}`, W - M - 70, 37);
  // Severity badge
  const sevColor = incident.severity === 'Critical' ? C.red : incident.severity === 'High' ? C.amber : C.green;
  doc.setFillColor(...sevColor);
  doc.roundedRect(W - M - 30, 10, 30, 12, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(incident.severity || 'N/A', W - M - 28 + 2, 18);
  y = 55;

  // ── Section 1: Incident Summary ──
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Incident Summary', M, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [
      ['Incident ID', incident.id],
      ['Date & Time of Incident', fmtDateTime(incident.date)],
      ['Date Reported', fmtDate(incident.dateReported)],
      ['Location', s(incident.location)],
      ['Department', s(incident.department)],
      ['Shift', s(incident.shift)],
      ['Weather Conditions', s(incident.weatherConditions)],
      ['Type', s(incident.type)],
      ['Category', s(incident.category)],
      ['Severity', s(incident.severity)],
      ['Status', s(incident.status)],
      ['Task Being Performed', s(incident.taskBeingPerformed)],
    ],
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold', textColor: C.dark }, 1: { cellWidth: 'auto' } },
    headStyles: { fillColor: C.primary },
    bodyStyles: { fontSize: 9, textColor: C.dark },
    alternateRowStyles: { fillColor: C.light },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Section 2: Description ──
  y = ensureSpace(doc, y, 30);
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Description of Incident', M, y);
  y += 5;
  doc.setTextColor(...C.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(incident.description || 'N/A', W - 2 * M);
  doc.text(descLines, M, y);
  y += descLines.length * 4.5 + 6;

  // ── Section 3: Immediate Actions Taken ──
  if (incident.immediateActionsTaken || incident.immediateAction) {
    y = ensureSpace(doc, y, 25);
    doc.setTextColor(...C.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Immediate Actions Taken', M, y);
    y += 5;
    doc.setTextColor(...C.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const actLines = doc.splitTextToSize(incident.immediateActionsTaken || incident.immediateAction || 'N/A', W - 2 * M);
    doc.text(actLines, M, y);
    y += actLines.length * 4.5 + 6;
  }

  // ── Section 4: Injured Persons ──
  if (incident.injuredPersons?.length > 0) {
    y = ensureSpace(doc, y, 30);
    doc.setTextColor(...C.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Injured Persons', M, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Name', 'Employment', 'Job Title', 'Dept', 'Injury', 'Body Part', 'Treatment', 'Days Lost']],
      body: incident.injuredPersons.map(p => [
        s(p.name), s(p.employmentType), s(p.jobTitle), s(p.department),
        s(p.natureOfInjury), s(p.bodyPart), s(p.treatmentProvided), String(p.daysLost ?? 0),
      ]),
      headStyles: { fillColor: C.red, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: C.dark },
      alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Section 5: Witnesses ──
  if (incident.witnesses?.length > 0) {
    y = ensureSpace(doc, y, 25);
    doc.setTextColor(...C.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Witnesses', M, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Name', 'Contact', 'Statement']],
      body: incident.witnesses.map(w => [s(w.name), s(w.contactInfo), s(w.statement)]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: C.dark },
      alternateRowStyles: { fillColor: C.light },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Section 6: PPE & Environmental ──
  y = ensureSpace(doc, y, 30);
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('6. PPE & Environmental Assessment', M, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [
      ['PPE Worn', incident.ppeWorn?.length ? incident.ppeWorn.join(', ') : 'N/A'],
      ['PPE Adequate for Task', yn(incident.ppeAdequate)],
      ['Environmental Impact', s(incident.environmentalImpact)],
      ['Area Secured', yn(incident.areaSecured)],
      ['Emergency Services Notified', yn(incident.emergencyServicesNotified)],
      ['Regulatory Notification', yn(incident.regulatoryNotification)],
    ],
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold', textColor: C.dark } },
    bodyStyles: { fontSize: 9, textColor: C.dark },
    alternateRowStyles: { fillColor: C.light },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Section 7: Investigation (if exists) ──
  if (incident.investigation) {
    y = renderInvestigationSection(doc, incident.investigation, y, M, W);
  }

  addFooter(doc, docNum);
  doc.save(`${docNum}-Incident-Report.pdf`);
  return docNum;
}


// ═══════════════════════════════════════════════════════════════
//  INVESTIGATION PDF (standalone full-page)
// ═══════════════════════════════════════════════════════════════
export function downloadInvestigationPDF(
  incident: Incident,
  orgName?: string,
  serialNumber?: number,
): string {
  if (!incident.investigation) throw new Error('No investigation data');
  const docNum = generateDocNumber(orgName, 'INC', serialNumber);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = 0;

  // ── Header ──
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 48, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName || 'Safedify HSE', M, 18);
  doc.setFontSize(14);
  doc.text(`Investigation Report — ${incident.investigation.method}`, M, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document No: ${docNum}`, M, 37);
  doc.text(`Related Incident: ${incident.id.substring(0, 8)}`, M, 43);
  doc.text(`Generated: ${fmtDateTime(new Date().toISOString())}`, W - M - 70, 37);
  y = 55;

  // ── Incident context summary ──
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Incident Context', M, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [
      ['Incident Date', fmtDateTime(incident.date)],
      ['Location', s(incident.location)],
      ['Type / Category', `${s(incident.type)} / ${s(incident.category)}`],
      ['Severity', s(incident.severity)],
      ['Description', incident.description?.substring(0, 200) + (incident.description?.length > 200 ? '...' : '')],
    ],
    columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', textColor: C.dark } },
    bodyStyles: { fontSize: 9, textColor: C.dark },
    alternateRowStyles: { fillColor: C.light },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Investigation details ──
  y = renderInvestigationSection(doc, incident.investigation, y, M, W, true);

  addFooter(doc, docNum);
  doc.save(`${docNum}-Investigation-Report.pdf`);
  return docNum;
}


// ─── Shared investigation rendering ────────────────────────────
function renderInvestigationSection(
  doc: jsPDF, inv: Investigation, startY: number,
  M: number, W: number, standalone = false,
): number {
  let y = startY;
  const secNum = standalone ? '2' : '7';

  y = ensureSpace(doc, y, 40);
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${secNum}. Investigation — ${inv.method} Analysis`, M, y);
  y += 3;

  if (inv.method === '5-Why' && inv.whys?.length) {
    // ─ 5-Why Table ─
    const whyRows = inv.whys
      .filter(w => w?.trim())
      .map((w, i) => [`Why ${i + 1}`, w]);

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Step', 'Question / Answer']],
      body: whyRows,
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: C.dark },
      columnStyles: { 0: { cellWidth: 25, fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: C.blueLight },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;

  } else if (inv.method === 'Fishbone' && inv.categories) {
    // ─ Fishbone Diagram (text representation) ─
    const cats = inv.categories;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Fishbone Category', 'Contributing Factor']],
      body: [
        ['Man (People)', s(cats.man)],
        ['Machine (Equipment)', s(cats.machine)],
        ['Method (Process)', s(cats.method)],
        ['Material', s(cats.material)],
        ['Environment', s(cats.environment)],
      ],
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: C.dark },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: C.blueLight },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Draw simplified fishbone diagram
    y = ensureSpace(doc, y, 65);
    y = drawFishboneDiagram(doc, cats, inv.rootCause, M, y, W);
    y += 8;
  }

  // ─ Root Cause ─
  y = ensureSpace(doc, y, 25);
  doc.setFillColor(...C.light);
  doc.roundedRect(M, y, W - 2 * M, 5, 1, 1, 'F');
  doc.setTextColor(...C.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Root Cause', M + 3, y + 4);
  y += 8;
  doc.setTextColor(...C.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const rcLines = doc.splitTextToSize(inv.rootCause || 'Not identified', W - 2 * M);
  doc.text(rcLines, M, y);
  y += rcLines.length * 4.5 + 6;

  // ─ Completed By ─
  y = ensureSpace(doc, y, 12);
  doc.setFontSize(8);
  doc.setTextColor(...C.grey);
  doc.text(`Investigated by: ${inv.completedBy || 'N/A'}  |  Date: ${fmtDateTime(inv.completedAt)}`, M, y);
  y += 8;

  return y;
}


// ─── Fishbone Diagram Drawing ──────────────────────────────────
function drawFishboneDiagram(
  doc: jsPDF,
  cats: { man: string; machine: string; method: string; material: string; environment: string },
  rootCause: string,
  M: number, startY: number, W: number,
): number {
  const y = startY;
  const usable = W - 2 * M;
  const centerY = y + 28;
  const spineLeft = M + 10;
  const spineRight = M + usable - 10;

  // Spine (horizontal line)
  doc.setDrawColor(...C.dark);
  doc.setLineWidth(0.8);
  doc.line(spineLeft, centerY, spineRight, centerY);

  // Effect box (right end)
  doc.setFillColor(...C.red);
  doc.roundedRect(spineRight - 2, centerY - 6, 12, 12, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('EFFECT', spineRight - 1, centerY + 1);

  // Category labels and bones
  const topCats = [
    { label: 'Man', text: cats.man },
    { label: 'Method', text: cats.method },
    { label: 'Environment', text: cats.environment },
  ];
  const botCats = [
    { label: 'Machine', text: cats.machine },
    { label: 'Material', text: cats.material },
  ];

  const spacing = (spineRight - spineLeft - 20) / Math.max(topCats.length, 1);

  // Top bones
  topCats.forEach((cat, i) => {
    const bx = spineLeft + 15 + i * spacing;
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.5);
    doc.line(bx, centerY, bx - 10, centerY - 18);
    doc.setTextColor(...C.primary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(cat.label, bx - 12, centerY - 20);
    if (cat.text) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...C.grey);
      const t = cat.text.length > 30 ? cat.text.substring(0, 30) + '...' : cat.text;
      doc.text(t, bx - 12, centerY - 15);
    }
  });

  // Bottom bones
  botCats.forEach((cat, i) => {
    const bx = spineLeft + 30 + i * spacing;
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.5);
    doc.line(bx, centerY, bx - 10, centerY + 18);
    doc.setTextColor(...C.primary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(cat.label, bx - 12, centerY + 24);
    if (cat.text) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...C.grey);
      const t = cat.text.length > 30 ? cat.text.substring(0, 30) + '...' : cat.text;
      doc.text(t, bx - 12, centerY + 29);
    }
  });

  return y + 58;
}


// ═══════════════════════════════════════════════════════════════
//  OBSERVATION PDF
// ═══════════════════════════════════════════════════════════════
export function downloadObservationPDF(
  obs: Observation,
  orgName?: string,
  serialNumber?: number,
): string {
  const docNum = generateDocNumber(orgName, 'OBR', serialNumber);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = 0;

  // ── Header ──
  const typeColor = obs.type === 'Safe Behavior' ? C.green : obs.type === 'Near Miss' ? C.amber : C.red;
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 45, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName || 'Safedify HSE', M, 18);
  doc.setFontSize(14);
  doc.text('Observation Report (STOP Card)', M, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document No: ${docNum}`, M, 37);
  doc.text(`Generated: ${fmtDateTime(new Date().toISOString())}`, W - M - 70, 37);
  // Type badge
  doc.setFillColor(...typeColor);
  doc.roundedRect(W - M - 35, 10, 35, 12, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(obs.type, W - M - 33, 18);
  y = 52;

  // ── Details ──
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Observation Details', M, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [
      ['Observation ID', obs.id],
      ['Date', fmtDateTime(obs.date)],
      ['Type', s(obs.type)],
      ['Category', s(obs.category)],
      ['Location', s(obs.location)],
      ['Observer', obs.isAnonymous ? 'Anonymous' : s(obs.observer)],
      ['Status', s(obs.status)],
    ],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', textColor: C.dark } },
    bodyStyles: { fontSize: 9, textColor: C.dark },
    alternateRowStyles: { fillColor: C.light },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Description ──
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', M, y);
  y += 5;
  doc.setTextColor(...C.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dLines = doc.splitTextToSize(obs.description || 'N/A', W - 2 * M);
  doc.text(dLines, M, y);
  y += dLines.length * 4.5 + 6;

  // ── Immediate Action ──
  if (obs.immediateActionTaken) {
    y = ensureSpace(doc, y, 25);
    doc.setTextColor(...C.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Immediate Action Taken', M, y);
    y += 5;
    doc.setTextColor(...C.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const aLines = doc.splitTextToSize(obs.immediateActionTaken, W - 2 * M);
    doc.text(aLines, M, y);
    y += aLines.length * 4.5 + 6;
  }

  addFooter(doc, docNum);
  doc.save(`${docNum}-Observation-Report.pdf`);
  return docNum;
}


// ═══════════════════════════════════════════════════════════════
//  CSV EXPORTS
// ═══════════════════════════════════════════════════════════════
function escapeCSV(val: any): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSVBlob(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadIncidentCSV(
  incident: Incident,
  orgName?: string,
  serialNumber?: number,
): string {
  const docNum = generateDocNumber(orgName, 'INC', serialNumber);
  const header = [
    'Document No', 'Organization', 'Incident ID', 'Date', 'Date Reported',
    'Location', 'Department', 'Shift', 'Type', 'Category', 'Severity', 'Status',
    'Description', 'Task Being Performed', 'Weather Conditions',
    'PPE Worn', 'PPE Adequate', 'Environmental Impact',
    'Area Secured', 'Emergency Services Notified', 'Regulatory Notification',
    'Immediate Actions Taken',
    'Injured Persons', 'Witnesses',
    'Root Cause', 'Investigation Method', 'Investigation By', 'Investigation Date',
  ];
  const row = [
    docNum, orgName || 'N/A', incident.id, fmtDateTime(incident.date), fmtDate(incident.dateReported),
    s(incident.location), s(incident.department), s(incident.shift),
    s(incident.type), s(incident.category), s(incident.severity), s(incident.status),
    s(incident.description), s(incident.taskBeingPerformed), s(incident.weatherConditions),
    incident.ppeWorn?.join('; ') || 'N/A', yn(incident.ppeAdequate), s(incident.environmentalImpact),
    yn(incident.areaSecured), yn(incident.emergencyServicesNotified), yn(incident.regulatoryNotification),
    s(incident.immediateActionsTaken || incident.immediateAction),
    incident.injuredPersons?.map(p => `${p.name} (${p.natureOfInjury})`).join('; ') || 'None',
    incident.witnesses?.map(w => w.name).join('; ') || 'None',
    s(incident.investigation?.rootCause), s(incident.investigation?.method),
    s(incident.investigation?.completedBy), fmtDateTime(incident.investigation?.completedAt),
  ];
  downloadCSVBlob([header, row], `${docNum}-Incident-Report.csv`);
  return docNum;
}

export function downloadObservationCSV(
  obs: Observation,
  orgName?: string,
  serialNumber?: number,
): string {
  const docNum = generateDocNumber(orgName, 'OBR', serialNumber);
  const header = [
    'Document No', 'Organization', 'Observation ID', 'Date', 'Type', 'Category',
    'Location', 'Observer', 'Status', 'Description', 'Immediate Action Taken',
  ];
  const row = [
    docNum, orgName || 'N/A', obs.id, fmtDateTime(obs.date), s(obs.type), s(obs.category),
    s(obs.location), obs.isAnonymous ? 'Anonymous' : s(obs.observer), s(obs.status),
    s(obs.description), s(obs.immediateActionTaken),
  ];
  downloadCSVBlob([header, row], `${docNum}-Observation-Report.csv`);
  return docNum;
}
