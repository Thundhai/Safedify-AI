
import { Incident, Inspection, InspectionTemplate, ActionItem, IncidentType, IncidentSeverity, RiskAssessment, Observation, WorkerProfile, TrainingModule, TrainingRecord, PPEItem, PPEIssuance, Permit, PermitType, PermitStatus, Asset, AssetStatus, AssetCategory, Contractor, HSEDocument, EmergencyContact, EmergencyDrill, HSEMetrics, SafetyZone, SiteSafetyScore, HSEStatsLog, Role, UserRoles, SubscriptionTier } from "../types";
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

// Seed data
const initialIncidents: Incident[] = [
  {
    id: 'inc-001',
    description: 'Worker slipped on oil spill near Generator B.',
    date: '2023-10-25T09:30:00',
    location: 'Zone B - Power Plant',
    type: IncidentType.FIRST_AID,
    severity: IncidentSeverity.LOW,
    status: 'Closed',
    images: [],
    reporter: 'John Doe',
    investigation: {
      method: '5-Why',
      whys: [
        'Worker slipped',
        'Oil was on floor',
        'Generator B leaked oil',
        'Seal was worn out',
        'Preventive maintenance schedule missed'
      ],
      rootCause: 'Lack of adherence to maintenance schedule',
      completedBy: 'Safety Officer',
      completedAt: '2023-10-26T10:00:00'
    }
  },
  {
    id: 'inc-002',
    description: 'Scaffolding collapse due to high winds.',
    date: '2023-10-27T14:15:00',
    location: 'Site Perimeter',
    type: IncidentType.PROPERTY_DAMAGE,
    severity: IncidentSeverity.HIGH,
    status: 'Investigating',
    images: [],
    reporter: 'Jane Smith'
  }
];

const initialActions: ActionItem[] = [
  {
    id: 'act-001',
    title: 'Clean up oil spill Zone B',
    assignee: 'Maintenance Team',
    dueDate: '2023-10-26',
    priority: 'High',
    status: 'Done',
    relatedIncidentId: 'inc-001'
  },
  {
    id: 'act-002',
    title: 'Inspect all scaffolding anchors',
    assignee: 'Site Engineer',
    dueDate: '2023-10-28',
    priority: 'High',
    status: 'In Progress',
    relatedIncidentId: 'inc-002'
  }
];

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

const initialRiskAssessments: RiskAssessment[] = [
    {
        id: 'risk-001',
        title: 'Confined Space Entry - Tank A',
        taskDescription: 'Cleaning sludge from bottom of fuel tank A using high pressure water.',
        type: 'JHA',
        date: '2023-11-01T08:00:00',
        author: 'Mike Ross',
        status: 'Approved',
        hazards: [
            {
                id: 'haz-1',
                description: 'Toxic gas accumulation',
                probability: 3,
                severity: 5,
                riskScore: 15,
                controls: [
                    { id: 'ctrl-1', type: 'Engineering', description: 'Forced ventilation for 2 hours prior to entry' },
                    { id: 'ctrl-2', type: 'PPE', description: 'SCBA for all entrants' }
                ]
            }
        ]
    }
];

const initialObservations: Observation[] = [
  {
    id: 'obs-001',
    type: 'Unsafe Act',
    category: 'PPE',
    description: 'Worker observed welding without a face shield.',
    location: 'Workshop',
    date: '2023-10-28T10:00:00',
    isAnonymous: false,
    observer: 'Supervisor A',
    status: 'Closed',
    images: [],
    immediateActionTaken: 'Stopped work, instructed worker to wear shield.'
  },
  {
    id: 'obs-002',
    type: 'Unsafe Condition',
    category: 'Housekeeping',
    description: 'Loose cables across the walkway causing trip hazard.',
    location: 'Corridor B',
    date: '2023-10-28T11:30:00',
    isAnonymous: true,
    status: 'Open',
    images: []
  },
  {
    id: 'obs-003',
    type: 'Safe Behavior',
    category: 'Manual Handling',
    description: 'Team used proper lifting techniques when moving heavy pipes.',
    location: 'Loading Bay',
    date: '2023-10-29T09:00:00',
    isAnonymous: false,
    observer: 'Manager X',
    status: 'Closed',
    images: []
  }
];

// --- Training Seed Data ---

const initialContractors: Contractor[] = [
    {
        id: 'cont-001',
        name: 'Apex Construction Ltd',
        contactPerson: 'Sarah Connor',
        email: 'sarah@apex.com',
        phone: '+1 555-0199',
        status: 'Approved',
        complianceScore: 92,
        performanceRating: 'A',
        documents: [
            { id: 'cd-1', title: 'Liability Insurance', type: 'Insurance', expiryDate: '2024-12-31', status: 'Valid' },
            { id: 'cd-2', title: 'HSE Policy Manual', type: 'HSE Policy', expiryDate: '2025-06-30', status: 'Valid' }
        ]
    },
    {
        id: 'cont-002',
        name: 'Volt Electrical Services',
        contactPerson: 'Max Rockatansky',
        email: 'max@volt.com',
        phone: '+1 555-0155',
        status: 'Pending',
        complianceScore: 65,
        performanceRating: 'C',
        documents: [
            { id: 'cd-3', title: 'Electrical License', type: 'License', expiryDate: '2023-11-15', status: 'Expired' }
        ]
    }
];

