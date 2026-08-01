
import { Incident, Inspection, InspectionTemplate, ActionItem, IncidentType, IncidentSeverity, RiskAssessment, Observation, WorkerProfile, TrainingModule, TrainingRecord, PPEItem, PPEIssuance, Permit, PermitType, PermitStatus, Asset, AssetStatus, AssetCategory, Contractor, HSEDocument, EmergencyContact, EmergencyDrill, HSEMetrics, SafetyZone, SiteSafetyScore, HSEStatsLog, Role, UserRoles, SubscriptionTier, LiftingPlanRecord, LiftCategory, LiftingEquipmentType, LiftingPlanStatus } from "../types";
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

// ── SEED DATA — Khalifa Tower Complex, Dubai Construction Project ─────────────

const initialWorkers: WorkerProfile[] = [
  { id: 'w-001', name: 'Ahmed Al-Rashid',  role: 'HSE Manager',       department: 'HSE',          companyId: 'c-001', joinedDate: '2024-03-01', email: 'ahmed@albarq.ae',   phone: '+971-50-100-1001', points: 420, level: 'Safety Champion', badges: ['Safety Champion', 'Observer', 'Trainer'] },
  { id: 'w-002', name: 'Sarah Mitchell',   role: 'HSE Officer',        department: 'HSE',          companyId: 'c-001', joinedDate: '2024-06-15', email: 'sarah@albarq.ae',   phone: '+971-50-100-1002', points: 285, level: 'Safety Pro',     badges: ['Observer', 'First Responder'] },
  { id: 'w-003', name: 'James Okonkwo',    role: 'Crane Operator',     department: 'Operations',   companyId: 'c-002', joinedDate: '2023-11-01', email: 'james@skyrig.ae',   phone: '+971-55-200-2001', points: 310, level: 'Safety Pro',     badges: ['Observer', 'Action Hero'] },
  { id: 'w-004', name: 'Fatima Hassan',    role: 'Rigger',             department: 'Operations',   companyId: 'c-002', joinedDate: '2024-01-10', email: 'fatima@skyrig.ae',  phone: '+971-55-200-2002', points: 195, level: 'Safety Learner', badges: ['Observer'] },
  { id: 'w-005', name: 'Mark Thompson',    role: 'Lift Supervisor',    department: 'Operations',   companyId: 'c-001', joinedDate: '2023-08-20', email: 'mark@albarq.ae',    phone: '+971-50-100-1005', points: 360, level: 'Safety Pro',     badges: ['Safety Champion', 'Trainer'] },
  { id: 'w-006', name: 'Carlos Mendez',    role: 'Site Engineer',      department: 'Engineering',  companyId: 'c-001', joinedDate: '2024-02-01', email: 'carlos@albarq.ae',  phone: '+971-50-100-1006', points: 145, level: 'Safety Novice', badges: ['Observer'] },
  { id: 'w-007', name: 'Ali Al-Farsi',     role: 'Banksman',           department: 'Operations',   companyId: 'c-002', joinedDate: '2024-04-15', email: 'ali@skyrig.ae',     phone: '+971-55-200-2007', points: 220, level: 'Safety Learner', badges: ['Observer', 'Action Hero'] },
  { id: 'w-008', name: 'Priya Sharma',     role: 'HSE Advisor',        department: 'HSE',          companyId: 'c-001', joinedDate: '2023-09-01', email: 'priya@albarq.ae',   phone: '+971-50-100-1008', points: 395, level: 'Safety Champion', badges: ['Safety Champion', 'Trainer', 'First Responder'] },
  { id: 'w-009', name: 'David Chen',       role: 'Electrical Engineer', department: 'Engineering', companyId: 'c-003', joinedDate: '2024-05-01', email: 'david@gulfpower.ae', phone: '+971-56-300-3001', points: 110, level: 'Safety Novice', badges: ['Observer'] },
  { id: 'w-010', name: 'Riya Patel',       role: 'HSE Coordinator',    department: 'HSE',          companyId: 'c-001', joinedDate: '2024-07-01', email: 'riya@albarq.ae',    phone: '+971-50-100-1010', points: 85,  level: 'Safety Novice', badges: [] },
];

const initialContractors: Contractor[] = [
  { id: 'c-001', name: 'AlBarq Construction LLC',    type: 'Main Contractor',       country: 'UAE', registrationNo: 'MC-2019-0041', email: 'info@albarq.ae',    phone: '+971-4-100-1000', contactPerson: 'Ahmed Al-Rashid', status: 'Active', safetyRating: 4.8, incidentCount: 2, workerCount: 145, expiryDate: '2027-03-31', documents: [] },
  { id: 'c-002', name: 'SkyRig Lifting Solutions',   type: 'Lifting Subcontractor', country: 'UAE', registrationNo: 'SC-2021-0088', email: 'ops@skyrig.ae',     phone: '+971-4-200-2000', contactPerson: 'Mark Thompson',    status: 'Active', safetyRating: 4.5, incidentCount: 1, workerCount: 32,  expiryDate: '2026-12-31', documents: [] },
  { id: 'c-003', name: 'Gulf Power Systems LLC',     type: 'Electrical Subcontractor', country: 'UAE', registrationNo: 'EC-2020-0155', email: 'info@gulfpower.ae', phone: '+971-4-300-3000', contactPerson: 'David Chen',       status: 'Active', safetyRating: 4.2, incidentCount: 0, workerCount: 18,  expiryDate: '2027-06-30', documents: [] },
];

