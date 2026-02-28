/**
 * Storage Service — API-backed data layer
 * 
 * All data functions are now ASYNC and fetch/persist data via the backend API.
 * The backend stores data in SQLite for real persistence and multi-user support.
 * Falls back to safe defaults if the API is unavailable.
 */

import {
  Incident, Inspection, InspectionTemplate, ActionItem,
  IncidentType, IncidentCategory, IncidentSeverity,
  RiskAssessment, Observation, WorkerProfile,
  TrainingModule, TrainingRecord, PPEItem, PPEIssuance,
  Permit, PermitType, PermitStatus,
  Asset, AssetStatus, AssetCategory,
  Contractor, HSEDocument, EmergencyContact, EmergencyDrill,
  HSEMetrics, SafetyZone, SiteSafetyScore, HSEStatsLog,
  Role, UserRoles, SubscriptionTier, isRecordable
} from "../types";
import {
  apiGetIncidents, apiGetIncident, apiCreateIncident, apiUpdateIncident, apiDeleteIncident,
  apiGetActions, apiCreateAction, apiUpdateAction, apiDeleteAction,
  apiGetObservations, apiCreateObservation,
  apiGetInspections, apiCreateInspection,
  apiGetPermits, apiCreatePermit, apiUpdatePermit,
  apiGetWorkers, apiCreateWorker, apiUpdateWorker,
  apiGetContractors, apiCreateContractor,
  apiGetAssets, apiCreateAsset,
  apiGetDocuments, apiCreateDocument,
  apiGetStats, apiLogStats,
  apiGetEmergencyContacts, apiCreateEmergencyContact,
  apiGetEmergencyDrills, apiCreateEmergencyDrill,
  apiGetRiskAssessments, apiGetRiskAssessment, apiCreateRiskAssessment, apiUpdateRiskAssessment,
  apiGetInspectionTemplates, apiCreateInspectionTemplate,
  apiGetTrainingModules, apiCreateTrainingModule,
  apiGetTrainingRecords, apiCreateTrainingRecord,
  apiGetPPEInventory, apiCreatePPEItem, apiUpdatePPEItem,
  apiGetPPEIssuance, apiCreatePPEIssuance, apiUpdatePPEIssuance,
  apiGetRoles, apiCreateRole, apiDeleteRole as apiDeleteRoleApi,
  apiGetSafetyZones, apiCreateSafetyZone, apiDeleteSafetyZone as apiDeleteSafetyZoneApi,
  apiGetMetrics,
} from './apiService';

// ---------- Helper: map API snake_case to frontend camelCase ----------

const mapIncident = (row: any): Incident => ({
  id: row.id,
  description: row.description,
  date: row.date,
  location: row.location || '',
  type: row.type as IncidentType,
  category: (row.category || 'Near Miss') as IncidentCategory,
  severity: row.severity as IncidentSeverity,
  status: row.status || 'Open',
  images: row.image ? [row.image] : [],
  reporter: row.reported_by || '',
  daysLost: row.days_lost || 0,
  bodyPart: row.body_part,
  mechanism: row.mechanism,
  immediateAction: row.immediate_action,
  aiClassification: undefined,
  investigation: undefined,
});

const mapAction = (row: any): ActionItem => ({
  id: row.id,
  title: row.title,
  description: row.description,
  assignee: row.assignee || '',
  dueDate: row.due_date || '',
  completedDate: row.completed_date,
  priority: row.priority || 'Medium',
  status: row.status || 'Open',
  actionType: row.action_type || 'Corrective',
  category: row.category || 'Other',
  indicator: row.indicator || 'Lagging',
  relatedIncidentId: row.related_incident_id,
  verifiedBy: row.verified_by,
  effectiveness: row.effectiveness || 'Not Assessed',
});