const initialWorkers: WorkerProfile[] = [
  { id: 'w-001', name: 'Robert Fox', role: 'Welder', department: 'Maintenance', joinedDate: '2022-01-15', companyId: 'cont-001', points: 120, level: 'Safety Champ', badges: ['Action Hero'] },
  { id: 'w-002', name: 'Kristin Watson', role: 'Electrician', department: 'Maintenance', joinedDate: '2021-06-20', companyId: 'cont-002', points: 85, level: 'Safety Pro', badges: [] },
  { id: 'w-003', name: 'Esther Howard', role: 'Scaffolder', department: 'Construction', joinedDate: '2023-03-10', points: 40, level: 'Novice', badges: ['First Report'] },
  { id: 'w-004', name: 'Cody Fisher', role: 'General Worker', department: 'Operations', joinedDate: '2022-11-05', companyId: 'cont-001', points: 200, level: 'Safety Legend', badges: ['Top Observer', 'Zero Harm'] },
];

const initialModules: TrainingModule[] = [
  { id: 'mod-1', title: 'Work at Height', description: 'Safety procedures for working above 2m', requiredForRoles: ['Scaffolder', 'General Worker', 'Electrician'], validityMonths: 12 },
  { id: 'mod-2', title: 'Confined Space Entry', description: 'Entry permits and atmospheric testing', requiredForRoles: ['Welder', 'Electrician'], validityMonths: 24 },
  { id: 'mod-3', title: 'Hot Work Safety', description: 'Welding, cutting and brazing safety', requiredForRoles: ['Welder'], validityMonths: 12 },
  { id: 'mod-4', title: 'LOTO (Lockout Tagout)', description: 'Electrical isolation procedures', requiredForRoles: ['Electrician', 'Welder'], validityMonths: 12 },
  { id: 'mod-5', title: 'First Aid Basic', description: 'Basic life support and CPR', requiredForRoles: ['All'], validityMonths: 36 },
];

const initialTrainingRecords: TrainingRecord[] = [
  { id: 'rec-1', workerId: 'w-001', moduleId: 'mod-3', moduleTitle: 'Hot Work Safety', completionDate: '2023-09-15', expiryDate: '2024-09-15', status: 'Valid' },
  { id: 'rec-2', workerId: 'w-001', moduleId: 'mod-2', moduleTitle: 'Confined Space Entry', completionDate: '2022-01-20', expiryDate: '2024-01-20', status: 'Expiring Soon' },
  { id: 'rec-3', workerId: 'w-002', moduleId: 'mod-4', moduleTitle: 'LOTO (Lockout Tagout)', completionDate: '2022-05-10', expiryDate: '2023-05-10', status: 'Expired' },
];

// --- PPE Seed Data ---

const initialPPEInventory: PPEItem[] = [
  { id: 'ppe-1', name: 'Safety Helmet (White)', category: 'Head Protection', stockQuantity: 45, minStockThreshold: 10, description: 'Standard ANSI certified hard hat' },
  { id: 'ppe-2', name: 'Safety Helmet (Blue)', category: 'Head Protection', stockQuantity: 8, minStockThreshold: 15, description: 'Electrician grade hard hat' },
  { id: 'ppe-3', name: 'Impact Gloves (L)', category: 'Hand Protection', stockQuantity: 120, minStockThreshold: 50, description: 'Cut level 5 impact gloves' },
  { id: 'ppe-4', name: 'Safety Boots (Size 10)', category: 'Foot Protection', stockQuantity: 3, minStockThreshold: 5, description: 'Steel toe cap boots' },
  { id: 'ppe-5', name: 'Full Body Harness', category: 'Fall Protection', stockQuantity: 12, minStockThreshold: 10, description: 'Double lanyard harness' },
];

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

const initialPPEIssuance: PPEIssuance[] = [
  { id: 'iss-1', workerId: 'w-001', workerName: 'Robert Fox', ppeItemId: 'ppe-1', ppeItemName: 'Safety Helmet (White)', issueDate: '2023-01-15', expiryDate: '2024-01-15', status: 'Active' },
  { id: 'iss-2', workerId: 'w-001', workerName: 'Robert Fox', ppeItemId: 'ppe-3', ppeItemName: 'Impact Gloves (L)', issueDate: '2023-09-01', expiryDate: '2023-12-01', status: 'Active' },
];

// --- Permit Seed Data ---

