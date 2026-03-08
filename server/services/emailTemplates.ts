/**
 * Email Templates for various notification types
 */
import { sendEmail } from './emailService';

// ============ INCIDENT NOTIFICATIONS ============
export const sendIncidentCreatedEmail = async (
  to: string,
  incidentData: {
    title: string;
    description: string;
    severity: string;
    location: string;
    reportedBy: string;
    incidentId: string;
  }
) => {
  const severityEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[incidentData.severity.toLowerCase()] || '⚪';
  
  return sendEmail({
    to,
    subject: `${severityEmoji} New Incident Reported: ${incidentData.title}`,
    text: `A new incident has been reported and requires your attention.

Title: ${incidentData.title}
Severity: ${incidentData.severity.toUpperCase()}
Location: ${incidentData.location}
Reported By: ${incidentData.reportedBy}

Description:
${incidentData.description}

Please log in to Safedify to view full details and take action.`,
    html: generateIncidentHtml(incidentData),
  });
};

const generateIncidentHtml = (data: {
  title: string;
  description: string;
  severity: string;
  location: string;
  reportedBy: string;
}) => {
  const severityColor = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' }[data.severity.toLowerCase()] || '#64748b';
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#0f172a;padding:24px 32px">
      <h1 style="color:#f97316;margin:0;font-size:22px">🛡️ Safedify</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:12px">Incident Alert</p>
    </div>
    <div style="padding:32px">
      <div style="display:inline-block;background:${severityColor};color:white;padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:bold;text-transform:uppercase;margin-bottom:16px">${data.severity}</div>
      <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${data.title}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;width:100px">Location:</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:500">${data.location}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px">Reported By:</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:500">${data.reportedBy}</td>
        </tr>
      </table>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border-left:4px solid ${severityColor}">
        <p style="color:#475569;line-height:1.6;font-size:14px;margin:0">${data.description}</p>
      </div>
      <a href="#" style="display:inline-block;margin-top:24px;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">View Incident Details</a>
    </div>
  </div>
</body>
</html>`;
};

// ============ PERMIT NOTIFICATIONS ============
export const sendPermitExpiringEmail = async (
  to: string,
  permitData: {
    permitType: string;
    location: string;
    expiresAt: string;
    daysUntilExpiry: number;
  }
) => {
  const urgency = permitData.daysUntilExpiry <= 1 ? '🚨' : permitData.daysUntilExpiry <= 3 ? '⚠️' : '📅';
  
  return sendEmail({
    to,
    subject: `${urgency} Permit Expiring: ${permitData.permitType} - ${permitData.daysUntilExpiry} day(s) remaining`,
    text: `Your permit is expiring soon and may need renewal.

Permit Type: ${permitData.permitType}
Location: ${permitData.location}
Expires: ${permitData.expiresAt}
Days Remaining: ${permitData.daysUntilExpiry}

Please log in to Safedify to renew this permit before it expires.`,
  });
};

// ============ TRAINING NOTIFICATIONS ============
export const sendTrainingDueEmail = async (
  to: string,
  trainingData: {
    workerName: string;
    courseName: string;
    dueDate: string;
    daysOverdue?: number;
  }
) => {
  const isOverdue = trainingData.daysOverdue && trainingData.daysOverdue > 0;
  const emoji = isOverdue ? '❌' : '📚';
  
  return sendEmail({
    to,
    subject: `${emoji} Training ${isOverdue ? 'Overdue' : 'Due'}: ${trainingData.courseName}`,
    text: `Training certification ${isOverdue ? 'is overdue' : 'requires completion'}.

Worker: ${trainingData.workerName}
Course: ${trainingData.courseName}
Due Date: ${trainingData.dueDate}
${isOverdue ? `Days Overdue: ${trainingData.daysOverdue}` : ''}

Please ensure this training is completed as soon as possible.`,
  });
};

// ============ ACTION ITEM NOTIFICATIONS ============
export const sendActionAssignedEmail = async (
  to: string,
  actionData: {
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    assignedBy: string;
  }
) => {
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[actionData.priority.toLowerCase()] || '⚪';
  
  return sendEmail({
    to,
    subject: `${priorityEmoji} Action Assigned: ${actionData.title}`,
    text: `You have been assigned a new action item.

Title: ${actionData.title}
Priority: ${actionData.priority}
Due Date: ${actionData.dueDate}
Assigned By: ${actionData.assignedBy}

Description:
${actionData.description}

Please log in to Safedify to view and complete this action.`,
  });
};

// ============ OBSERVATION NOTIFICATIONS ============
export const sendObservationReportEmail = async (
  to: string,
  observationData: {
    type: 'positive' | 'negative';
    category: string;
    description: string;
    location: string;
    reportedBy: string;
  }
) => {
  const emoji = observationData.type === 'positive' ? '✅' : '⚠️';
  const typeLabel = observationData.type === 'positive' ? 'Positive Observation' : 'Safety Concern';
  
  return sendEmail({
    to,
    subject: `${emoji} ${typeLabel}: ${observationData.category}`,
    text: `A new safety observation has been reported.

Type: ${typeLabel}
Category: ${observationData.category}
Location: ${observationData.location}
Reported By: ${observationData.reportedBy}

Description:
${observationData.description}

Please log in to Safedify to review this observation.`,
  });
};

// ============ DAILY DIGEST ============
export const sendDailyDigestEmail = async (
  to: string,
  digestData: {
    date: string;
    incidentCount: number;
    openActionsCount: number;
    expiringPermitsCount: number;
    overdueTrainingCount: number;
  }
) => {
  const totalAlerts = digestData.incidentCount + digestData.expiringPermitsCount + digestData.overdueTrainingCount;
  const emoji = totalAlerts === 0 ? '✅' : totalAlerts > 5 ? '🚨' : '📊';
  
  return sendEmail({
    to,
    subject: `${emoji} Safedify Daily Summary - ${digestData.date}`,
    text: `Here's your daily HSE summary for ${digestData.date}:

📋 Summary:
• New Incidents: ${digestData.incidentCount}
• Open Action Items: ${digestData.openActionsCount}
• Permits Expiring Soon: ${digestData.expiringPermitsCount}
• Overdue Training: ${digestData.overdueTrainingCount}

${totalAlerts === 0 ? '✅ No urgent items requiring attention!' : '⚠️ Please review the items above in Safedify.'}

Log in to Safedify for full details and to take action.`,
  });
};

export default {
  sendIncidentCreatedEmail,
  sendPermitExpiringEmail,
  sendTrainingDueEmail,
  sendActionAssignedEmail,
  sendObservationReportEmail,
  sendDailyDigestEmail,
};
