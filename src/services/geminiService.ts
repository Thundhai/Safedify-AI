import { 
  IncidentType, IncidentSeverity, Incident, ActionItem, 
  Observation, PPEItem, Contractor, HSEMetrics, EnvironmentalData 
} from "../types";

/**
 * REFACTORED AI SERVICE - ALL CALLS NOW GO THROUGH BACKEND API
 * No more direct AI SDK usage in frontend for mobile compatibility
 */

/**
 * Helper function for API calls
 */
const callBackendAPI = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`/api/ai${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Backend API call failed for ${endpoint}:`, error);
    // Return fallback for graceful degradation
    return {
      error: 'AI service temporarily unavailable',
      fallback: true
    };
  }
};

/**
 * 1. Incident Classification
 */
export const classifyIncidentAI = async (description: string) => {
  return callBackendAPI('/classify-incident', { description });
};

/**
 * 2. Corrective Actions Generation
 */
export const getCorrectiveActionsAI = async (description: string, type: string, severity: string) => {
  return callBackendAPI('/corrective-actions', { description, type, severity });
};

/**
 * 3. Root Cause Analysis
 */
export const analyzeRootCauseAI = async (description: string, type: string, method: '5-Why' | 'Fishbone' = '5-Why') => {
  return callBackendAPI('/root-cause-analysis', { description, type, method });
};

/**
 * 4. PPE Detection
 */
export const detectPPEAI = async (base64Image: string) => {
  return callBackendAPI('/detect-ppe', { base64Image });
};

/**
 * 5. Document Data Extraction
 */
export const extractDocumentDataAI = async (base64Image: string) => {
  return callBackendAPI('/extract-document', { base64Image });
};

/**
 * 6. Site Hazard Detection
 */
export const detectSiteHazardsAI = async (base64Image: string) => {
  return callBackendAPI('/detect-hazards', { base64Image });
};

/**
 * 7. Safety Chat Assistant
 */
export const chatSafetyAssistant = async (
  message: string,
  image?: string,
  context?: any
) => {
  return callBackendAPI('/chat', { message, image, context });
};

/**
 * 8. Regulatory News Fetching
 */
export const fetchRegulatoryNewsAI = async (country: string) => {
  return callBackendAPI('/regulatory-news', { country });
};

/**
 * 9. Speech Generation
 */
export const generateSpeechAI = async (text: string) => {
  return callBackendAPI('/generate-speech', { text });
};

/**
 * 10. Audio Playback (Client-side only)
 */
export const playGeneratedAudio = async (base64Audio: string) => {
  try {
    if (!base64Audio) return;
    
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    await audio.play();
  } catch (error) {
    console.error('Audio playback error:', error);
  }
};

/**
 * 11. Weather Risk Analysis
 */
export const analyzeWeatherRisksAI = async (weatherData: EnvironmentalData) => {
  return callBackendAPI('/weather-risks', { weatherData });
};

/**
 * 12. Predictive Safety Alerts
 */
export const predictiveSafetyAlertsAI = async (metrics: any, incidents: any[]) => {
  return callBackendAPI('/predictive-alerts', { metrics, incidents });
};

/**
 * 13. Executive Report Generation
 */
export const generateExecutiveReportAI = async (metrics: any) => {
  return callBackendAPI('/executive-report', { metrics });
};

/**
 * 14. Inspection Fix Suggestions
 */
export const suggestInspectionFixAI = async (question: string, comment: string) => {
  return callBackendAPI('/inspection-fix', { question, comment });
};

/**
 * 15. Hazard Identification
 */
export const identifyHazardsAI = async (taskDescription: string, type: string) => {
  return callBackendAPI('/identify-hazards', { taskDescription, type });
};

/**
 * 16. Control Measures Suggestion
 */
export const suggestControlsAI = async (hazardDescription: string) => {
  return callBackendAPI('/suggest-controls', { hazardDescription });
};

/**
 * 17. Risk Score Explanation
 */
export const explainRiskScoreAI = async (riskScore: number, description: string, probability: number, severity: number) => {
  return callBackendAPI('/explain-risk-score', { riskScore, description, probability, severity });
};

/**
 * 18. Risk Assessment Review
 */
export const reviewRiskAssessmentAI = async (taskDescription: string, hazardsList: string[]) => {
  return callBackendAPI('/review-risk-assessment', { taskDescription, hazardsList });
};

/**
 * 19. Observation Trends Analysis
 */
export const analyzeObservationTrendsAI = async (observations: any[]) => {
  return callBackendAPI('/analyze-observation-trends', { observations });
};

/**
 * 20. Individual Observation Analysis
 */
export const analyzeObservationAI = async (description: string) => {
  return callBackendAPI('/analyze-observation', { description });
};

/**
 * 21. Certificate Parsing
 */
export const parseCertificateAI = async (base64Image: string) => {
  return callBackendAPI('/parse-certificate', { base64Image });
};

/**
 * 22. Skill Gap Analysis
 */
export const analyzeSkillGapAI = async (role: string, trainingTitles: string[], incidents: string[]) => {
  return callBackendAPI('/analyze-skill-gap', { role, trainingTitles, incidents });
};

/**
 * 23. PPE Stock Analysis
 */
export const analyzePPEStockAI = async (lowStockItems: any[]) => {
  return callBackendAPI('/analyze-ppe-stock', { lowStockItems });
};

/**
 * 24. Permit Auditing
 */
export const auditPermitAI = async (permitType: string, description: string, controlsText: string[], hazards: string[]) => {
  return callBackendAPI('/audit-permit', { permitType, description, controlsText, hazards });
};

/**
 * 25. Certificate Data Extraction
 */
export const extractCertificateDataAI = async (base64Image: string) => {
  return callBackendAPI('/extract-certificate-data', { base64Image });
};

/**
 * 26. Contractor Compliance Evaluation
 */
export const evaluateContractorComplianceAI = async (contractor: any, workerCount: number) => {
  return callBackendAPI('/evaluate-contractor', { contractor, workerCount });
};

/**
 * 27. Lifting Plan AI Safety Review
 */
export const liftReviewAI = async (context: {
  equipmentType: string;
  liftCategory: string;
  loadWeight: number | null;
  riggingWeight: number | null;
  utilizationPercent: number;
  weatherSuitable: boolean;
  weatherSummary?: string;
  groundCondition?: string;
  liftingSupervisor?: string;
  craneOperator?: string;
  fragileLoad: boolean;
  hazardousLoad: boolean;
  outriggersRequired: boolean;
}) => {
  return callBackendAPI('/lift-review', context);
};

/**
 * 27. Document Summarization
 */
export const summarizeDocumentAI = async (contentUrl: string, title: string) => {
  return callBackendAPI('/summarize-document', { contentUrl, title });
};