const initialRiskAssessments: RiskAssessment[] = [
  {
    id: 'ra-001',
    title: 'Tower Crane Lifting Operations — Level 50+',
    taskDescription: 'Crane lifting of structural steel and heavy equipment above Level 50 using Liebherr LTM 1100. Includes tandem lifts for generator installation.',
    type: 'JHA',
    date: '2026-07-02',
    author: 'Ahmed Al-Rashid',
    status: 'Approved',
    hazards: [
      { id: 'hz-001', description: 'Load dropped during crane lift', probability: 2, severity: 5, riskScore: 10, controls: [{ id: 'c1', type: 'Administrative', description: 'Qualified rigger to inspect all lifting gear before use' }, { id: 'c2', type: 'Engineering', description: 'Secondary attachment point on all loads over 2t' }] },
      { id: 'hz-002', description: 'Crane tipping due to ground bearing failure', probability: 2, severity: 5, riskScore: 10, controls: [{ id: 'c3', type: 'Engineering', description: 'Crane mats used on all soft ground areas' }, { id: 'c4', type: 'Administrative', description: 'Ground survey completed before crane positioning' }] },
      { id: 'hz-003', description: 'Exclusion zone breach during lifting', probability: 3, severity: 4, riskScore: 12, controls: [{ id: 'c5', type: 'Administrative', description: 'Banksman stationed at exclusion zone boundary' }, { id: 'c6', type: 'PPE', description: 'High-vis vest and radio for all lift team members' }] },
    ]
  },
  {
    id: 'ra-002',
    title: 'Hot Work Operations — Level 45 Structural Steel',
    taskDescription: 'Welding and cutting of structural steel connections at Level 45. Work involves open flame and spark generation adjacent to formwork.',
    type: 'HIRA',
    date: '2026-07-12',
    author: 'Sarah Mitchell',
    status: 'Approved',
    hazards: [
      { id: 'hz-004', description: 'Fire caused by welding sparks igniting formwork', probability: 3, severity: 4, riskScore: 12, controls: [{ id: 'c7', type: 'Administrative', description: 'Hot Work Permit required before any welding' }, { id: 'c8', type: 'Administrative', description: 'Fire watch for 30 minutes after work completion' }] },
      { id: 'hz-005', description: 'Burns from molten spatter', probability: 3, severity: 3, riskScore: 9, controls: [{ id: 'c9', type: 'PPE', description: 'Welding helmet, leather gloves, and fire-resistant coverall mandatory' }] },
    ]
  },
  {
    id: 'ra-003',
    title: 'Confined Space Entry — Basement Water Tank B2',
    taskDescription: 'Inspection and cleaning of underground water storage tank. Space has limited access, potential for oxygen deficiency and H2S accumulation.',
    type: 'TRA',
    date: '2026-07-27',
    author: 'Ahmed Al-Rashid',
    status: 'Draft',
    hazards: [
      { id: 'hz-006', description: 'Oxygen deficiency causing unconsciousness', probability: 3, severity: 5, riskScore: 15, controls: [{ id: 'c10', type: 'Engineering', description: 'Continuous atmospheric monitoring with 4-gas detector' }, { id: 'c11', type: 'Administrative', description: 'Standby man stationed at entry point at all times' }] },
      { id: 'hz-007', description: 'H2S gas exposure from tank sediment', probability: 2, severity: 5, riskScore: 10, controls: [{ id: 'c12', type: 'PPE', description: 'SCBA required for initial entry' }, { id: 'c13', type: 'Engineering', description: 'Forced ventilation for minimum 15 minutes before entry' }] },
    ]
  },
];

const initialIncidents: Incident[] = [
  { id: 'inc-001', description: 'Unsecured load nearly fell from Level 12 during hoisting due to damaged sling identified mid-lift. Lift stopped immediately. No injuries.', date: '2026-07-07T09:15:00.000Z', location: 'Level 12 — East Hoist Zone', type: IncidentType.NEAR_MISS, severity: IncidentSeverity.HIGH, status: 'Investigation', images: [], reporter: 'James Okonkwo', aiClassification: { confidence: 0.92, reasoning: 'Damaged rigging equipment during active lift — high potential consequence.', causes: ['Equipment not inspected before use', 'Time pressure to complete lift'], contributingFactors: ['Recent shift change', 'High workload period'] } },
  { id: 'inc-002', description: 'Worker sustained a 3cm laceration to right hand while cutting rebar without cut-resistant gloves. First aid administered on site.', date: '2026-07-14T11:30:00.000Z', location: 'Ground Floor — Rebar Yard', type: IncidentType.INJURY, severity: IncidentSeverity.LOW, status: 'Closed', images: [], reporter: 'Priya Sharma', aiClassification: { confidence: 0.88, reasoning: 'Minor recordable injury from inadequate PPE compliance.', causes: ['PPE not worn'], contributingFactors: ['Worker unaware of requirement'] } },
  { id: 'inc-003', description: 'During inspection, scaffolding coupler found cracked on Level 15 handrail section. Scaffold tagged and taken out of service pending repair.', date: '2026-07-17T08:00:00.000Z', location: 'Level 15 — North Face Scaffolding', type: IncidentType.UNSAFE_CONDITION, severity: IncidentSeverity.MEDIUM, status: 'Closed', images: [], reporter: 'Sarah Mitchell', aiClassification: { confidence: 0.85, reasoning: 'Structural defect identified before use — prevented potential fall.', causes: ['Inadequate pre-use inspection regime'], contributingFactors: ['High volume of scaffold components on site'] } },
  { id: 'inc-004', description: 'Delivery truck reversed toward a group of 3 workers at site entrance. Workers alerted by banksman and moved clear. No contact made.', date: '2026-07-22T07:45:00.000Z', location: 'Main Site Entrance — Gate 2', type: IncidentType.NEAR_MISS, severity: IncidentSeverity.HIGH, status: 'Investigation', images: [], reporter: 'Ali Al-Farsi', aiClassification: { confidence: 0.90, reasoning: 'Vehicle-pedestrian conflict at high-traffic entry point.', causes: ['Inadequate traffic segregation', 'Reverse camera obstructed'], contributingFactors: ['Early morning low visibility', 'Multiple deliveries simultaneously'] } },
  { id: 'inc-005', description: 'Tower crane operating radius approached within 2m of live overhead power line during repositioning. Operator alerted by spotter and stopped movement immediately.', date: '2026-07-27T14:20:00.000Z', location: 'Grid F7 — North Zone', type: IncidentType.NEAR_MISS, severity: IncidentSeverity.CRITICAL, status: 'Investigation', images: [], reporter: 'James Okonkwo', aiClassification: { confidence: 0.97, reasoning: 'Critical near-miss with live infrastructure — fatality potential.', causes: ['Crane operating plan not clearly marked', 'Banksman communications breakdown'], contributingFactors: ['Power line marked only on drawings', 'Radio channel congestion during shift'] } },
  { id: 'inc-006', description: 'Worker slipped on wet concrete floor in Level 3 corridor after rain leaked through temporary roof sheeting. No injury sustained.', date: '2026-07-30T16:00:00.000Z', location: 'Level 3 — Corridor C', type: IncidentType.NEAR_MISS, severity: IncidentSeverity.LOW, status: 'Open', images: [], reporter: 'Riya Patel', aiClassification: { confidence: 0.78, reasoning: 'Slip hazard from inadequate temporary weatherproofing.', causes: ['Temporary roof sheeting not properly sealed'], contributingFactors: ['Recent heavy rainfall'] } },
];

