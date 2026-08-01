
// Permissions Keys
export type Permission = 
  | 'manage_roles'        // Create/Edit Roles
  | 'manage_users'        // Manage users
  | 'manage_org'          // Manage organization settings, projects & operations
  | 'view_analytics'      // Access Dashboard/Analytics
  | 'create_incident'     // Report incidents
  | 'manage_incidents'    // Edit/Close incidents
  | 'perform_inspection'  // Run inspections
  | 'create_permit'       // Request permit
  | 'approve_permit'      // Approve permit
  | 'manage_documents'    // Upload/Approve docs
  | 'ai_features';        // Use AI tools

// ── Organization & Project / Operation context ────────────────────────────────

export type IndustryType =
  | 'Construction'
  | 'Oil & Gas'
  | 'Manufacturing'
  | 'Mining'
  | 'Utilities'
  | 'Healthcare'
  | 'General';

export const INDUSTRY_CONTEXT_LABEL: Record<IndustryType, string> = {
  'Construction':   'Project',
  'Oil & Gas':      'Operation',
  'Manufacturing':  'Plant / Facility',
  'Mining':         'Site',
  'Utilities':      'Plant',
  'Healthcare':     'Facility',
  'General':        'Location',
};

export type OrgContextStatus = 'Active' | 'Completed' | 'On Hold' | 'Closed';

export interface OrgContext {
  id: string;
  name: string;
  code: string;           // e.g. PROJ-001, OPS-A3
  description?: string;
  location?: string;
  status: OrgContextStatus;
  manager?: string;
  client?: string;        // client/owner name
  startDate?: string;
  endDate?: string;
  color?: string;         // hex colour for badge
  createdAt: string;
}

export interface OrganizationSettings {
  name: string;
  industry: IndustryType;
  country?: string;
  website?: string;
  contextLabel: string;   // "Project" | "Operation" | "Plant" etc — can be overridden
  enableContextFilter: boolean;
  logoDataUrl?: string;   // base64 logo
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean; // System roles cannot be deleted
  permissions: Permission[];
}

// Changed from Enum to string to allow custom roles, but keeping constants for reference
export const UserRoles = {
  ADMIN: 'Admin',
  MANAGER: 'HSE Manager',
  SUPERVISOR: 'HSE Supervisor',
  OFFICER: 'HSE Officer',
  ADVISOR: 'HSE Advisor',
  COORDINATOR: 'HSE Coordinator',
  TECHNICIAN: 'HSE Technician',
  WORKER: 'Worker',
  EXECUTIVE: 'Executive Management'
};

export type UserRole = string;

export enum SubscriptionTier {
  FREE = 'Basic',
  PRO = 'Pro',
  ENTERPRISE = 'Enterprise'
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  avatar?: string;
  companyId?: string;
  // Permissions are loaded at runtime based on role
}

export enum IncidentSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum IncidentType {
  NEAR_MISS = 'Near Miss',
  FIRST_AID = 'First Aid',
  MEDICAL_TREATMENT = 'Medical Treatment',
  LTI = 'Lost Time Injury',
  ENVIRONMENTAL = 'Environmental',
  PROPERTY_DAMAGE = 'Property Damage'
}

export interface FishboneCategories {
  man: string;
  machine: string;
  method: string;
  material: string;
  environment: string;
}

export interface Investigation {
  method: '5-Why' | 'Fishbone';
  whys?: string[]; // For 5-Why
  rootCause: string;
  categories?: FishboneCategories; // For Fishbone
  evidence?: string[]; // Base64 strings of uploaded images/docs
  completedBy: string;
  completedAt: string;
}

export interface Incident {
  id: string;
  description: string;
  date: string;
  location: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: 'Open' | 'Investigating' | 'Closed';
  images: string[];
  reporter: string;
  contextId?: string;   // org project / operation / plant
  aiClassification?: {
    confidence: number;
    reasoning: string;
    causes?: string[];
    contributingFactors?: string[];
  };
  investigation?: Investigation;
}

export interface InspectionItem {
  id: string;
  question: string;
  response: 'Pass' | 'Fail' | 'NA';
  comment?: string;
  photos?: string[]; // Base64 strings
}

export interface InspectionTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  items: string[];
}