const initialPermits: Permit[] = [
  {
    id: 'ptw-001',
    type: PermitType.HOT_WORK,
    location: 'Zone B - Generator Room',
    description: 'Cutting and welding new pipe support brackets.',
    validFrom: new Date(new Date().setHours(8,0,0,0)).toISOString(),
    validUntil: new Date(new Date().setHours(17,0,0,0)).toISOString(),
    requestor: 'Mike Ross',
    approver: 'John Doe',
    status: PermitStatus.APPROVED,
    riskAssessmentId: 'risk-001',
    controls: [
      { id: 'c1', label: 'Fire Extinguisher on site', checked: true },
      { id: 'c2', label: 'Fire Watch assigned', checked: true },
      { id: 'c3', label: 'Combustibles removed (10m radius)', checked: true }
    ]
  },
  {
    id: 'ptw-002',
    type: PermitType.CONFINED_SPACE,
    location: 'Fuel Tank A',
    description: 'Sludge cleaning.',
    validFrom: new Date(new Date().setHours(10,0,0,0)).toISOString(),
    validUntil: new Date(new Date().setHours(14,0,0,0)).toISOString(),
    requestor: 'Mike Ross',
    status: PermitStatus.PENDING,
    controls: [
      { id: 'c4', label: 'Gas Test completed', checked: false },
      { id: 'c5', label: 'Standby Man present', checked: true },
      { id: 'c6', label: 'Rescue Plan available', checked: true }
    ]
  }
];

// --- Asset Seed Data ---
const initialAssets: Asset[] = [
    {
        id: 'ast-001',
        name: 'Mobile Crane 50T',
        category: 'Lifting Equipment',
        modelNumber: 'Liebherr LTM 1050',
        serialNumber: 'LTM-1050-9988',
        location: 'Main Yard',
        status: 'Operational',
        nextInspectionDate: '2023-11-20',
        documents: [],
        maintenanceHistory: []
    },
    {
        id: 'ast-002',
        name: 'Forklift 3T',
        category: 'Vehicle',
        modelNumber: 'Toyota 8F',
        serialNumber: 'TY-888',
        location: 'Warehouse B',
        status: 'Inspection Overdue',
        nextInspectionDate: '2023-10-15',
        documents: [],
        maintenanceHistory: []
    }
];

const initialDocuments: HSEDocument[] = [
    {
        id: 'doc-001',
        title: 'Work at Height SOP',
        category: 'SOP',
        version: 'v2.1',
        status: 'Approved',
        uploadDate: '2023-01-10',
        author: 'HSE Manager',
        description: 'Standard operating procedure for all work above 1.8m.'
    }
];

const initialEmergencyContacts: EmergencyContact[] = [
    { id: 'ec-2', name: 'John Medic', role: 'Site Nurse', phone: '+1 555 0123', type: 'Site Medic', location: 'Clinic Block A' },
    { id: 'ec-3', name: 'Sarah Fire', role: 'Fire Warden', phone: '+1 555 0987', type: 'Fire Warden', location: 'Warehouse' }
];

const initialDrills: EmergencyDrill[] = [
    { id: 'ed-1', type: 'Fire Evacuation', date: '2023-09-15', location: 'Main Office', participantsCount: 45, durationMinutes: 12, outcome: 'Success', notes: 'Evacuation completed within target time.' }
];

const initialSafetyZones: SafetyZone[] = [
    { id: 'z-1', name: 'Chemical Store', type: 'Danger', lat: 34.0522, lng: -118.2437, radius: 50, requiredPPE: ['Respirator', 'Chemical Gloves'] }
];

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
    const user = getCurrentUser();
    const limit = user?.tier === SubscriptionTier.FREE ? QUOTA_FREE : QUOTA_PRO;
    const currentUsage = getStorageUsage();
    
    if (currentUsage + newDataSize > limit) {
        alert("Storage Quota Exceeded! Please upgrade your plan or delete old data (Images/Videos) to continue.");
        return false;
    }
    return true;
};

// Clear all non-system data
export const clearUserData = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    alert("Local data cleared.");
    window.location.reload();
};

const get = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : initial;
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
export const getIncidents = (): Incident[] => get(STORAGE_KEYS.INCIDENTS, initialIncidents);
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
export const getInspections = (): Inspection[] => get(STORAGE_KEYS.INSPECTIONS, []);
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
export const getActions = (): ActionItem[] => get(STORAGE_KEYS.ACTIONS, initialActions);
export const saveAction = (action: ActionItem) => {
  const actions = getActions();
  set(STORAGE_KEYS.ACTIONS, [action, ...actions]);
};
export const updateAction = (action: ActionItem) => {
  const actions = getActions();
  set(STORAGE_KEYS.ACTIONS, actions.map(a => a.id === action.id ? action : a));
};

// Risk Assessments
export const getRiskAssessments = (): RiskAssessment[] => get(STORAGE_KEYS.RISK_ASSESSMENTS, initialRiskAssessments);
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
    return get(STORAGE_KEYS.MAN_HOURS, 100000); // Default seed
};
export const saveManHours = (hours: number) => set(STORAGE_KEYS.MAN_HOURS, hours);

export const calculateHSEMetrics = (): HSEMetrics => {
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
        totalManHours: manHours,
        ltiCount,
        mtcCount, // Used as approx for RWC in MVP
        rwcCount: 0,
        facCount,
        nmCount,
        trir,
        ltifr,
        actionClosureRate: Math.round(closureRate),
        inspectionCompliance: Math.round(inspectionCompliance)
    };
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
            training: 85, // Mock
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