const initialObservations: Observation[] = [
  { id: 'obs-001', type: 'Unsafe Act',       category: 'Fall Protection', description: 'Worker on Level 34 formwork not wearing safety harness in fall zone area. Immediately corrected.', location: 'Level 34 — South Wing', date: '2026-07-15T10:00:00.000Z', observer: 'Sarah Mitchell', isAnonymous: false, images: [], status: 'Closed', immediateActionTaken: 'Worker stopped, harness issued and worn. Toolbox talk conducted.' },
  { id: 'obs-002', type: 'Safe Behavior',    category: 'PPE',            description: 'Welding team on Level 45 correctly conducting pre-task inspection of all hot work PPE before commencing.', location: 'Level 45 — Structural Bay', date: '2026-07-16T08:30:00.000Z', observer: 'Ahmed Al-Rashid', isAnonymous: false, images: [], status: 'Closed', immediateActionTaken: 'Team praised for safety leadership. Recorded for recognition programme.' },
  { id: 'obs-003', type: 'Unsafe Condition', category: 'Housekeeping',   description: 'Unmarked open trench (1.2m deep) found near ground floor pump room entrance with no barricading.', location: 'Ground Floor — Pump Room Area', date: '2026-07-18T09:15:00.000Z', observer: 'Priya Sharma', isAnonymous: false, images: [], status: 'Closed', immediateActionTaken: 'Trench barricaded and warning tape installed. Reported to civil supervisor.' },
  { id: 'obs-004', type: 'Near Miss',        category: 'Tools',          description: 'Scaffold board found loose and unsecured on Level 20 edge platform. Could have become dislodged and fallen.', location: 'Level 20 — East Platform', date: '2026-07-19T11:00:00.000Z', observer: 'Mark Thompson', isAnonymous: false, images: [], status: 'Closed', immediateActionTaken: 'Board re-secured and tagged. Full Level 20 scaffold inspection ordered.' },
  { id: 'obs-005', type: 'Unsafe Act',       category: 'Distracted Driving', description: 'Forklift operator observed using mobile phone while operating inside warehouse area at site.', location: 'Site Warehouse — Internal Road', date: '2026-07-21T13:30:00.000Z', observer: 'Ali Al-Farsi', isAnonymous: false, images: [], status: 'Closed', immediateActionTaken: 'Operator stopped and verbally warned. Phone confiscated for remainder of shift.' },
  { id: 'obs-006', type: 'Safe Behavior',    category: 'Leadership',     description: 'Lift supervisor conducting thorough pre-lift toolbox talk with all crew members, reviewing lift plan and emergency procedures.', location: 'Ground Floor — Crane Staging Area', date: '2026-07-23T07:00:00.000Z', observer: 'Carlos Mendez', isAnonymous: false, images: [], status: 'Closed', immediateActionTaken: 'Behaviour commended and shared as best practice.' },
  { id: 'obs-007', type: 'Unsafe Condition', category: 'Chemical Safety', description: 'Chemical drum storage area found with no labeling and mixed incompatible materials (acids and alkalis) on same shelf.', location: 'Level B1 — Chemical Store', date: '2026-07-25T14:00:00.000Z', observer: 'Priya Sharma', isAnonymous: false, images: [], status: 'Open', immediateActionTaken: 'Area cordoned. Chemical HSE Officer notified for immediate re-organisation.' },
  { id: 'obs-008', type: 'Near Miss',        category: 'Lifting',        description: 'Crane load began to swing unexpectedly during a tag-line handover between riggers. Load control re-established within 4 seconds.', location: 'Level 38 — West Bay', date: '2026-07-28T10:45:00.000Z', observer: 'Fatima Hassan', isAnonymous: false, images: [], status: 'Open', immediateActionTaken: 'Lift suspended. Crew re-briefed on tag-line handover procedure.' },
];