export interface Inspection {
  id: string;
  templateId: string;
  templateName: string;
  title: string; // User defined or auto
  date: string;
  location: string;
  inspector: string;
  items: InspectionItem[];
  score: number; // 0-100
  completed: boolean;
  signature?: string; // Base64
}

export type CAPAType = 'Corrective' | 'Preventive';
export type CAPASource = 'Incident' | 'Inspection' | 'Observation' | 'Risk Assessment' | 'Audit' | 'Other';
export type CAPAEffectiveness = 'Effective' | 'Partially Effective' | 'Ineffective';

export interface ActionItem {
  id: string;
  type: CAPAType;
  source: CAPASource;
  title: string;
  description?: string;
  rootCause?: string;
  assignee: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Done' | 'Verified';
  // Cross-module references
  relatedIncidentId?: string;
  relatedInspectionId?: string;
  relatedObservationId?: string;
  relatedRiskAssessmentId?: string;
  // Lifecycle timestamps
  createdAt: string;
  closedAt?: string;
  // Verification (ISO 45001 Clause 10.2.1f)
  verifiedBy?: string;
  verifiedAt?: string;
  effectivenessRating?: CAPAEffectiveness;
  effectivenessNotes?: string;
}

export interface DashboardStats {
  totalIncidents: number;
  openActions: number;
  inspectionsCompleted: number;
  riskScore: number;
}

// --- Risk Assessment Types ---

export type RiskControlType = 'Elimination' | 'Substitution' | 'Engineering' | 'Administrative' | 'PPE';

export interface RiskControl {
  id: string;
  type: RiskControlType;
  description: string;
}

export interface RiskHazard {
  id: string;
  description: string;
  probability: number; // 1-5
  severity: number; // 1-5
  riskScore: number; // Calculated (Prob * Sev)
  controls: RiskControl[];
}

export interface RiskAssessment {
  id: string;
  title: string;
  taskDescription: string;
  type: 'JHA' | 'HIRA' | 'TRA';
  date: string;
  author: string;
  hazards: RiskHazard[];
  status: 'Draft' | 'Approved' | 'Archived';
  contextId?: string;
}

// --- Observation / STOP Card Types ---

export type ObservationType = 'Unsafe Act' | 'Unsafe Condition' | 'Safe Behavior' | 'Near Miss';

export interface Observation {
  id: string;
  type: ObservationType;
  category: string;
  description: string;
  location: string;
  date: string;
  observer?: string;
  isAnonymous: boolean;
  images: string[];
  status: 'Open' | 'Closed';
  immediateActionTaken?: string;
  contextId?: string;
}

// --- Training & Competency Types ---

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  requiredForRoles: string[]; // e.g., ['Welder', 'Electrician']
  validityMonths: number; // 0 for lifetime
}

export interface WorkerProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  companyId?: string; // Link to Contractor
  photoUrl?: string;
  joinedDate: string;
  email?: string;
  phone?: string;
  // Gamification
  points: number;
  level: string; // e.g. "Safety Novice", "Safety Champion"
  badges: string[]; // e.g. "Observer", "Action Hero"
}

export interface TrainingRecord {
  id: string;
  workerId: string;
  moduleId: string;
  moduleTitle: string; // Denormalized for easier display
  completionDate: string;
  expiryDate?: string;
  certificateUrl?: string; // Base64
  status: 'Valid' | 'Expired' | 'Expiring Soon';
}

export interface TrainingGapAnalysis {
  workerId: string;
  missingModules: string[];
  expiredModules: string[];
  recommendedModules: {
    title: string;
    reason: string;
  }[];
  score: number; // 0-100 competency score
}

// --- PPE Management Types ---

export interface PPEItem {
  id: string;
  name: string;
  category: string; // Helmet, Gloves, Boots, Harness, etc.
  stockQuantity: number;
  minStockThreshold: number;
  description?: string;
}

export interface PPEIssuance {
  id: string;
  workerId: string;
  workerName: string; // Denormalized
  ppeItemId: string;
  ppeItemName: string; // Denormalized
  issueDate: string;
  expiryDate?: string; // Estimated replacement date
  signatureUrl?: string; // Base64 signature or photo
  status: 'Active' | 'Returned' | 'Expired';
}

// --- Permit to Work Types ---

export enum PermitType {
  HOT_WORK = 'Hot Work',
  COLD_WORK = 'Cold Work',
  HEIGHT = 'Working at Height',
  CONFINED_SPACE = 'Confined Space',
  ELECTRICAL = 'Electrical Isolation',
  EXCAVATION = 'Excavation',
  LIFTING = 'Lifting Operation'
}

