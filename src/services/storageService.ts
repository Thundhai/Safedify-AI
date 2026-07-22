
import { Incident, Inspection, InspectionTemplate, ActionItem, IncidentType, IncidentSeverity, RiskAssessment, Observation, WorkerProfile, TrainingModule, TrainingRecord, PPEItem, PPEIssuance, Permit, PermitType, PermitStatus, Asset, AssetStatus, AssetCategory, Contractor, HSEDocument, EmergencyContact, EmergencyDrill, HSEMetrics, SafetyZone, SiteSafetyScore, HSEStatsLog, Role, UserRoles, SubscriptionTier, LiftingPlanRecord } from "../types";
import { getCurrentUser } from "./authService";

const STORAGE_KEYS = {
  INCIDENTS: 'hse_incidents',
  INSPECTIONS: 'hse_inspections',
  INSPECTION_TEMPLATES: 'hse_inspection_templates',
  ACTIONS: 'hse_actions',
  RISK_ASSESSMENTS: 'hse_risk_assessments',
  OBSERVATIONS: 'hse_observations',
  WORKERS: 'hse_workers',
  TRAINING_MODULES: 'hse_training_modules',
  TRAINING_RECORDS: 'hse_training_records',
  PPE_INVENTORY: 'hse_ppe_inventory',
  PPE_CATEGORIES: 'hse_ppe_categories',
  PPE_ISSUANCE: 'hse_ppe_issuance',
  PERMITS: 'hse_permits',
  LIFTING_PLANS: 'hse_lifting_plans',
  ASSETS: 'hse_assets',
  CONTRACTORS: 'hse_contractors',
  DOCUMENTS: 'hse_documents',
  EMERGENCY_CONTACTS: 'hse_emergency_contacts',
  EMERGENCY_DRILLS: 'hse_emergency_drills',
  MAN_HOURS: 'hse_man_hours',
  STATS_LOGS: 'hse_stats_logs',
  SAFETY_ZONES: 'hse_safety_zones',
  ROLES: 'hse_roles'
};