const initialActions: ActionItem[] = [
  { id: 'capa-001', type: 'Corrective', source: 'Incident', title: 'Implement mandatory pre-use rigging gear inspection before all lifts', description: 'All slings, shackles and lifting accessories must be visually inspected and signed off by the rigger before each lift. Introduce inspection register.', rootCause: 'Why 1: Sling was not inspected. Why 2: No formal pre-use check process. Why 3: Inspection register not in place for lifting accessories.', assignee: 'Mark Thompson', dueDate: '2026-08-15', priority: 'High', status: 'In Progress', relatedIncidentId: 'inc-001', createdAt: '2026-07-08T10:00:00.000Z' },
  { id: 'capa-002', type: 'Corrective', source: 'Incident', title: 'Retrain all crane crew on exclusion zone management and power line proximity', description: 'Mandatory retraining for all crane operators, riggers and lift supervisors on crane radius management near live overhead infrastructure.', rootCause: 'Why 1: Operator unaware of exact power line position. Why 2: Power line not physically marked on ground. Why 3: Only shown on drawings not visible at workface.', assignee: 'Ahmed Al-Rashid', dueDate: '2026-08-10', priority: 'High', status: 'Open', relatedIncidentId: 'inc-005', createdAt: '2026-07-27T16:00:00.000Z' },
  { id: 'capa-003', type: 'Corrective', source: 'Observation', title: 'Replace all defective scaffolding couplers on Level 15–20', description: 'Full inspection of scaffolding on levels 15 to 20. Replace all cracked or deformed couplers. Document findings in scaffold register.', rootCause: 'Why 1: Coupler was cracked. Why 2: Pre-use inspection missed the defect. Why 3: Inspector not trained on coupler failure signs.', assignee: 'Carlos Mendez', dueDate: '2026-07-31', priority: 'High', status: 'Done', relatedObservationId: 'obs-004', createdAt: '2026-07-19T12:00:00.000Z', closedAt: '2026-07-30T15:00:00.000Z' },
  { id: 'capa-004', type: 'Corrective', source: 'Incident', title: 'Install physical vehicle-pedestrian segregation barriers at Gate 2', description: 'Install concrete jersey barriers with reflective chevrons to create 2m-wide dedicated pedestrian walkway at main site entrance.', rootCause: 'Why 1: No physical barrier between vehicles and pedestrians. Why 2: Traffic management plan not adequately implemented at Gate 2.', assignee: 'Carlos Mendez', dueDate: '2026-08-05', priority: 'High', status: 'Verified', relatedIncidentId: 'inc-004', createdAt: '2026-07-22T09:00:00.000Z', closedAt: '2026-08-02T10:00:00.000Z', verifiedBy: 'Ahmed Al-Rashid', verifiedAt: '2026-08-03T09:00:00.000Z', effectivenessRating: 'Effective', effectivenessNotes: 'Physical barriers installed and confirmed effective. Pedestrian and vehicle paths clearly segregated.' },
  { id: 'capa-005', type: 'Preventive', source: 'Risk Assessment', title: 'Establish monthly lifting equipment inspection schedule', description: 'Schedule regular third-party LOLER inspections for all lifting equipment. Create equipment register with inspection dates and test certificates.', assignee: 'Priya Sharma', dueDate: '2026-08-20', priority: 'Medium', status: 'Open', relatedRiskAssessmentId: 'ra-001', createdAt: '2026-07-10T08:00:00.000Z' },
  { id: 'capa-006', type: 'Corrective', source: 'Observation', title: 'Chemical storage area audit and reorganisation', description: 'Complete audit of all chemical storage locations. Segregate incompatible materials. Label all containers. Install chemical register and SDS binder.', rootCause: 'No formal chemical management procedure in place for subcontractors.', assignee: 'Sarah Mitchell', dueDate: '2026-08-08', priority: 'Medium', status: 'Open', relatedObservationId: 'obs-007', createdAt: '2026-07-25T15:00:00.000Z' },
];