export enum PermitStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending Approval',
  APPROVED = 'Active',
  CLOSED = 'Closed',
  EXPIRED = 'Expired',
  REJECTED = 'Rejected'
}

// ── Lifting Plan Module ────────────────────────────────────────────────────────

export enum LiftCategory {
  ROUTINE  = 'Routine Lift',
  CRITICAL = 'Critical Lift',
}

export enum LiftingEquipmentType {
  MOBILE_CRANE   = 'Mobile Crane',
  CRAWLER_CRANE  = 'Crawler Crane',
  TOWER_CRANE    = 'Tower Crane',
  FORKLIFT       = 'Forklift',
  CHAIN_BLOCK    = 'Chain Block / Lever Hoist',
  GANTRY         = 'Gantry / A-Frame',
  OVERHEAD_CRANE = 'Overhead Crane (EOT)',
}

export enum LiftingPlanStatus {
  DRAFT       = 'Draft',
  PENDING_HSE = 'Pending HSE Approval',
  APPROVED    = 'Approved',
}

export interface LiftingCheckItem {
  label: string;
  pass: boolean;
  message?: string;
}

export interface LiftingCalculationResult {
  totalLiftedLoad: number;
  requiredCapacity: number;
  ratedCapacity: number;
  utilizationPercent: number;
  pass: boolean;
  notes: string[];
  checks: LiftingCheckItem[];
  calculatedAt: string;
}

export interface LiftingDocument {
  id: string;
  name: string;
  category: 'Crane Load Chart' | 'Equipment Certificate' | 'Lift Sketch' | 'Method Statement' | 'Other';
  uploadedAt: string;
  dataUrl?: string; // base64 for small files
}

export interface LiftingPlan {
  // Core
  equipmentType: LiftingEquipmentType;
  liftCategory: LiftCategory;
  // Load
  loadDescription?: string;
  loadWeight: number | null;
  riggingWeight: number | null;
  loadDimensions?: string;
  centerOfGravityKnown: boolean;
  fragileLoad: boolean;
  hazardousLoad: boolean;
  dynamicFactor: number;
  // Equipment parameters & calculation
  parameters: Record<string, number | null>;
  calculation?: LiftingCalculationResult;
  // Status & approval
  status: LiftingPlanStatus;
  sentForApprovalAt?: string;
  approvedAt?: string;
  hseApprover?: string;
  approvalComments?: string;
  attachedToPermit: boolean;
  // Cross-module links
  permitId?: string;
  linkedPermitNumber?: string;
  riskAssessmentId?: string;
  // Site conditions
  groundCondition?: string;
  outriggersRequired: boolean;
  exclusionZoneEstablished: boolean;
  weatherSuitable: boolean;
  weatherChecked: boolean;
  weatherSummary?: string;
  // Personnel (names from Workers module)
  liftingSupervisor?: string;
  craneOperator?: string;
  rigger?: string;
  banksman?: string;
  hseRepresentative?: string;
  // Method statement
  methodStatementAttached: boolean;
  // Supporting documents
  documents: LiftingDocument[];
}

export interface LiftingPlanRecord {
  id: string;
  planNumber: string;    // LP-YYYY-NNNN
  title: string;
  project?: string;
  location: string;
  description: string;
  date: string;
  author: string;
  plan: LiftingPlan;
}

export interface Permit {
  id: string;
  type: PermitType;
  location: string;
  description: string;
  validFrom: string; // ISO Date
  validUntil: string; // ISO Date
  requestor: string;
  approver?: string;
  status: PermitStatus;
  riskAssessmentId?: string; // Link to a JHA/Risk Assessment
  liftingPlanId?: string; // Link to approved lifting plan module
  controls: {
    id: string;
    label: string;
    checked: boolean;
  }[];
  approverComments?: string;
  aiAuditIssues?: string[]; // AI detected issues
}

// --- Asset & Equipment Types ---

export type AssetCategory = 'Lifting Equipment' | 'Vehicle' | 'Machine' | 'Fire/Emergency' | 'Tools';
export type AssetStatus = 'Operational' | 'Under Maintenance' | 'Out of Service' | 'Inspection Overdue';