const mapObservation = (row: any): Observation => ({
  id: row.id,
  type: row.type,
  category: row.category || '',
  description: row.description,
  location: row.location || '',
  date: row.date,
  observer: row.observer,
  isAnonymous: !!row.is_anonymous,
  images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [],
  status: row.status || 'Open',
  immediateActionTaken: row.immediate_action,
});

const mapInspection = (row: any): Inspection => ({
  id: row.id,
  templateId: row.template_name || '',
  templateName: row.template_name || '',
  title: row.title,
  date: row.date,
  location: row.location || '',
  inspector: row.inspector || '',
  items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
  score: row.score || 0,
  completed: !!row.completed,
  signature: row.signature,
});

const mapPermit = (row: any): Permit => ({
  id: row.id,
  type: row.type as PermitType,
  location: row.location || '',
  description: row.description,
  validFrom: row.valid_from || '',
  validUntil: row.valid_until || '',
  requestor: row.requestor || '',
  approver: row.approver,
  status: row.status as PermitStatus,
  controls: row.controls ? (typeof row.controls === 'string' ? JSON.parse(row.controls) : row.controls) : [],
  approverComments: row.approver_comments,
  aiAuditIssues: row.ai_audit_issues ? (typeof row.ai_audit_issues === 'string' ? JSON.parse(row.ai_audit_issues) : row.ai_audit_issues) : undefined,
});

const mapWorker = (row: any): WorkerProfile => ({
  id: row.id,
  name: row.name,
  role: row.role || '',
  department: row.department || '',
  companyId: row.company_id,
  joinedDate: row.joined_date || row.created_at || '',
  email: row.email,
  phone: row.phone,
  points: row.points || 0,
  level: row.level || 'Novice',
  badges: row.badges ? (typeof row.badges === 'string' ? JSON.parse(row.badges) : row.badges) : [],
});

const mapContractor = (row: any): Contractor => ({
  id: row.id,
  name: row.name,
  contactPerson: row.contact_person || '',
  email: row.email || '',
  phone: row.phone || '',
  status: row.status || 'Pending',
  documents: row.documents ? (typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents) : [],
  complianceScore: row.compliance_score || 0,
});

const mapAsset = (row: any): Asset => ({
  id: row.id,
  name: row.name,
  category: (row.category as AssetCategory) || 'Tools',
  modelNumber: row.model_number || '',
  serialNumber: row.serial_number || '',
  location: row.location || '',
  status: (row.status as AssetStatus) || 'Operational',
  lastInspectionDate: row.last_inspection_date,
  nextInspectionDate: row.next_inspection_date || '',
  image: row.image,
  documents: row.documents ? (typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents) : [],
  maintenanceHistory: row.maintenance_history ? (typeof row.maintenance_history === 'string' ? JSON.parse(row.maintenance_history) : row.maintenance_history) : [],
});

const mapDocument = (row: any): HSEDocument => ({
  id: row.id,
  title: row.title,
  category: row.category || 'Report',
  version: `v${row.version || 1}.0`,
  status: row.status || 'Draft',
  uploadDate: row.created_at || '',
  author: row.uploaded_by || '',
  contentUrl: row.content,
  description: row.content,
  approvedBy: row.approved_by,
  approvalDate: row.approval_date,
  aiSummary: row.ai_summary,
});

const mapRiskAssessment = (row: any): RiskAssessment => ({
  id: row.id,
  title: row.title,
  taskDescription: row.task_description || '',
  type: row.type || 'JHA',
  date: row.date,
  author: row.author || '',
  hazards: typeof row.hazards === 'string' ? JSON.parse(row.hazards) : (row.hazards || []),
  status: row.status || 'Draft',
});

const mapEmergencyContact = (row: any): EmergencyContact => ({
  id: row.id,
  name: row.name,
  role: row.role || '',
  phone: row.phone,
  type: row.type || 'External Service',
  location: row.location,
});