const initialInspections: Inspection[] = [
  { id: 'insp-001', templateId: 'tmpl-1', templateName: 'General Construction Site', title: 'General Construction Site — Gate 1 Area', date: '2026-07-10', location: 'Ground Floor, Gate 1 Entry Zone', inspector: 'Sarah Mitchell', score: 85, completed: true, items: [ { question: 'Are all workers wearing required PPE (Hard Hat, Boots, Vest)?', response: 'Pass', comment: '' }, { question: 'Is perimeter fencing intact and secure?', response: 'Pass', comment: '' }, { question: 'Are walkways clear of trip hazards and debris?', response: 'Pass', comment: '' }, { question: 'Is scaffolding properly tagged (Green Tag) and secured?', response: 'Pass', comment: '' }, { question: 'Are electrical cables elevated or protected?', response: 'Fail', comment: 'Cable run on ground near pump room not elevated.' }, { question: 'Is fire fighting equipment accessible and charged?', response: 'Pass', comment: '' }, { question: 'Are hazardous materials stored correctly with SDS available?', response: 'Pass', comment: '' }, { question: 'Is signage for mandatory PPE visible?', response: 'Pass', comment: '' }, { question: 'Are excavations properly barricaded and shored?', response: 'Fail', comment: 'Open trench near pump room not barricaded.' }, { question: 'Is welfare facility (water, toilet) accessible and clean?', response: 'Pass', comment: '' } ] },
  { id: 'insp-002', templateId: 'tmpl-2', templateName: 'Heavy Vehicle Inspection', title: 'Liebherr LTM 1100 Pre-Lift Check', date: '2026-07-18', location: 'Crane Staging Area — Grid F7', inspector: 'Mark Thompson', score: 72, completed: true, items: [ { question: 'Are tires in good condition (tread depth/pressure)?', response: 'Pass', comment: '' }, { question: 'Do all lights, indicators, and beacons work?', response: 'Pass', comment: '' }, { question: 'Are mirrors and windshield clean and undamaged?', response: 'Pass', comment: '' }, { question: 'Are brakes (service and parking) functioning correctly?', response: 'Pass', comment: '' }, { question: 'Is the reverse alarm audible?', response: 'Fail', comment: 'Reverse alarm volume low — needs recalibration.' }, { question: 'Are hydraulic hoses free from leaks and damage?', response: 'Pass', comment: '' }, { question: 'Is the fire extinguisher present and charged?', response: 'Fail', comment: 'Fire extinguisher tag expired — replaced on site.' }, { question: 'Is the operator cabin clean and free of loose objects?', response: 'Pass', comment: '' }, { question: 'Are seatbelts functioning and being used?', response: 'Pass', comment: '' }, { question: 'Is the load capacity chart available and legible?', response: 'Fail', comment: 'Load chart copy is damaged and partially unreadable.' } ] },
  { id: 'insp-003', templateId: 'tmpl-4', templateName: 'Hot Work Permit Audit', title: 'Hot Work Audit — Level 45 Steel Connections', date: '2026-07-23', location: 'Level 45 — Structural Bay B', inspector: 'Ahmed Al-Rashid', score: 91, completed: true, items: [ { question: 'Is the Hot Work Permit valid and displayed at site?', response: 'Pass', comment: '' }, { question: 'Is a trained fire watch present with a vest?', response: 'Pass', comment: '' }, { question: 'Are combustibles removed from the area (10m radius)?', response: 'Pass', comment: '' }, { question: 'Is proper fire extinguishing equipment on hand?', response: 'Pass', comment: '' }, { question: 'Is welding equipment (hoses, regulators) in good condition?', response: 'Pass', comment: '' }, { question: 'Is adequate ventilation provided for fumes?', response: 'Pass', comment: '' }, { question: 'Are screens used to protect nearby workers from arc flash?', response: 'Fail', comment: 'Flash screens not erected on east side of welding zone.' }, { question: 'Is PPE (face shield, gloves, apron) appropriate?', response: 'Pass', comment: '' }, { question: 'Is a gas test detector active (if required)?', response: 'Pass', comment: '' }, { question: 'Do workers understand the emergency procedure?', response: 'Pass', comment: '' } ] },
];

const initialPPEInventory: PPEItem[] = [
  { id: 'ppe-001', name: 'Safety Helmet (White — Supervisor)', category: 'Head Protection',       quantity: 25,  unit: 'pcs', minimumStock: 10, location: 'Site Store Room A', lastRestocked: '2026-07-01', supplier: 'AlBarq Safety Supplies', notes: 'ANSI Z89.1 Class E' },
  { id: 'ppe-002', name: 'Safety Helmet (Yellow — Worker)',     category: 'Head Protection',       quantity: 120, unit: 'pcs', minimumStock: 50, location: 'Site Store Room A', lastRestocked: '2026-07-01', supplier: 'AlBarq Safety Supplies', notes: 'EN 397 certified' },
  { id: 'ppe-003', name: 'Full Body Safety Harness',            category: 'Fall Protection',       quantity: 40,  unit: 'pcs', minimumStock: 20, location: 'Site Store Room B', lastRestocked: '2026-06-15', supplier: 'MSA Safety Gulf', notes: 'EN 361 — 6-monthly inspection required' },
  { id: 'ppe-004', name: 'Safety Boots (Steel Toe S3)',          category: 'Foot Protection',       quantity: 80,  unit: 'pairs', minimumStock: 30, location: 'Site Store Room A', lastRestocked: '2026-07-10', supplier: 'Delta Plus UAE', notes: 'EN ISO 20345 S3 SRC' },
  { id: 'ppe-005', name: 'Cut-Resistant Gloves Level C',        category: 'Hand Protection',       quantity: 200, unit: 'pairs', minimumStock: 80, location: 'Site Store Room A', lastRestocked: '2026-07-15', supplier: 'AlBarq Safety Supplies', notes: 'EN 388:2016' },
  { id: 'ppe-006', name: 'High-Visibility Safety Vest Class 3', category: 'Body Protection',       quantity: 150, unit: 'pcs', minimumStock: 60, location: 'Site Store Room A', lastRestocked: '2026-07-01', supplier: 'AlBarq Safety Supplies', notes: 'EN ISO 20471 Class 3' },
  { id: 'ppe-007', name: 'Welding Face Shield (Auto-Dark)',      category: 'Eye Protection',        quantity: 12,  unit: 'pcs', minimumStock: 6,  location: 'Hot Work Equipment Store', lastRestocked: '2026-06-01', supplier: 'Lincoln Electric UAE', notes: 'EN 175 Shade 9-13' },
  { id: 'ppe-008', name: 'Half-Face Respirator P100',           category: 'Respiratory Protection', quantity: 30, unit: 'pcs', minimumStock: 15, location: 'Site Store Room B', lastRestocked: '2026-07-01', supplier: '3M Gulf', notes: 'NIOSH approved — filters replaced monthly' },
];