// --- DEFAULT ROLES & PERMISSIONS ---
const defaultRoles: Role[] = [
    {
        id: 'role-admin',
        name: UserRoles.ADMIN,
        description: 'Full system access and configuration.',
        isSystem: true,
        permissions: ['manage_roles', 'manage_users', 'view_analytics', 'create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'approve_permit', 'manage_documents', 'ai_features']
    },
    {
        id: 'role-manager',
        name: UserRoles.MANAGER,
        description: 'HSE Dept Lead. Approvals and Analytics.',
        isSystem: true,
        permissions: ['manage_users', 'view_analytics', 'create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'approve_permit', 'manage_documents', 'ai_features']
    },
    {
        id: 'role-coordinator',
        name: UserRoles.COORDINATOR,
        description: 'Coordinates safety activities and data.',
        isSystem: true,
        permissions: ['view_analytics', 'create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'approve_permit', 'manage_documents', 'ai_features']
    },
    {
        id: 'role-advisor',
        name: UserRoles.ADVISOR,
        description: 'Subject matter expert for risk and compliance.',
        isSystem: true,
        permissions: ['view_analytics', 'create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'ai_features']
    },
    {
        id: 'role-officer',
        name: UserRoles.OFFICER,
        description: 'Field safety officer executing inspections.',
        isSystem: true,
        permissions: ['create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'manage_documents', 'ai_features']
    },
    {
        id: 'role-supervisor',
        name: UserRoles.SUPERVISOR,
        description: 'Site supervisor responsible for team safety.',
        isSystem: true,
        permissions: ['create_incident', 'perform_inspection', 'create_permit', 'ai_features']
    },
    {
        id: 'role-technician',
        name: UserRoles.TECHNICIAN,
        description: 'HSE Technician for equipment and monitoring.',
        isSystem: true,
        permissions: ['create_incident', 'perform_inspection', 'ai_features']
    },
    {
        id: 'role-worker',
        name: UserRoles.WORKER,
        description: 'General staff reporting observations.',
        isSystem: true,
        permissions: ['create_incident']
    },
    {
        id: 'role-executive',
        name: UserRoles.EXECUTIVE,
        description: 'Senior leadership read-only access.',
        isSystem: true,
        permissions: ['view_analytics', 'view_analytics'] // Read only mostly
    }
];

// Seed data - empty for fresh app experience
const initialIncidents: Incident[] = [];

const initialActions: ActionItem[] = [];

const initialInspectionTemplates: InspectionTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'General Construction Site',
    category: 'Construction',
    description: 'Daily safety checks for construction zones.',
    items: [
        'Are all workers wearing required PPE (Hard Hat, Boots, Vest)?',
        'Is perimeter fencing intact and secure?',
        'Are walkways clear of trip hazards and debris?',
        'Is scaffolding properly tagged (Green Tag) and secured?',
        'Are electrical cables elevated or protected?',
        'Is fire fighting equipment accessible and charged?',
        'Are hazardous materials stored correctly with SDS available?',
        'Is signage for mandatory PPE visible?',
        'Are excavations properly barricaded and shored?',
        'Is welfare facility (water, toilet) accessible and clean?'
    ]
  },
  {
    id: 'tmpl-2',
    name: 'Heavy Vehicle Inspection',
    category: 'Logistics',
    description: 'Pre-use check for trucks and cranes.',
    items: [
        'Are tires in good condition (tread depth/pressure)?',
        'Do all lights, indicators, and beacons work?',
        'Are mirrors and windshield clean and undamaged?',
        'Are brakes (service and parking) functioning correctly?',
        'Is the reverse alarm audible?',
        'Are hydraulic hoses free from leaks and damage?',
        'Is the fire extinguisher present and charged?',
        'Is the operator cabin clean and free of loose objects?',
        'Are seatbelts functioning and being used?',
        'Is the load capacity chart available and legible?'
    ]
  },
  {
    id: 'tmpl-3',
    name: 'Office Safety Audit',
    category: 'Facilities',
    description: 'Monthly office environment check.',
    items: [
        'Are emergency exits clear, unlocked and lit?',
        'Are extension cords daisy-chained? (Check for NO)',
        'Is lighting adequate in all areas?',
        'Are fire extinguishers inspected and tagged?',
        'Is the first aid kit stocked and accessible?',
        'Are walkways free of boxes, cables, and trip hazards?',
        'Are filing cabinets closed when not in use?',
        'Are electrical sockets not overloaded?',
        'Is the kitchen area clean and appliances safe?',
        'Are display screens positioned to avoid glare?'
    ]
  },
  {
    id: 'tmpl-4',
    name: 'Hot Work Permit Audit',
    category: 'Permits',
    description: 'Compliance check for active hot work.',
    items: [
        'Is the Hot Work Permit valid and displayed at site?',
        'Is a trained fire watch present with a vest?',
        'Are combustibles removed from the area (10m radius)?',
        'Is proper fire extinguishing equipment on hand?',
        'Is welding equipment (hoses, regulators) in good condition?',
        'Is adequate ventilation provided for fumes?',
        'Are screens used to protect nearby workers from arc flash?',
        'Is PPE (face shield, gloves, apron) appropriate?',
        'Is a gas test detector active (if required)?',
        'Do workers understand the emergency procedure?'
    ]
  }
];

const initialRiskAssessments: RiskAssessment[] = [];

const initialObservations: Observation[] = [];

// --- Training Seed Data ---

const initialContractors: Contractor[] = [];

const initialWorkers: WorkerProfile[] = [];

const initialModules: TrainingModule[] = [];

const initialTrainingRecords: TrainingRecord[] = [];

// --- PPE Seed Data ---

const initialPPEInventory: PPEItem[] = [];

const initialPPECategories = [
    'Head Protection', 
    'Eye Protection', 
    'Hearing Protection', 
    'Respiratory Protection', 
    'Hand Protection', 
    'Foot Protection', 
    'Body Protection', 
    'Fall Protection'
];

const initialPPEIssuance: PPEIssuance[] = [];

// --- Permit Seed Data ---

const initialPermits: Permit[] = [];
const initialLiftingPlans: LiftingPlanRecord[] = [];

const initialAssets: Asset[] = [];

const initialDocuments: HSEDocument[] = [];

const initialEmergencyContacts: EmergencyContact[] = [];

const initialDrills: EmergencyDrill[] = [];

const initialSafetyZones: SafetyZone[] = [];

// --- Local Storage Helpers & Quota ---

// Constants for storage limits (in bytes approx)
const QUOTA_FREE = 5 * 1024 * 1024; // 5MB
const QUOTA_PRO = 100 * 1024 * 1024; // 100MB (Conceptual, browser limit is ~10MB usually)

export const getStorageUsage = (): number => {
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += (localStorage[key].length * 2); // approx 2 bytes per char
        }
    }
    return total;
};

export const checkQuota = (newDataSize: number = 0): boolean => {
    // TESTING MODE: Temporarily disable storage quota checks
    const TESTING_MODE = true; // Set to false to re-enable quota checks
    
    if (TESTING_MODE) {
        return true; // Skip quota check during testing
    }
    
    try {
        const user = getCurrentUser();
        const limit = user?.tier === SubscriptionTier.FREE ? QUOTA_FREE : QUOTA_PRO;
        const currentUsage = getStorageUsage();
        
        if (currentUsage + newDataSize > limit) {
            alert("Storage Quota Exceeded! Please upgrade your plan or delete old data (Images/Videos) to continue.");
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking quota:', error);
        // In case of error, allow the operation to proceed
        return true;
    }
};

// Clear all non-system data
export const clearUserData = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    alert("Local data cleared.");
    window.location.reload();
};

const get = <T>(key: string, initial: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  } catch (error) {
    console.error(`Error parsing stored data for key ${key}:`, error);
    // Clear corrupted data and return initial value
    localStorage.removeItem(key);
    return initial;
  }
};