export interface AssetDocument {
  id: string;
  title: string; // e.g. "LOLER Certificate"
  type: string; // PDF, Image
  url: string; // Base64 or URL
  uploadDate: string;
  expiryDate?: string;
}

export interface Asset {
  id: string;
  name: string; // e.g. "Mobile Crane 50T"
  category: AssetCategory;
  modelNumber: string;
  serialNumber: string;
  location: string;
  status: AssetStatus;
  lastInspectionDate?: string;
  nextInspectionDate: string;
  image?: string; // Base64
  documents: AssetDocument[];
  maintenanceHistory: {
    date: string;
    description: string;
    performedBy: string;
  }[];
}

// --- Contractor Management Types ---

export interface ContractorDocument {
  id: string;
  type: 'Insurance' | 'HSE Policy' | 'License' | 'Certification';
  title: string;
  expiryDate: string;
  status: 'Valid' | 'Expired' | 'Pending';
  url?: string;
}

export interface Contractor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'Pending' | 'Approved' | 'Suspended' | 'Rejected';
  documents: ContractorDocument[];
  complianceScore: number; // 0-100
  performanceRating?: 'A' | 'B' | 'C' | 'D';
}

// --- Document Management System (DMS) Types ---

export type DocumentCategory = 'Policy' | 'SOP' | 'MSDS' | 'Work Instruction' | 'Report' | 'Training Material';

export interface HSEDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  version: string; // e.g., v1.0
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Archived';
  uploadDate: string;
  author: string;
  contentUrl?: string; // Base64 or URL
  description?: string;
  approvedBy?: string;
  approvalDate?: string;
  aiSummary?: string; // Generated summary
}

// --- Emergency Response Types ---

export type EmergencyContactType = 'External Service' | 'Site Medic' | 'Fire Warden' | 'Management';

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  type: EmergencyContactType;
  location?: string;
}

export interface EmergencyDrill {
  id: string;
  type: 'Fire Evacuation' | 'Medical Emergency' | 'Chemical Spill' | 'Confined Space Rescue';
  date: string;
  location: string;
  participantsCount: number;
  durationMinutes: number; // Duration of drill
  outcome: 'Success' | 'Partial Success' | 'Failed';
  notes?: string;
  attendanceList?: string[]; // Digital list of names
  attendanceFile?: string; // Uploaded sheet (Base64)
}

// --- Analytics & KPI Types ---

export interface HSEMetrics {
  totalManHours: number;
  ltiCount: number; // Lost Time Injuries
  rwcCount: number; // Restricted Work Cases
  mtcCount: number; // Medical Treatment Cases
  facCount: number; // First Aid Cases
  nmCount: number; // Near Misses
  
  trir: number; // Total Recordable Incident Rate
  ltifr: number; // Lost Time Injury Frequency Rate
  
  actionClosureRate: number; // %
  inspectionCompliance: number; // %
}

// --- Stats Input Types ---

export interface HSEStatsLog {
  id: string;
  date: string; // YYYY-MM-DD
  period: 'Daily' | 'Weekly' | 'Monthly';
  manHours: number;
  activeWorkers: number;
  remarks?: string;
}

// --- Geo-fencing & Zones ---

export interface SafetyZone {
  id: string;
  name: string;
  type: 'Danger' | 'Restricted' | 'Safe' | 'Permit Required';
  lat: number;
  lng: number;
  radius: number; // meters
  requiredPPE: string[];
  requiredTraining?: string[]; // IDs of modules
}

// --- AI Hazard Analysis ---

export interface HazardDetection {
  hazard: string; // e.g. "No Helmet", "Trip Hazard"
  confidence: number;
  location?: string; // "Left foreground"
  recommendation: string;
}

export interface SiteSafetyScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  breakdown: {
    incidents: number;
    observations: number;
    inspections: number;
    training: number;
    actions: number;
  };
}

// --- Environmental & Weather Types ---

export interface EnvironmentalData {
  temperature: number; // Celsius
  condition: string; // Sunny, Rainy, Windy, etc.
  windSpeed: number; // km/h
  humidity: number; // %
  aqi: number; // Air Quality Index (0-500)
  noiseLevel: number; // Decibels (dB)
  location: string;
}

export interface WeatherRiskAnalysis {
  recommendations: string[];
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  affectedActivities: string[]; // List of Permit Types or Tasks affected
}