const initialPermits: Permit[] = [
  {
    id: 'ptw-2026-0041',
    type: PermitType.HOT_WORK,
    location: 'Level 45 — Structural Bay B',
    description: 'Welding of steel connections at Level 45 structural frame. Approved Lifting Plan attached for material positioning.',
    validFrom: '2026-07-23T07:00:00.000Z',
    validUntil: '2026-07-23T17:00:00.000Z',
    requestor: 'Carlos Mendez',
    approver: 'Ahmed Al-Rashid',
    status: PermitStatus.APPROVED,
    riskAssessmentId: 'ra-002',
    controls: [
      { id: 'ctrl-1', label: 'Fire Extinguisher on site', checked: true },
      { id: 'ctrl-2', label: 'Fire Watch assigned', checked: true },
      { id: 'ctrl-3', label: 'Combustibles removed (10m radius)', checked: true },
      { id: 'ctrl-4', label: 'Welding equipment inspected', checked: true },
    ],
  },
  {
    id: 'ptw-2026-0043',
    type: PermitType.LIFTING,
    location: 'Roof Level — Plant Room West',
    description: 'Installation of 850kW diesel generator to roof level plant room. Critical lift using Liebherr LTM 1100 mobile crane. Approved lifting plan LP-2026-0001 attached.',
    validFrom: '2026-07-29T06:00:00.000Z',
    validUntil: '2026-07-29T18:00:00.000Z',
    requestor: 'Mark Thompson',
    approver: 'Ahmed Al-Rashid',
    status: PermitStatus.APPROVED,
    riskAssessmentId: 'ra-001',
    liftingPlanId: 'lift-2026-0001',
    controls: [
      { id: 'ctrl-5', label: 'Load calculated', checked: true },
      { id: 'ctrl-6', label: 'Rigging gear inspected', checked: true },
      { id: 'ctrl-7', label: 'Crane operator certified', checked: true },
      { id: 'ctrl-8', label: 'Wind speed checked', checked: true },
      { id: 'ctrl-9', label: 'HSE-approved lifting plan attached', checked: true },
    ],
  },
  {
    id: 'ptw-2026-0045',
    type: PermitType.CONFINED_SPACE,
    location: 'Basement B2 — Water Tank W1',
    description: 'Inspection and cleaning of underground potable water storage tank. Atmospheric monitoring required.',
    validFrom: '2026-08-04T07:00:00.000Z',
    validUntil: '2026-08-04T15:00:00.000Z',
    requestor: 'Carlos Mendez',
    status: PermitStatus.PENDING,
    riskAssessmentId: 'ra-003',
    controls: [
      { id: 'ctrl-10', label: 'Gas Test completed', checked: false },
      { id: 'ctrl-11', label: 'Standby Man present', checked: false },
      { id: 'ctrl-12', label: 'Rescue Plan available', checked: true },
      { id: 'ctrl-13', label: 'Ventilation established', checked: false },
      { id: 'ctrl-14', label: 'Communication system tested', checked: true },
    ],
  },
];

const initialLiftingPlans: LiftingPlanRecord[] = [
  {
    id: 'lift-2026-0001',
    planNumber: 'LP-2026-0001',
    title: 'Lift 850kW Diesel Generator to Roof Plant Room',
    project: 'Khalifa Tower Complex — Phase 2',
    location: 'Ground Floor Staging → Roof Level, West Plant Room',
    description: 'Critical lift of 850kW diesel generator (12.5t) from ground staging area to roof plant room using Liebherr LTM 1100. Includes pass over Level 40 occupied area.',
    date: '2026-07-25T08:00:00.000Z',
    author: 'Mark Thompson',
    plan: {
      equipmentType: LiftingEquipmentType.MOBILE_CRANE,
      liftCategory: LiftCategory.CRITICAL,
      loadDescription: '850kW Perkins diesel generator — skid-mounted with acoustic canopy',
      loadWeight: 12.5,
      riggingWeight: 0.8,
      loadDimensions: '4.2m L × 1.8m W × 2.1m H',
      centerOfGravityKnown: true,
      fragileLoad: false,
      hazardousLoad: true,
      dynamicFactor: 1.1,
      parameters: {
        boomLength: 52,
        boomAngle: 72,
        workingRadius: 18,
        hookHeight: 185,
        outriggerSpread: 7.2,
        ratedCapacity: 18,
      },
      calculation: {
        totalLiftedLoad: 13.3,
        requiredCapacity: 14.63,
        ratedCapacity: 18,
        utilizationPercent: 81.3,
        pass: true,
        notes: ['All checks passed. Lifting Plan may be submitted for HSE Approval.'],
        checks: [
          { label: 'Rated Capacity / WLL Valid', pass: true },
          { label: 'Utilization 81.3% (max 85%)', pass: true, message: 'Utilization is near the 85% limit — review carefully.' },
          { label: 'Weather Confirmed Suitable', pass: true },
          { label: 'Risk Assessment Linked', pass: true },
          { label: 'Lift Supervisor Assigned', pass: true },
          { label: 'Crane Operator Assigned', pass: true },
        ],
        calculatedAt: '2026-07-25T10:30:00.000Z',
      },
      status: LiftingPlanStatus.APPROVED,
      sentForApprovalAt: '2026-07-25T11:00:00.000Z',
      approvedAt: '2026-07-26T09:00:00.000Z',
      hseApprover: 'Ahmed Al-Rashid',
      attachedToPermit: true,
      riskAssessmentId: 'ra-001',
      permitId: 'ptw-2026-0043',
      linkedPermitNumber: 'PTW-2026-0043',
      groundCondition: 'Concrete',
      outriggersRequired: true,
      exclusionZoneEstablished: true,
      weatherSuitable: true,
      weatherChecked: true,
      weatherSummary: '31°C · Wind 6 km/h · Precip 0 mm · Cloud 20%',
      liftingSupervisor: 'Mark Thompson',
      craneOperator: 'James Okonkwo',
      rigger: 'Fatima Hassan',
      banksman: 'Ali Al-Farsi',
      methodStatementAttached: true,
      documents: [
        { id: 'doc-l1', name: 'Liebherr-LTM1100-Load-Chart.pdf', category: 'Crane Load Chart', uploadedAt: '2026-07-25T09:00:00.000Z' },
        { id: 'doc-l2', name: 'Generator-Lift-Method-Statement.pdf', category: 'Method Statement', uploadedAt: '2026-07-25T09:15:00.000Z' },
      ],
    },
  },
  {
    id: 'lift-2026-0002',
    planNumber: 'LP-2026-0002',
    title: 'Install HVAC Unit — Level 48 Mechanical Room',
    project: 'Khalifa Tower Complex — Phase 2',
    location: 'Ground Floor → Level 48 Mechanical Room',
    description: 'Installation of rooftop HVAC chiller unit using tower crane. Standard planned lift.',
    date: '2026-07-31T08:00:00.000Z',
    author: 'Carlos Mendez',
    plan: {
      equipmentType: LiftingEquipmentType.TOWER_CRANE,
      liftCategory: LiftCategory.ROUTINE,
      loadDescription: 'Carrier 30XA chiller unit',
      loadWeight: 6.2,
      riggingWeight: 0.4,
      loadDimensions: '2.8m L × 1.4m W × 1.6m H',
      centerOfGravityKnown: true,
      fragileLoad: false,
      hazardousLoad: false,
      dynamicFactor: 1.1,
      parameters: {
        jibLength: null,
        trolleyPosition: null,
        workingRadius: null,
        hookHeight: null,
        towerHeight: null,
        ratedCapacity: null,
      },
      status: LiftingPlanStatus.DRAFT,
      attachedToPermit: false,
      riskAssessmentId: 'ra-001',
      groundCondition: 'Concrete',
      outriggersRequired: false,
      exclusionZoneEstablished: false,
      weatherSuitable: true,
      weatherChecked: false,
      liftingSupervisor: 'Mark Thompson',
      craneOperator: 'James Okonkwo',
      rigger: 'Fatima Hassan',
      banksman: 'Ali Al-Farsi',
      methodStatementAttached: false,
      documents: [],
    },
  },
];

