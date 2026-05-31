
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
  ENGINEER: 'Engineer',
  SITE_SUPERVISOR: 'Site Supervisor',
  CONSTRUCTION_MANAGER: 'Construction Manager',
  OPERATIONS_MANAGER: 'Operations Manager',
  WORKER: 'Worker',
  EXECUTIVE: 'Executive Management'
};

export type UserRole = string;

export enum SubscriptionTier {
  FREE = 'Free',
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
  org_id?: string;
  org_name?: string;
  companyId?: string;
  siteId?: string; // Current active site
  // Permissions are loaded at runtime based on role
}

// --- Multi-Site & Team Management Types ---

export interface Site {
  id: string;
  name: string;
  code: string; // Short code e.g. "DXB-01"
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  companyId: string;
  status: 'Active' | 'Inactive' | 'Under Construction';
  contactPerson?: string;
  contactPhone?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  siteId: string;
  leaderId?: string; // User ID of team leader
  leaderName?: string;
  department: string;
  memberCount: number;
  members?: TeamMember[];
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  role: string;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  siteId: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  teamIds: string[];
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
  UNSAFE_ACT = 'Unsafe Act',
  UNSAFE_CONDITION = 'Unsafe Condition',
  FIRST_AID_CASE = 'First Aid Case',
  MEDICAL_TREATMENT_CASE = 'Medical Treatment Case',
  RESTRICTED_WORK_CASE = 'Restricted Work Case',
  LOST_TIME_INJURY = 'Lost Time Injury',
  FATALITY = 'Fatality',
  ENVIRONMENTAL_SPILL = 'Environmental Spill',
  ENVIRONMENTAL_EMISSION = 'Environmental Emission',
  ENVIRONMENTAL_WASTE = 'Environmental Waste Incident',
  PROPERTY_DAMAGE = 'Property Damage',
  FIRE_EXPLOSION = 'Fire / Explosion',
  VEHICLE_INCIDENT = 'Vehicle Incident',
  SECURITY_BREACH = 'Security Breach',
  OCCUPATIONAL_ILLNESS = 'Occupational Illness',
  THIRD_PARTY_INJURY = 'Third Party Injury',
  DANGEROUS_OCCURRENCE = 'Dangerous Occurrence'
}

// Whether an incident is recordable under OSHA
export const isRecordable = (category: IncidentCategory): boolean => {
  return [
    IncidentCategory.MEDICAL_TREATMENT_CASE,
    IncidentCategory.RESTRICTED_WORK_CASE,
    IncidentCategory.LOST_TIME_INJURY,
    IncidentCategory.FATALITY,
    IncidentCategory.OCCUPATIONAL_ILLNESS,
    IncidentCategory.DANGEROUS_OCCURRENCE,
  ].includes(category);
};

// Nature of injury / illness
export const NATURE_OF_INJURY_OPTIONS = [
  'Laceration / Cut', 'Contusion / Bruise', 'Fracture', 'Sprain / Strain',
  'Burn (Thermal)', 'Burn (Chemical)', 'Amputation', 'Dislocation',
  'Concussion', 'Puncture Wound', 'Abrasion / Scrape', 'Electric Shock',
  'Hearing Loss', 'Respiratory Irritation', 'Asphyxiation', 'Poisoning',
  'Heat Stroke / Exhaustion', 'Cold Exposure / Frostbite', 'Dermatitis',
  'Foreign Body (Eye)', 'Internal Injury', 'Multiple Injuries',
  'Psychological / Stress', 'No Injury (Near Miss)', 'Other'
];

// Mechanism / how the injury occurred
export const MECHANISM_OPTIONS = [
  'Struck By (Object)', 'Struck Against', 'Fall from Height',
  'Fall on Same Level (Slip/Trip)', 'Caught In / Between',
  'Contact with (Hot Surface)', 'Contact with (Chemical)',
  'Contact with (Electricity)', 'Overexertion / Repetitive Motion',
  'Exposure to Harmful Substance', 'Exposure to Noise',
  'Exposure to Radiation', 'Motor Vehicle Collision',
  'Collapse / Cave-In', 'Explosion', 'Fire',
  'Drowning', 'Animal / Insect', 'Assault / Violence',
  'Equipment Malfunction', 'Falling Object', 'Manual Handling',
  'Confined Space', 'Other'
];