const set = <T>(key: string, data: T) => {
  const json = JSON.stringify(data);
  // Estimate size: length * 2 bytes
  if (checkQuota(json.length * 2)) {
      try {
        localStorage.setItem(key, json);
      } catch (e) {
          console.error("Storage full", e);
          alert("Storage full. Cannot save data.");
      }
  }
};

// --- Exports ---

// Incidents
export const getIncidents = (): Incident[] => {
  const result = get(STORAGE_KEYS.INCIDENTS, initialIncidents);
  return Array.isArray(result) ? result : [];
};
export const getIncidentById = (id: string): Incident | undefined => getIncidents().find(i => i.id === id);
export const saveIncident = (incident: Incident) => {
  const incidents = getIncidents();
  set(STORAGE_KEYS.INCIDENTS, [incident, ...incidents]);
};
export const updateIncident = (incident: Incident) => {
  const incidents = getIncidents();
  set(STORAGE_KEYS.INCIDENTS, incidents.map(i => i.id === incident.id ? incident : i));
};

// Inspections
export const getInspections = (): Inspection[] => {
  const result = get(STORAGE_KEYS.INSPECTIONS, []);
  return Array.isArray(result) ? result : [];
};
export const saveInspection = (inspection: Inspection) => {
  const list = getInspections();
  set(STORAGE_KEYS.INSPECTIONS, [inspection, ...list]);
};
export const getInspectionTemplates = (): InspectionTemplate[] => {
    const custom = get<InspectionTemplate[]>(STORAGE_KEYS.INSPECTION_TEMPLATES, []);
    return [...initialInspectionTemplates, ...custom];
};
export const saveInspectionTemplate = (template: InspectionTemplate) => {
    const custom = get<InspectionTemplate[]>(STORAGE_KEYS.INSPECTION_TEMPLATES, []);
    set(STORAGE_KEYS.INSPECTION_TEMPLATES, [template, ...custom]);
};