const initialAssets: Asset[] = [
  { id: 'ast-001', name: 'Liebherr LTM 1100-5.2 Mobile Crane', category: 'Lifting Equipment', status: 'Operational', serialNumber: 'LTM-2019-08841', manufacturer: 'Liebherr', model: 'LTM 1100-5.2', purchaseDate: '2019-06-01', lastMaintenanceDate: '2026-06-15', nextMaintenanceDate: '2026-09-15', location: 'Crane Staging Area — Grid F7', assignedTo: 'James Okonkwo', notes: 'LOLER inspection due Sep 2026. Load chart current.', documents: [] },
  { id: 'ast-002', name: 'Toyota 7FGU25 Counterbalance Forklift', category: 'Vehicle', status: 'Under Maintenance', serialNumber: 'TY-FG-2021-005512', manufacturer: 'Toyota', model: '7FGU25', purchaseDate: '2021-03-15', lastMaintenanceDate: '2026-07-25', nextMaintenanceDate: '2026-08-08', location: 'Site Warehouse', assignedTo: 'Site Warehouse Team', notes: 'Currently under scheduled service. Reverse alarm recalibration.', documents: [] },
  { id: 'ast-003', name: 'Caterpillar 320 Excavator', category: 'Machine', status: 'Operational', serialNumber: 'CAT-320-2020-00331', manufacturer: 'Caterpillar', model: '320 Next Gen', purchaseDate: '2020-11-01', lastMaintenanceDate: '2026-07-01', nextMaintenanceDate: '2026-10-01', location: 'Ground Floor — Excavation Zone B', assignedTo: 'Carlos Mendez', notes: '', documents: [] },
  { id: 'ast-004', name: '250kVA Cummins Generator (Temporary Power)', category: 'Machine', status: 'Operational', serialNumber: 'CUM-C250D5-2022-007', manufacturer: 'Cummins', model: 'C250D5', purchaseDate: '2022-01-15', lastMaintenanceDate: '2026-07-10', nextMaintenanceDate: '2026-08-10', location: 'Site Compound — Power Block', assignedTo: 'David Chen', notes: 'Monthly service intervals. Fuel level checked daily.', documents: [] },
  { id: 'ast-005', name: 'Alimak SC 2000 Construction Hoist', category: 'Lifting Equipment', status: 'Operational', serialNumber: 'ALM-SC2000-2023-142', manufacturer: 'Alimak', model: 'SC 2000', purchaseDate: '2023-04-01', lastMaintenanceDate: '2026-07-20', nextMaintenanceDate: '2026-08-20', location: 'North Face — Hoist Shaft', assignedTo: 'Operations Team', notes: 'LOLER inspection completed July 2026. Certificate valid to Jan 2027.', documents: [] },
];