// Body part affected
export const BODY_PART_OPTIONS = [
  'Head', 'Face', 'Eye (Left)', 'Eye (Right)', 'Ear (Left)', 'Ear (Right)',
  'Neck', 'Shoulder (Left)', 'Shoulder (Right)', 'Upper Arm (Left)', 'Upper Arm (Right)',
  'Elbow (Left)', 'Elbow (Right)', 'Forearm (Left)', 'Forearm (Right)',
  'Wrist (Left)', 'Wrist (Right)', 'Hand (Left)', 'Hand (Right)',
  'Finger(s) (Left)', 'Finger(s) (Right)', 'Chest', 'Abdomen',
  'Upper Back', 'Lower Back', 'Hip (Left)', 'Hip (Right)',
  'Thigh (Left)', 'Thigh (Right)', 'Knee (Left)', 'Knee (Right)',
  'Lower Leg (Left)', 'Lower Leg (Right)', 'Ankle (Left)', 'Ankle (Right)',
  'Foot (Left)', 'Foot (Right)', 'Toe(s) (Left)', 'Toe(s) (Right)',
  'Internal Organs', 'Respiratory System', 'Whole Body / Multiple', 'Not Applicable'
];

// PPE worn at time of incident
export const PPE_OPTIONS = [
  'Hard Hat / Helmet', 'Safety Glasses / Goggles', 'Face Shield',
  'Hearing Protection', 'Dust Mask / Respirator', 'SCBA',
  'High-Visibility Vest', 'Safety Gloves', 'Chemical Gloves',
  'Safety Boots / Shoes', 'Fall Harness', 'Welding Shield',
  'Fire Retardant Clothing', 'Coveralls / Overalls',
  'Life Jacket / PFD', 'None', 'Not Applicable'
];

// Departments
export const DEPARTMENT_OPTIONS = [
  'Operations', 'Maintenance', 'Engineering', 'Construction',
  'Logistics / Warehouse', 'Administration', 'HSE',
  'Quality Control', 'Electrical', 'Mechanical',
  'Civil', 'Drilling', 'Production', 'Transport',
  'Catering / Camp', 'Marine', 'IT', 'Other'
];

// Shift options
export const SHIFT_OPTIONS = ['Day Shift', 'Night Shift', 'Rotational', 'On-Call', 'Overtime', 'Not Applicable'];

// Weather conditions
export const WEATHER_OPTIONS = [
  'Clear / Sunny', 'Cloudy / Overcast', 'Rain', 'Heavy Rain / Storm',
  'Wind (Strong)', 'Fog / Low Visibility', 'Snow / Ice', 'Extreme Heat',
  'Extreme Cold', 'Dust Storm', 'Indoor (N/A)', 'Not Relevant'
];

// Employment type of injured person
export const EMPLOYMENT_TYPE_OPTIONS = ['Employee', 'Contractor', 'Sub-Contractor', 'Visitor', 'Third Party / Public'];

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

// Witness information
export interface IncidentWitness {
  name: string;
  contactInfo: string;
  statement?: string;
}

// Injured person details
export interface InjuredPerson {
  name: string;
  employmentType: string; // Employee, Contractor, Visitor, etc.
  jobTitle: string;
  department: string;
  yearsExperience: number;
  natureOfInjury: string;
  bodyPart: string;
  treatmentProvided: string;
  hospitalName?: string;
  daysLost: number;
}

export interface Incident {
  id: string;
  description: string;
  date: string;            // Date & time of incident
  dateReported: string;    // Date the report was filed
  location: string;
  department: string;      // Department where it occurred
  type: IncidentType;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: 'Open' | 'Investigating' | 'Closed';
  images: string[];
  reporter: string;

  // Incident context
  shift: string;
  weatherConditions: string;
  taskBeingPerformed: string;    // What work was happening