// Actions
export const getActions = (): ActionItem[] => {
  const result = get(STORAGE_KEYS.ACTIONS, initialActions);
  return Array.isArray(result) ? result : [];
};
export const saveAction = (action: ActionItem) => {
  const actions = getActions();
  set(STORAGE_KEYS.ACTIONS, [action, ...actions]);
};
export const updateAction = (action: ActionItem) => {
  const actions = getActions();
  set(STORAGE_KEYS.ACTIONS, actions.map(a => a.id === action.id ? action : a));
};
export const deleteAction = (id: string) => {
  const actions = getActions();
  set(STORAGE_KEYS.ACTIONS, actions.filter(a => a.id !== id));
};

// Risk Assessments
export const getRiskAssessments = (): RiskAssessment[] => {
  const result = get(STORAGE_KEYS.RISK_ASSESSMENTS, initialRiskAssessments);
  return Array.isArray(result) ? result : [];
};
export const getRiskAssessmentById = (id: string): RiskAssessment | undefined => getRiskAssessments().find(r => r.id === id);
export const saveRiskAssessment = (ra: RiskAssessment) => {
    const list = getRiskAssessments();
    const exists = list.find(r => r.id === ra.id);
    if (exists) {
        set(STORAGE_KEYS.RISK_ASSESSMENTS, list.map(r => r.id === ra.id ? ra : r));
    } else {
        set(STORAGE_KEYS.RISK_ASSESSMENTS, [ra, ...list]);
    }
};

// Observations
export const getObservations = (): Observation[] => get(STORAGE_KEYS.OBSERVATIONS, initialObservations);
export const saveObservation = (obs: Observation) => {
    const list = getObservations();
    set(STORAGE_KEYS.OBSERVATIONS, [obs, ...list]);
};
export const updateObservation = (obs: Observation) => {
    const list = getObservations();
    set(STORAGE_KEYS.OBSERVATIONS, list.map(o => o.id === obs.id ? obs : o));
};
export const deleteObservation = (id: string) => {
    const list = getObservations();
    set(STORAGE_KEYS.OBSERVATIONS, list.filter(o => o.id !== id));
};

// Workers & Training
export const getWorkers = (): WorkerProfile[] => get(STORAGE_KEYS.WORKERS, initialWorkers);
export const getWorkerById = (id: string): WorkerProfile | undefined => getWorkers().find(w => w.id === id);
export const saveWorker = (worker: WorkerProfile) => {
    const workers = getWorkers();
    set(STORAGE_KEYS.WORKERS, [worker, ...workers]);
};
export const updateWorker = (worker: WorkerProfile) => {
    const workers = getWorkers();
    set(STORAGE_KEYS.WORKERS, workers.map(w => w.id === worker.id ? worker : w));
};
export const deleteWorker = (id: string) => {
    const workers = getWorkers();
    set(STORAGE_KEYS.WORKERS, workers.filter(w => w.id !== id));
};
export const getTrainingModules = (): TrainingModule[] => get(STORAGE_KEYS.TRAINING_MODULES, initialModules);
export const getTrainingRecords = (): TrainingRecord[] => get(STORAGE_KEYS.TRAINING_RECORDS, initialTrainingRecords);
export const saveTrainingRecord = (record: TrainingRecord) => {
    const list = getTrainingRecords();
    set(STORAGE_KEYS.TRAINING_RECORDS, [record, ...list]);
};
export const awardPoints = (workerId: string, points: number) => {
    const workers = getWorkers();
    const updated = workers.map(w => w.id === workerId ? { ...w, points: (w.points || 0) + points } : w);
    set(STORAGE_KEYS.WORKERS, updated);
};