const initialDocuments: HSEDocument[] = [
  { id: 'hse-doc-001', title: 'Project HSE Management Plan 2026', type: 'HSE Plan', description: 'Comprehensive HSE Management Plan for Khalifa Tower Complex Phase 2. Covers all HSE activities, responsibilities and procedures.', category: 'Plans & Procedures', uploadedBy: 'Ahmed Al-Rashid', uploadDate: '2026-03-01', expiryDate: '2026-12-31', version: '2.1', status: 'Active', fileSize: 2048, fileName: 'HSE-Management-Plan-2026-v2.1.pdf' },
  { id: 'hse-doc-002', title: 'Emergency Response & Evacuation Plan', type: 'Emergency Plan', description: 'Site emergency response procedures, assembly points, and evacuation routes for all levels.', category: 'Emergency', uploadedBy: 'Sarah Mitchell', uploadDate: '2026-03-15', expiryDate: '2027-03-14', version: '1.3', status: 'Active', fileSize: 1536, fileName: 'Emergency-Response-Plan-v1.3.pdf' },
  { id: 'hse-doc-003', title: 'Lifting Operations Method Statement', type: 'Method Statement', description: 'Detailed method statement for all lifting operations including critical lifts above Level 40.', category: 'Method Statements', uploadedBy: 'Mark Thompson', uploadDate: '2026-07-01', expiryDate: '2026-12-31', version: '1.0', status: 'Active', fileSize: 876, fileName: 'Lifting-Operations-MS-v1.0.pdf' },
];

const initialEmergencyContacts: EmergencyContact[] = [
  { id: 'ec-001', name: 'Rashid Hospital Emergency',  role: 'Hospital',           phone: '999',            alternatePhone: '+971-4-219-2000', email: 'emergency@rashidhosp.ae', available24h: true, notes: 'Nearest trauma centre — 8 min from site' },
  { id: 'ec-002', name: 'Dubai Civil Defence',         role: 'Fire & Rescue',      phone: '997',            alternatePhone: '+971-4-224-0000', email: '',                         available24h: true, notes: 'Station 9 — Bur Dubai, 6 min from site' },
  { id: 'ec-003', name: 'Dubai Police',                role: 'Police',             phone: '999',            alternatePhone: '+971-4-602-2222', email: '',                         available24h: true, notes: 'Al Twar Station — 10 min from site' },
  { id: 'ec-004', name: 'AlBarq Site Emergency Line',  role: 'Site Emergency',     phone: '+971-50-100-9999', alternatePhone: '',              email: 'emergency@albarq.ae',      available24h: true, notes: 'Project Director: Ahmed Al-Rashid' },
  { id: 'ec-005', name: 'DEWA Emergency',              role: 'Utilities',          phone: '991',            alternatePhone: '+971-4-601-9999', email: '',                         available24h: true, notes: 'Dubai Electricity & Water Authority — power emergencies' },
];

const initialDrills: EmergencyDrill[] = [
  { id: 'drill-001', type: 'Fire Evacuation', date: '2026-07-15T09:00:00.000Z', location: 'Full Site', participants: 78, duration: 12, outcome: 'Successful — full evacuation in 12 minutes. Assembly point 2 was overcrowded.', actionRequired: 'Improve wayfinding signage to Assembly Point 2. Conduct refresher drill for new workers.', conductedBy: 'Sarah Mitchell', nextDrillDate: '2026-09-15' },
  { id: 'drill-002', type: 'Medical Emergency', date: '2026-07-22T14:00:00.000Z', location: 'Level 18 — Central Bay', participants: 15, duration: 8, outcome: 'Successful — first responder reached casualty in under 3 minutes. AED location known.', actionRequired: 'Update first aid kit locations on Levels 20+ following recent expansion.', conductedBy: 'Priya Sharma', nextDrillDate: '2026-08-22' },
];

const initialSafetyZones: SafetyZone[] = [
  { id: 'sz-001', name: 'Crane Operating Zone — Grid F7', description: 'Exclusion zone for Liebherr LTM 1100 operations. No unauthorised entry during active crane operations.', type: 'Exclusion Zone', status: 'Active', coordinates: [], assignedTo: 'Mark Thompson', color: '#ef4444' },
  { id: 'sz-002', name: 'Hot Work Zone — Level 45 Bay B', description: 'Designated hot work area. Fire watch required. No combustibles within 10m radius.', type: 'Restricted Area', status: 'Active', coordinates: [], assignedTo: 'Carlos Mendez', color: '#f97316' },
  { id: 'sz-003', name: 'Chemical Storage — Level B1', description: 'Authorised personnel only. PPE required: chemical goggles, nitrile gloves.', type: 'Hazardous Area', status: 'Active', coordinates: [], assignedTo: 'Sarah Mitchell', color: '#eab308' },
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

// (seed data arrays defined above in SEED DATA section)
const initialModules: TrainingModule[] = [];
const initialTrainingRecords: TrainingRecord[] = [];
const initialPPECategories = ['Head Protection','Eye Protection','Hearing Protection','Respiratory Protection','Hand Protection','Foot Protection','Body Protection','Fall Protection'];
const initialPPEIssuance: PPEIssuance[] = [];

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
  const result = get(STORAGE_KEYS.INSPECTIONS, initialInspections);
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
export const generatePlanNumber = (): string => {
    const year = new Date().getFullYear();
    const plans = getLiftingPlans();
    const yearPlans = plans.filter(p => p.planNumber?.startsWith(`LP-${year}`));
    const seq = (yearPlans.length + 1).toString().padStart(4, '0');
    return `LP-${year}-${seq}`;
};
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
export const deleteLiftingPlan = (id: string) => {
    set(STORAGE_KEYS.LIFTING_PLANS, getLiftingPlans().filter(p => p.id !== id));
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