const mapEmergencyDrill = (row: any): EmergencyDrill => ({
  id: row.id,
  type: row.type,
  date: row.date,
  location: row.location,
  participantsCount: row.participants_count || 0,
  durationMinutes: row.duration_minutes || 0,
  outcome: row.outcome || 'Success',
  notes: row.notes,
  attendanceList: row.attendance_list ? (typeof row.attendance_list === 'string' ? JSON.parse(row.attendance_list) : row.attendance_list) : [],
});

const mapRole = (row: any): Role => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  isSystem: row.isSystem ?? !!row.is_system,
  permissions: row.permissions ? (typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions) : [],
});

const mapPPEItem = (row: any): PPEItem => ({
  id: row.id,
  name: row.name,
  category: row.category || '',
  stockQuantity: row.stock_quantity ?? row.stockQuantity ?? 0,
  minStockThreshold: row.min_stock_threshold ?? row.minStockThreshold ?? 5,
  description: row.description,
});

const mapPPEIssuance = (row: any): PPEIssuance => ({
  id: row.id,
  workerId: row.worker_id || row.workerId,
  workerName: row.worker_name || row.workerName || '',
  ppeItemId: row.ppe_item_id || row.ppeItemId,
  ppeItemName: row.ppe_item_name || row.ppeItemName || '',
  issueDate: row.issue_date || row.issueDate || '',
  expiryDate: row.expiry_date || row.expiryDate,
  signatureUrl: row.signature_url || row.signatureUrl,
  status: row.status || 'Active',
});

const mapTrainingModule = (row: any): TrainingModule => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  requiredForRoles: row.required_for_roles ? (typeof row.required_for_roles === 'string' ? JSON.parse(row.required_for_roles) : row.required_for_roles) : [],
  validityMonths: row.validity_months ?? 0,
});

const mapTrainingRecord = (row: any): TrainingRecord => ({
  id: row.id,
  workerId: row.worker_id || row.workerId,
  moduleId: row.module_id || row.moduleId || '',
  moduleTitle: row.module_title || row.moduleTitle || '',
  completionDate: row.completion_date || row.completionDate || '',
  expiryDate: row.expiry_date || row.expiryDate,
  certificateUrl: row.certificate_url || row.certificateUrl,
  status: row.status || 'Valid',
});

const mapSafetyZone = (row: any): SafetyZone => ({
  id: row.id,
  name: row.name,
  type: row.type || 'Safe',
  lat: row.lat,
  lng: row.lng,
  radius: row.radius || 100,
  requiredPPE: row.required_ppe ? (typeof row.required_ppe === 'string' ? JSON.parse(row.required_ppe) : row.required_ppe) : (row.requiredPPE || []),
  requiredTraining: row.required_training ? (typeof row.required_training === 'string' ? JSON.parse(row.required_training) : row.required_training) : (row.requiredTraining || []),
});

const mapStatsLog = (row: any): HSEStatsLog => ({
  id: row.id,
  date: row.date,
  period: row.period || 'Daily',
  manHours: row.man_hours ?? row.manHours ?? 0,
  activeWorkers: row.active_workers ?? row.activeWorkers ?? 0,
  remarks: row.remarks,
});

const mapTemplate = (row: any): InspectionTemplate => ({
  id: row.id,
  name: row.name,
  category: row.category || '',
  description: row.description || '',
  items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
});

// ---------- Helper: Frontend model → API body ----------

const incidentToApi = (inc: Incident) => ({
  description: inc.description,
  location: inc.location,
  date: inc.date,
  type: inc.type,
  category: inc.category,
  severity: inc.severity,
  status: inc.status,
  image: inc.images?.[0] || null,
  root_cause: inc.investigation?.rootCause,
  days_lost: inc.daysLost || 0,
  body_part: inc.bodyPart,
  mechanism: inc.mechanism,
  immediate_action: inc.immediateAction,
});