// PPE Management
export const getPPEInventory = (): PPEItem[] => get(STORAGE_KEYS.PPE_INVENTORY, initialPPEInventory);
export const updatePPEStock = (id: string, newQuantity: number) => {
    const inv = getPPEInventory();
    set(STORAGE_KEYS.PPE_INVENTORY, inv.map(i => i.id === id ? { ...i, stockQuantity: newQuantity } : i));
};
export const savePPEItem = (item: PPEItem) => {
    const inv = getPPEInventory();
    set(STORAGE_KEYS.PPE_INVENTORY, [...inv, item]);
};
export const getPPECategories = (): string[] => get(STORAGE_KEYS.PPE_CATEGORIES, initialPPECategories);
export const savePPECategory = (category: string) => {
    const cats = getPPECategories();
    if (!cats.includes(category)) {
        set(STORAGE_KEYS.PPE_CATEGORIES, [...cats, category]);
    }
};
export const deletePPECategory = (category: string) => {
    const cats = getPPECategories();
    set(STORAGE_KEYS.PPE_CATEGORIES, cats.filter(c => c !== category));
};

export const getPPEIssuanceLogs = (): PPEIssuance[] => get(STORAGE_KEYS.PPE_ISSUANCE, initialPPEIssuance);
export const savePPEIssuance = (log: PPEIssuance) => {
    const logs = getPPEIssuanceLogs();
    set(STORAGE_KEYS.PPE_ISSUANCE, [log, ...logs]);
    
    // Automatically deduct stock
    const inv = getPPEInventory();
    const item = inv.find(i => i.id === log.ppeItemId);
    if (item && item.stockQuantity > 0) {
        updatePPEStock(item.id, item.stockQuantity - 1);
    }
};
export const returnPPEItem = (issuanceId: string) => {
    const logs = getPPEIssuanceLogs();
    const log = logs.find(l => l.id === issuanceId);
    if (log && log.status === 'Active') {
        // Update log status
        const updatedLogs = logs.map(l => l.id === issuanceId ? { ...l, status: 'Returned' as const } : l);
        set(STORAGE_KEYS.PPE_ISSUANCE, updatedLogs);
        
        // Add stock back
        const inv = getPPEInventory();
        const item = inv.find(i => i.id === log.ppeItemId);
        if (item) {
            updatePPEStock(item.id, item.stockQuantity + 1);
        }
    }
};
export const updatePPEIssuance = (log: PPEIssuance) => {
    const logs = getPPEIssuanceLogs();
    set(STORAGE_KEYS.PPE_ISSUANCE, logs.map(l => l.id === log.id ? log : l));
};

// Permits
export const getPermits = (): Permit[] => {
    // Check for expired permits on load
    const permits = get(STORAGE_KEYS.PERMITS, initialPermits);
    const now = new Date();
    let changed = false;
    const updated = permits.map(p => {
        if (p.status === PermitStatus.APPROVED && new Date(p.validUntil) < now) {
            changed = true;
            return { ...p, status: PermitStatus.EXPIRED };
        }
        return p;
    });
    if (changed) set(STORAGE_KEYS.PERMITS, updated);
    return updated;
};
export const getPermitById = (id: string): Permit | undefined => getPermits().find(p => p.id === id);
export const savePermit = (permit: Permit) => {
    const list = getPermits();
    const exists = list.find(p => p.id === permit.id);
    if (exists) {
        set(STORAGE_KEYS.PERMITS, list.map(p => p.id === permit.id ? permit : p));
    } else {
        set(STORAGE_KEYS.PERMITS, [permit, ...list]);
    }
};

// Lifting Plans
export const getLiftingPlans = (): LiftingPlanRecord[] => {
    const result = get(STORAGE_KEYS.LIFTING_PLANS, initialLiftingPlans);
    return Array.isArray(result) ? result : [];
};
export const getLiftingPlanById = (id: string): LiftingPlanRecord | undefined => getLiftingPlans().find(p => p.id === id);
export const saveLiftingPlan = (plan: LiftingPlanRecord) => {
    const list = getLiftingPlans();
    const exists = list.find(p => p.id === plan.id);
    if (exists) {
        set(STORAGE_KEYS.LIFTING_PLANS, list.map(p => p.id === plan.id ? plan : p));
    } else {
        set(STORAGE_KEYS.LIFTING_PLANS, [plan, ...list]);
    }
};

