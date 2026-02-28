
// Permissions Keys
export type Permission = 
  | 'manage_roles'        // Create/Edit Roles
  | 'manage_users'        // Manage users
  | 'view_analytics'      // Access Dashboard/Analytics
  | 'create_incident'     // Report incidents
  | 'manage_incidents'    // Edit/Close incidents
  | 'perform_inspection'  // Run inspections
  | 'create_permit'       // Request permit
  | 'approve_permit'      // Approve permit
  | 'manage_documents'    // Upload/Approve docs
  | 'ai_features';        // Use AI tools

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
  RESTRICTED_WORK = 'Restricted Work Case',
  LTI = 'Lost Time Injury',
  FATALITY = 'Fatality',
  ENVIRONMENTAL = 'Environmental',
  PROPERTY_DAMAGE = 'Property Damage',
  FIRE = 'Fire',
  SECURITY = 'Security',
  VEHICLE = 'Vehicle Incident'
}

// OSHA Incident Classification (pyramid hierarchy)
export enum IncidentCategory {
  NEAR_MISS = 'Near Miss',
  FIRST_AID_CASE = 'First Aid Case',
  MEDICAL_TREATMENT_CASE = 'Medical Treatment Case',
  RESTRICTED_WORK_CASE = 'Restricted Work Case',
  LOST_TIME_INJURY = 'Lost Time Injury',
  FATALITY = 'Fatality'
}

// Whether an incident is recordable under OSHA
export const isRecordable = (category: IncidentCategory): boolean => {
  return [
    IncidentCategory.MEDICAL_TREATMENT_CASE,
    IncidentCategory.RESTRICTED_WORK_CASE,
    IncidentCategory.LOST_TIME_INJURY,
    IncidentCategory.FATALITY
  ].includes(category);
};

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
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: 'Open' | 'Investigating' | 'Closed';
  images: string[];
  reporter: string;
  daysLost?: number;         // For LTI tracking
  bodyPart?: string;         // Affected body part
  mechanism?: string;        // How injury occurred (e.g., Struck by, Fall from height)
  immediateAction?: string;  // What was done immediately
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

// Action Types
export type ActionType = 'Corrective' | 'Preventive' | 'Improvement';

// Leading vs Lagging indicator classification
export type IndicatorType = 'Leading' | 'Lagging';

// Action categories aligned with HSE leading/lagging framework
export type ActionCategory =
  // Leading (proactive) categories
  | 'Training & Competency'
  | 'Inspection & Audit'
  | 'Risk Assessment'
  | 'Safety Campaign'
  | 'Procedure Update'
  | 'PPE & Equipment'
  | 'Emergency Preparedness'
  | 'Behavioral Safety'
  // Lagging (reactive) categories
  | 'Incident Corrective'
  | 'Incident Preventive'
  | 'Regulatory Compliance'
  | 'Investigation Finding'
  | 'Audit Non-Conformance'
  | 'Other';

// Map each category to its indicator type
export const ACTION_INDICATOR_MAP: Record<ActionCategory, IndicatorType> = {
  'Training & Competency': 'Leading',
  'Inspection & Audit': 'Leading',
  'Risk Assessment': 'Leading',
  'Safety Campaign': 'Leading',
  'Procedure Update': 'Leading',
  'PPE & Equipment': 'Leading',
  'Emergency Preparedness': 'Leading',
  'Behavioral Safety': 'Leading',
  'Incident Corrective': 'Lagging',
  'Incident Preventive': 'Lagging',
  'Regulatory Compliance': 'Lagging',
  'Investigation Finding': 'Lagging',
  'Audit Non-Conformance': 'Lagging',
  'Other': 'Lagging',
};

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  dueDate: string;
  completedDate?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Overdue' | 'Done' | 'Verified';
  actionType: ActionType;
  category: ActionCategory;
  indicator: IndicatorType;
  relatedIncidentId?: string;
  verifiedBy?: string;
  effectiveness?: 'Effective' | 'Partially Effective' | 'Ineffective' | 'Not Assessed';
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
}

// --- Observation / STOP Card Types ---

export type ObservationType = 'Unsafe Act' | 'Unsafe Condition' | 'Safe Behavior' | 'Near Miss';

export interface Observation {
  id: string;
  type: ObservationType;
  category: string; // e.g. PPE, Housekeeping, Tools, Heights
  description: string;
  location: string;
  date: string;
  observer?: string; // Optional for anonymous
  isAnonymous: boolean;
  images: string[];
  status: 'Open' | 'Closed';
  immediateActionTaken?: string;
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
  fatalityCount: number; // Fatalities
  
  trir: number; // Total Recordable Incident Rate
  ltifr: number; // Lost Time Injury Frequency Rate
  severityRate: number; // Days lost per 200,000 man-hours
  
  actionClosureRate: number; // %
  inspectionCompliance: number; // %

  // Leading Indicators
  leadingActions: number;       // Total leading (proactive) actions
  leadingClosureRate: number;   // % of closed leading actions
  inspectionsCompleted: number; // Total inspections done
  trainingHours: number;        // Placeholder for training tracking
  nearMissReportingRate: number; // Near misses per 200,000 man-hours
  
  // Lagging Indicators
  laggingActions: number;       // Total lagging (reactive) actions
  laggingClosureRate: number;   // % of closed lagging actions
  daysLost: number;             // Total days lost due to incidents
  recordableIncidents: number;  // MTC + RWC + LTI + Fatality
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