const actionToApi = (a: ActionItem) => ({
  title: a.title,
  description: a.description,
  assignee: a.assignee,
  due_date: a.dueDate,
  completed_date: a.completedDate,
  priority: a.priority,
  status: a.status,
  action_type: a.actionType,
  category: a.category,
  indicator: a.indicator,
  related_incident_id: a.relatedIncidentId,
  verified_by: a.verifiedBy,
  effectiveness: a.effectiveness,
});

const observationToApi = (o: Observation) => ({
  type: o.type,
  category: o.category,
  description: o.description,
  location: o.location,
  date: o.date,
  observer: o.observer,
  is_anonymous: o.isAnonymous ? 1 : 0,
  immediate_action: o.immediateActionTaken,
  images: o.images,
});

// ---------- Storage / Quota (backward compat stubs) ----------

export const getStorageUsage = (): number => 0;
export const checkQuota = (_size: number = 0): boolean => true;
export const clearUserData = () => {
  alert("Data is stored on the server. Contact admin to clear data.");
};

// ---------- Incidents ----------

export const getIncidents = async (): Promise<Incident[]> => {
  try {
    const rows = await apiGetIncidents();
    return (Array.isArray(rows) ? rows : []).map(mapIncident);
  } catch { return []; }
};

export const getIncidentById = async (id: string): Promise<Incident | undefined> => {
  try {
    const row = await apiGetIncident(id);
    return row ? mapIncident(row) : undefined;
  } catch { return undefined; }
};

export const saveIncident = async (incident: Incident): Promise<void> => {
  await apiCreateIncident(incidentToApi(incident));
};

export const updateIncident = async (incident: Incident): Promise<void> => {
  await apiUpdateIncident(incident.id, incidentToApi(incident));
};

// ---------- Inspections ----------

export const getInspections = async (): Promise<Inspection[]> => {
  try {
    const rows = await apiGetInspections();
    return (Array.isArray(rows) ? rows : []).map(mapInspection);
  } catch { return []; }
};

export const saveInspection = async (inspection: Inspection): Promise<void> => {
  await apiCreateInspection({
    template_name: inspection.templateName,
    title: inspection.title,
    date: inspection.date,
    location: inspection.location,
    items: inspection.items,
    score: inspection.score,
    completed: inspection.completed ? 1 : 0,
    signature: inspection.signature,
  });
};

export const getInspectionTemplates = async (): Promise<InspectionTemplate[]> => {
  try {
    const rows = await apiGetInspectionTemplates();
    return (Array.isArray(rows) ? rows : []).map(mapTemplate);
  } catch { return []; }
};

export const saveInspectionTemplate = async (template: InspectionTemplate): Promise<void> => {
  await apiCreateInspectionTemplate({
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    items: template.items,
  });
};

// ---------- Actions ----------

export const getActions = async (): Promise<ActionItem[]> => {
  try {
    const rows = await apiGetActions();
    return (Array.isArray(rows) ? rows : []).map(mapAction);
  } catch { return []; }
};

export const saveAction = async (action: ActionItem): Promise<void> => {
  await apiCreateAction(actionToApi(action));
};

export const updateAction = async (action: ActionItem): Promise<void> => {
  await apiUpdateAction(action.id, actionToApi(action));
};

// ---------- Risk Assessments ----------

export const getRiskAssessments = async (): Promise<RiskAssessment[]> => {
  try {
    const rows = await apiGetRiskAssessments();
    return (Array.isArray(rows) ? rows : []).map(mapRiskAssessment);
  } catch { return []; }
};

export const getRiskAssessmentById = async (id: string): Promise<RiskAssessment | undefined> => {
  try {
    const row = await apiGetRiskAssessment(id);
    return row ? mapRiskAssessment(row) : undefined;
  } catch { return undefined; }
};