// Assets
export const getAssets = (): Asset[] => get(STORAGE_KEYS.ASSETS, initialAssets);
export const getAssetById = (id: string): Asset | undefined => getAssets().find(a => a.id === id);
export const saveAsset = (asset: Asset) => {
    const list = getAssets();
    const exists = list.find(a => a.id === asset.id);
    if (exists) {
        set(STORAGE_KEYS.ASSETS, list.map(a => a.id === asset.id ? asset : a));
    } else {
        set(STORAGE_KEYS.ASSETS, [asset, ...list]);
    }
};

// Contractors
export const getContractors = (): Contractor[] => get(STORAGE_KEYS.CONTRACTORS, initialContractors);
export const getContractorById = (id: string): Contractor | undefined => getContractors().find(c => c.id === id);
export const saveContractor = (contractor: Contractor) => {
    const list = getContractors();
    const exists = list.find(c => c.id === contractor.id);
    if (exists) {
        set(STORAGE_KEYS.CONTRACTORS, list.map(c => c.id === contractor.id ? contractor : c));
    } else {
        set(STORAGE_KEYS.CONTRACTORS, [contractor, ...list]);
    }
};

// Documents
export const getDocuments = (): HSEDocument[] => get(STORAGE_KEYS.DOCUMENTS, initialDocuments);
export const getDocumentById = (id: string): HSEDocument | undefined => getDocuments().find(d => d.id === id);
export const saveDocument = (doc: HSEDocument) => {
    const list = getDocuments();
    const exists = list.find(d => d.id === doc.id);
    if (exists) {
        set(STORAGE_KEYS.DOCUMENTS, list.map(d => d.id === doc.id ? doc : d));
    } else {
        set(STORAGE_KEYS.DOCUMENTS, [doc, ...list]);
    }
};

// Emergency
export const getEmergencyContacts = (): EmergencyContact[] => get(STORAGE_KEYS.EMERGENCY_CONTACTS, initialEmergencyContacts);
export const saveEmergencyContact = (contact: EmergencyContact) => {
    const list = getEmergencyContacts();
    set(STORAGE_KEYS.EMERGENCY_CONTACTS, [contact, ...list]);
};
export const deleteEmergencyContact = (id: string) => {
    const list = getEmergencyContacts();
    set(STORAGE_KEYS.EMERGENCY_CONTACTS, list.filter(c => c.id !== id));
};

export const getEmergencyDrills = (): EmergencyDrill[] => get(STORAGE_KEYS.EMERGENCY_DRILLS, initialDrills);
export const saveEmergencyDrill = (drill: EmergencyDrill) => {
    const list = getEmergencyDrills();
    set(STORAGE_KEYS.EMERGENCY_DRILLS, [drill, ...list]);
};

// Analytics & Stats Input
export const getStatsLogs = (): HSEStatsLog[] => get(STORAGE_KEYS.STATS_LOGS, []);
export const saveStatsLog = (log: HSEStatsLog) => {
    const logs = getStatsLogs();
    set(STORAGE_KEYS.STATS_LOGS, [log, ...logs]);
};

// Roles Management
export const getRoles = (): Role[] => get(STORAGE_KEYS.ROLES, defaultRoles);
export const saveRole = (role: Role) => {
    const roles = getRoles();
    const exists = roles.find(r => r.id === role.id);
    if (exists) {
        set(STORAGE_KEYS.ROLES, roles.map(r => r.id === role.id ? role : r));
    } else {
        set(STORAGE_KEYS.ROLES, [...roles, role]);
    }
};
export const deleteRole = (id: string) => {
    const roles = getRoles();
    const roleToDelete = roles.find(r => r.id === id);
    if (roleToDelete && !roleToDelete.isSystem) {
        set(STORAGE_KEYS.ROLES, roles.filter(r => r.id !== id));
    }
};