  // People involved
  injuredPersons: InjuredPerson[];
  witnesses: IncidentWitness[];

  // Legacy single-person fields (backwards compat)
  daysLost?: number;
  bodyPart?: string;
  mechanism?: string;
  immediateAction?: string;

  // PPE & Environmental
  ppeWorn: string[];             // PPE items the affected person(s) wore
  ppeAdequate: boolean | null;   // Was PPE appropriate for the task?
  environmentalImpact: string;   // Spill, emission, etc.

  // Immediate response
  immediateActionsTaken: string; // Narrative of what was done immediately
  areaSecured: boolean;
  emergencyServicesNotified: boolean;
  regulatoryNotification: boolean;

  // AI classification
  aiClassification?: {
    confidence: number;
    reasoning: string;
    causes?: string[];
    contributingFactors?: string[];
  };
  rootCause?: string;
  correctiveActions?: string;
  investigation?: Investigation;
  /** Structured incident number e.g. NM-001, FIRE-003 */
  incidentNumber?: string;
  /** AI-generated corrective/preventive action recommendations at submission time */
  aiRecommendations?: string[];
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
  relatedPermitId?: string;
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
  workActivity?: string;
  description: string;
  personAtRisk?: string;
  probability: number; // 1-5 (Initial)
  severity: number; // 1-5 (Initial)
  riskScore: number; // Initial Risk Score (Prob * Sev)
  controls: RiskControl[];
  actualProbability?: number; // 1-5 (Residual)
  actualSeverity?: number; // 1-5 (Residual)
  actualRiskScore?: number; // Residual Risk Score
  additionalControls?: string;
  priority?: string;
  actionBy?: string;
  duration?: string;
}

export interface RiskAssessment {
  id: string;
  title: string;
  taskDescription: string;
  type: 'JHA' | 'HIRA' | 'TRA';
  date: string;
  author: string;
  location?: string;
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
  permitNumber?: string;
  type: PermitType;
  location: string;
  description: string;
  validFrom: string; // ISO Date
  validUntil: string; // ISO Date
  requestor: string;
  supervisorName?: string;
  contractor?: string;
  assignedWorkers: string[];
  isolationCertificateRef?: string;
  gasTestResults?: string;
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
  aiComplianceGaps?: ComplianceGap[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// --- Compliance Gap (Permit Compliance Scan) ---

export interface ComplianceGap {
  id: string;
  description: string;                       // What is missing / wrong
  resolution: 'ai_fixable' | 'action_required';
  // ai_fixable: AI can generate a control text to add to the permit checklist
  aiSuggestion?: string;                     // Proposed control measure text
  // action_required: Must be physically resolved; an Action Item is created
  actionItemTitle?: string;                  // Suggested Action Item title
  applied?: boolean;                         // True once fix applied / action created
  actionItemId?: string;                     // ID of created Action Item (if any)
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
  expiryDate?: string; // Document expiry / review due date
  reviewDate?: string; // Next review date
  reviewer?: string; // Assigned reviewer
  tags?: string[]; // Searchable tags
  versionHistory?: DocumentVersion[];
}

export interface DocumentVersion {
  version: string;
  date: string;
  author: string;
  changes: string;
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
  severity?: string; // e.g. "High", "Medium", "Low"
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
  windDirection: string; // N, NE, E, SE, S, SW, W, NW
  humidity: number; // %
  aqi: number; // Air Quality Index (0-500)
  noiseLevel: number; // Decibels (dB)
  location: string;
  uvIndex: number; // 0-11+
  visibility: number; // km
  pressure: number; // hPa
  feelsLike: number; // Heat index / Wind chill in Celsius
  precipitation: number; // mm probability %
  updatedAt: string; // ISO timestamp
}

export interface WeatherRiskAnalysis {
  recommendations: string[];
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  affectedActivities: string[]; // List of Permit Types or Tasks affected
  summary?: string; // One-line AI summary of conditions
}

// --- Notifications ---

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  is_read: number;      // 0 | 1
  email_sent: number;   // 0 | 1
  created_at: string;
}