export const saveRiskAssessment = async (ra: RiskAssessment): Promise<void> => {
  try {
    await apiUpdateRiskAssessment(ra.id, {
      title: ra.title,
      taskDescription: ra.taskDescription,
      type: ra.type,
      date: ra.date,
      hazards: ra.hazards,
      status: ra.status,
    });
  } catch {
    await apiCreateRiskAssessment({
      id: ra.id,
      title: ra.title,
      taskDescription: ra.taskDescription,
      type: ra.type,
      date: ra.date,
      author: ra.author,
      hazards: ra.hazards,
      status: ra.status,
    });
  }
};

// ---------- Observations ----------

export const getObservations = async (): Promise<Observation[]> => {
  try {
    const rows = await apiGetObservations();
    return (Array.isArray(rows) ? rows : []).map(mapObservation);
  } catch { return []; }
};

export const saveObservation = async (obs: Observation): Promise<void> => {
  await apiCreateObservation(observationToApi(obs));
};

export const updateObservation = async (obs: Observation): Promise<void> => {
  await apiCreateObservation(observationToApi(obs));
};

export const deleteObservation = async (_id: string): Promise<void> => {
  console.warn('Observation delete not yet supported on backend');
};

// ---------- Workers ----------

export const getWorkers = async (): Promise<WorkerProfile[]> => {
  try {
    const rows = await apiGetWorkers();
    return (Array.isArray(rows) ? rows : []).map(mapWorker);
  } catch { return []; }
};

export const getWorkerById = async (id: string): Promise<WorkerProfile | undefined> => {
  const workers = await getWorkers();
  return workers.find(w => w.id === id);
};

export const saveWorker = async (worker: WorkerProfile): Promise<void> => {
  await apiCreateWorker({
    name: worker.name,
    role: worker.role,
    department: worker.department,
    company_id: worker.companyId,
    joined_date: worker.joinedDate,
    email: worker.email,
    phone: worker.phone,
  });
};

export const updateWorker = async (worker: WorkerProfile): Promise<void> => {
  await apiUpdateWorker(worker.id, {
    name: worker.name,
    role: worker.role,
    department: worker.department,
    email: worker.email,
    phone: worker.phone,
    points: worker.points,
    level: worker.level,
  });
};

export const deleteWorker = async (id: string): Promise<void> => {
  console.warn('Worker delete not yet supported on backend, id:', id);
};

export const awardPoints = async (workerId: string, points: number): Promise<void> => {
  const worker = await getWorkerById(workerId);
  if (worker) {
    await apiUpdateWorker(workerId, { points: (worker.points || 0) + points });
  }
};

// ---------- Training ----------

export const getTrainingModules = async (): Promise<TrainingModule[]> => {
  try {
    const rows = await apiGetTrainingModules();
    return (Array.isArray(rows) ? rows : []).map(mapTrainingModule);
  } catch { return []; }
};

export const getTrainingRecords = async (): Promise<TrainingRecord[]> => {
  try {
    const rows = await apiGetTrainingRecords();
    return (Array.isArray(rows) ? rows : []).map(mapTrainingRecord);
  } catch { return []; }
};

export const saveTrainingRecord = async (record: TrainingRecord): Promise<void> => {
  await apiCreateTrainingRecord({
    id: record.id,
    workerId: record.workerId,
    moduleId: record.moduleId,
    moduleTitle: record.moduleTitle,
    completionDate: record.completionDate,
    expiryDate: record.expiryDate,
    certificateUrl: record.certificateUrl,
    status: record.status,
  });
};

// ---------- PPE ----------

export const getPPEInventory = async (): Promise<PPEItem[]> => {
  try {
    const rows = await apiGetPPEInventory();
    return (Array.isArray(rows) ? rows : []).map(mapPPEItem);
  } catch { return []; }
};

export const savePPEItem = async (item: PPEItem): Promise<void> => {
  await apiCreatePPEItem({
    id: item.id,
    name: item.name,
    category: item.category,
    stockQuantity: item.stockQuantity,
    minStockThreshold: item.minStockThreshold,
    description: item.description,
  });
};