// Man Hours Calculation
export const getManHours = (): number => {
    const logs = getStatsLogs();
    if (logs.length > 0) {
        return logs.reduce((total, log) => total + log.manHours, 0);
    }
    return get(STORAGE_KEYS.MAN_HOURS, 0); // Start with 0 for fresh users
};
export const saveManHours = (hours: number) => set(STORAGE_KEYS.MAN_HOURS, hours);

export const calculateHSEMetrics = (): HSEMetrics => {
    try {
        const incidents = getIncidents();
        const actions = getActions();
        const inspections = getInspections();
        const manHours = getManHours();

        const ltiCount = incidents.filter(i => i.type === IncidentType.LTI).length;
        const mtcCount = incidents.filter(i => i.type === IncidentType.MEDICAL_TREATMENT).length;
        const facCount = incidents.filter(i => i.type === IncidentType.FIRST_AID).length;
        const nmCount = incidents.filter(i => i.type === IncidentType.NEAR_MISS).length;
        
        // TRIR = (Total Recordable * 200,000) / Man Hours
        const recordables = ltiCount + mtcCount;
        const trir = manHours > 0 ? (recordables * 200000) / manHours : 0;
        
        // LTIFR = (LTI * 1,000,000) / Man Hours
        const ltifr = manHours > 0 ? (ltiCount * 1000000) / manHours : 0;

        const closedActions = actions.filter(a => a.status === 'Done').length;
        const closureRate = actions.length > 0 ? (closedActions / actions.length) * 100 : 100;

        const passedInspections = inspections.filter(i => i.score >= 80).length;
        const inspectionCompliance = inspections.length > 0 ? (passedInspections / inspections.length) * 100 : 100;

        return {
            totalManHours: manHours || 0,
            ltiCount: ltiCount || 0,
            mtcCount: mtcCount || 0,
            rwcCount: 0,
            facCount: facCount || 0,
            nmCount: nmCount || 0,
            trir: isFinite(trir) ? trir : 0,
            ltifr: isFinite(ltifr) ? ltifr : 0,
            actionClosureRate: Math.round(closureRate) || 0,
            inspectionCompliance: Math.round(inspectionCompliance) || 0
        };
    } catch (error) {
        console.error('Error calculating HSE metrics:', error);
        // Return safe default values
        return {
            totalManHours: 0,
            ltiCount: 0,
            mtcCount: 0,
            rwcCount: 0,
            facCount: 0,
            nmCount: 0,
            trir: 0,
            ltifr: 0,
            actionClosureRate: 0,
            inspectionCompliance: 0
        };
    }
};

export const calculateSiteSafetyScore = (): SiteSafetyScore => {
    const metrics = calculateHSEMetrics();
    let score = 100;
    score -= (metrics.ltiCount * 20);
    score -= (metrics.mtcCount * 10);
    score -= (metrics.facCount * 2);
    
    const actions = getActions();
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
            incidents: metrics.ltiCount + metrics.mtcCount + metrics.facCount,
            observations: getObservations().length,
            inspections: getInspections().length,
            training: 0, // Start with 0 for fresh users
            actions: actions.filter(a => a.status !== 'Done').length
        }
    };
};

// Geo-fencing
export const getSafetyZones = (): SafetyZone[] => get(STORAGE_KEYS.SAFETY_ZONES, initialSafetyZones);
export const saveSafetyZone = (zone: SafetyZone) => {
    const zones = getSafetyZones();
    set(STORAGE_KEYS.SAFETY_ZONES, [...zones, zone]);
};
export const deleteSafetyZone = (id: string) => {
    const zones = getSafetyZones();
    set(STORAGE_KEYS.SAFETY_ZONES, zones.filter(z => z.id !== id));
};