export const updatePPEStock = async (id: string, newQuantity: number): Promise<void> => {
  await apiUpdatePPEItem(id, { stockQuantity: newQuantity });
};

export const getPPECategories = async (): Promise<string[]> => {
  return ['Head Protection', 'Eye Protection', 'Hearing Protection', 'Respiratory Protection', 'Hand Protection', 'Foot Protection', 'Body Protection', 'Fall Protection'];
};

export const savePPECategory = async (_cat: string): Promise<void> => {};
export const deletePPECategory = async (_cat: string): Promise<void> => {};

export const getPPEIssuanceLogs = async (): Promise<PPEIssuance[]> => {
  try {
    const rows = await apiGetPPEIssuance();
    return (Array.isArray(rows) ? rows : []).map(mapPPEIssuance);
  } catch { return []; }
};

export const savePPEIssuance = async (log: PPEIssuance): Promise<void> => {
  await apiCreatePPEIssuance({
    id: log.id,
    workerId: log.workerId,
    workerName: log.workerName,
    ppeItemId: log.ppeItemId,
    ppeItemName: log.ppeItemName,
    issueDate: log.issueDate,
    expiryDate: log.expiryDate,
    signatureUrl: log.signatureUrl,
    status: log.status,
  });
};

export const returnPPEItem = async (issuanceId: string): Promise<void> => {
  await apiUpdatePPEIssuance(issuanceId, { status: 'Returned' });
};

export const updatePPEIssuance = async (log: PPEIssuance): Promise<void> => {
  await apiUpdatePPEIssuance(log.id, { status: log.status });
};

// ---------- Permits ----------

export const getPermits = async (): Promise<Permit[]> => {
  try {
    const rows = await apiGetPermits();
    return (Array.isArray(rows) ? rows : []).map(mapPermit);
  } catch { return []; }
};

export const getPermitById = async (id: string): Promise<Permit | undefined> => {
  const permits = await getPermits();
  return permits.find(p => p.id === id);
};

export const savePermit = async (permit: Permit): Promise<void> => {
  try {
    await apiUpdatePermit(permit.id, {
      status: permit.status,
      approver: permit.approver,
      approver_comments: permit.approverComments,
    });
  } catch {
    await apiCreatePermit({
      type: permit.type,
      location: permit.location,
      description: permit.description,
      valid_from: permit.validFrom,
      valid_until: permit.validUntil,
      requestor: permit.requestor,
      status: permit.status,
      controls: permit.controls,
    });
  }
};

// ---------- Assets ----------

export const getAssets = async (): Promise<Asset[]> => {
  try {
    const rows = await apiGetAssets();
    return (Array.isArray(rows) ? rows : []).map(mapAsset);
  } catch { return []; }
};

export const getAssetById = async (id: string): Promise<Asset | undefined> => {
  const assets = await getAssets();
  return assets.find(a => a.id === id);
};

export const saveAsset = async (asset: Asset): Promise<void> => {
  try {
    await apiCreateAsset({
      name: asset.name,
      category: asset.category,
      model_number: asset.modelNumber,
      serial_number: asset.serialNumber,
      location: asset.location,
      status: asset.status,
      next_inspection_date: asset.nextInspectionDate,
    });
  } catch (e) { console.error('Save asset error:', e); }
};

// ---------- Contractors ----------

export const getContractors = async (): Promise<Contractor[]> => {
  try {
    const rows = await apiGetContractors();
    return (Array.isArray(rows) ? rows : []).map(mapContractor);
  } catch { return []; }
};

export const getContractorById = async (id: string): Promise<Contractor | undefined> => {
  const list = await getContractors();
  return list.find(c => c.id === id);
};

export const saveContractor = async (contractor: Contractor): Promise<void> => {
  await apiCreateContractor({
    name: contractor.name,
    contact_person: contractor.contactPerson,
    email: contractor.email,
    phone: contractor.phone,
    status: contractor.status,
  });
};

// ---------- Documents ----------

export const getDocuments = async (): Promise<HSEDocument[]> => {
  try {
    const rows = await apiGetDocuments();
    return (Array.isArray(rows) ? rows : []).map(mapDocument);
  } catch { return []; }
};

export const getDocumentById = async (id: string): Promise<HSEDocument | undefined> => {
  const docs = await getDocuments();
  return docs.find(d => d.id === id);
};

export const saveDocument = async (doc: HSEDocument): Promise<void> => {
  await apiCreateDocument({
    title: doc.title,
    category: doc.category,
    content: doc.contentUrl || doc.description,
    status: doc.status,
  });
};

// ---------- Emergency ----------

export const getEmergencyContacts = async (): Promise<EmergencyContact[]> => {
  try {
    const rows = await apiGetEmergencyContacts();
    return (Array.isArray(rows) ? rows : []).map(mapEmergencyContact);
  } catch { return []; }
};

export const saveEmergencyContact = async (contact: EmergencyContact): Promise<void> => {
  await apiCreateEmergencyContact({
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    type: contact.type,
    location: contact.location,
  });
};

export const deleteEmergencyContact = async (_id: string): Promise<void> => {
  console.warn('Emergency contact delete not yet supported');
};

export const getEmergencyDrills = async (): Promise<EmergencyDrill[]> => {
  try {
    const rows = await apiGetEmergencyDrills();
    return (Array.isArray(rows) ? rows : []).map(mapEmergencyDrill);
  } catch { return []; }
};

export const saveEmergencyDrill = async (drill: EmergencyDrill): Promise<void> => {
  await apiCreateEmergencyDrill({
    type: drill.type,
    date: drill.date,
    location: drill.location,
    participants_count: drill.participantsCount,
    duration_minutes: drill.durationMinutes,
    outcome: drill.outcome,
    notes: drill.notes,
    attendance_list: drill.attendanceList,
  });
};

// ---------- Stats ----------

export const getStatsLogs = async (): Promise<HSEStatsLog[]> => {
  try {
    const data = await apiGetStats();
    return (Array.isArray(data.statsLogs) ? data.statsLogs : []).map(mapStatsLog);
  } catch { return []; }
};

export const saveStatsLog = async (log: HSEStatsLog): Promise<void> => {
  await apiLogStats({
    date: log.date,
    period: log.period,
    man_hours: log.manHours,
    active_workers: log.activeWorkers,
    remarks: log.remarks,
  });
};

// ---------- Roles ----------

export const getRoles = async (): Promise<Role[]> => {
  try {
    const rows = await apiGetRoles();
    return (Array.isArray(rows) ? rows : []).map(mapRole);
  } catch {
    return [
      { id: 'role-admin', name: UserRoles.ADMIN, description: 'Full system access.', isSystem: true, permissions: ['manage_roles','manage_users','view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
      { id: 'role-manager', name: UserRoles.MANAGER, description: 'HSE Dept Lead.', isSystem: true, permissions: ['manage_users','view_analytics','create_incident','manage_incidents','perform_inspection','create_permit','approve_permit','manage_documents','ai_features'] },
      { id: 'role-worker', name: UserRoles.WORKER, description: 'General staff.', isSystem: true, permissions: ['create_incident'] },
    ];
  }
};

export const saveRole = async (role: Role): Promise<void> => {
  await apiCreateRole({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem ? 1 : 0,
    permissions: role.permissions,
  });
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiDeleteRoleApi(id);
};

// ---------- Man Hours ----------

export const getManHours = async (): Promise<number> => {
  try {
    const data = await apiGetStats();
    return data.totalManHours || 0;
  } catch { return 0; }
};

export const saveManHours = async (_hours: number): Promise<void> => {};

// ---------- HSE Metrics ----------

export const calculateHSEMetrics = async (): Promise<HSEMetrics> => {
  try {
    const metrics = await apiGetMetrics();
    return {
      totalManHours: metrics.totalManHours || 0,
      ltiCount: metrics.ltiCount || 0,
      mtcCount: metrics.mtcCount || 0,
      rwcCount: metrics.rwcCount || 0,
      facCount: metrics.facCount || 0,
      nmCount: metrics.nmCount || 0,
      fatalityCount: metrics.fatalityCount || 0,
      trir: metrics.trir || 0,
      ltifr: metrics.ltifr || 0,
      severityRate: metrics.severityRate || 0,
      actionClosureRate: metrics.actionClosureRate || 0,
      inspectionCompliance: metrics.inspectionCompliance || 0,
      leadingActions: metrics.leadingActions || 0,
      leadingClosureRate: metrics.leadingClosureRate || 0,
      inspectionsCompleted: metrics.inspectionsCompleted || 0,
      trainingHours: metrics.trainingHours || 0,
      nearMissReportingRate: metrics.nearMissReportingRate || 0,
      laggingActions: metrics.laggingActions || 0,
      laggingClosureRate: metrics.laggingClosureRate || 0,
      daysLost: metrics.daysLost || 0,
      recordableIncidents: metrics.recordableIncidents || 0,
    };
  } catch {
    return {
      totalManHours: 0, ltiCount: 0, mtcCount: 0, rwcCount: 0, facCount: 0,
      nmCount: 0, fatalityCount: 0, trir: 0, ltifr: 0, severityRate: 0,
      actionClosureRate: 0, inspectionCompliance: 0, leadingActions: 0,
      leadingClosureRate: 0, inspectionsCompleted: 0, trainingHours: 0,
      nearMissReportingRate: 0, laggingActions: 0, laggingClosureRate: 0,
      daysLost: 0, recordableIncidents: 0,
    };
  }
};

export const calculateSiteSafetyScore = async (): Promise<SiteSafetyScore> => {
  try {
    const metrics = await calculateHSEMetrics();
    const incidents = await getIncidents();
    const actions = await getActions();
    const observations = await getObservations();
    const inspections = await getInspections();

    let score = 100;
    score -= (metrics.ltiCount * 20);
    score -= (metrics.mtcCount * 10);
    score -= (metrics.facCount * 2);

    const overdue = actions.filter(a => a.status !== 'Done' && new Date(a.dueDate) < new Date()).length;
    score -= (overdue * 5);
    score = Math.max(0, Math.min(100, score));

    let rating: SiteSafetyScore['rating'] = 'Poor';
    if (score >= 90) rating = 'Excellent';
    else if (score >= 75) rating = 'Good';
    else if (score >= 60) rating = 'Fair';

    return {
      score,
      rating,
      breakdown: {
        incidents: incidents.length,
        observations: observations.length,
        inspections: inspections.length,
        training: 0,
        actions: actions.filter(a => a.status !== 'Done').length,
      }
    };
  } catch {
    return { score: 100, rating: 'Excellent', breakdown: { incidents: 0, observations: 0, inspections: 0, training: 0, actions: 0 } };
  }
};

// ---------- Safety Zones ----------

export const getSafetyZones = async (): Promise<SafetyZone[]> => {
  try {
    const rows = await apiGetSafetyZones();
    return (Array.isArray(rows) ? rows : []).map(mapSafetyZone);
  } catch { return []; }
};

export const saveSafetyZone = async (zone: SafetyZone): Promise<void> => {
  await apiCreateSafetyZone({
    id: zone.id,
    name: zone.name,
    type: zone.type,
    lat: zone.lat,
    lng: zone.lng,
    radius: zone.radius,
    requiredPPE: zone.requiredPPE,
    requiredTraining: zone.requiredTraining,
  });
};

export const deleteSafetyZone = async (id: string): Promise<void> => {
  await apiDeleteSafetyZoneApi(id);
};
