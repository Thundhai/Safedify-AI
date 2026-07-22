import express from 'express';
import { GeminiService } from '../services/gemini.ts';

const router = express.Router();
const geminiService = new GeminiService();

// Helper function for error handling
const handleRequest = (fn: Function) => async (req: express.Request, res: express.Response) => {
  try {
    const result = await fn(req.body);
    res.json(result);
  } catch (error) {
    console.error('AI service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Incident Analysis Routes
router.post('/classify-incident', handleRequest((body: any) => geminiService.classifyIncident(body.description)));
router.post('/corrective-actions', handleRequest((body: any) => geminiService.getCorrectiveActions(body.description, body.type, body.severity)));
router.post('/root-cause-analysis', handleRequest((body: any) => geminiService.analyzeRootCause(body.description, body.type, body.method)));

// Computer Vision Routes  
router.post('/detect-ppe', handleRequest((body: any) => geminiService.detectPPE(body.base64Image)));
router.post('/extract-document', handleRequest((body: any) => geminiService.extractDocumentData(body.base64Image)));
router.post('/detect-hazards', handleRequest((body: any) => geminiService.detectSiteHazards(body.base64Image)));

// Chat and Communication Routes
router.post('/chat', handleRequest((body: any) => geminiService.chatSafetyAssistant(body.message, body.image, body.context)));
router.post('/regulatory-news', handleRequest((body: any) => geminiService.fetchRegulatoryNews(body.country)));
router.post('/generate-speech', handleRequest((body: any) => geminiService.generateSpeech(body.text)));

// Analytics and Reporting Routes
router.post('/weather-risks', handleRequest((body: any) => geminiService.analyzeWeatherRisks(body.weatherData)));
router.post('/predictive-alerts', handleRequest((body: any) => geminiService.predictiveSafetyAlerts(body.metrics, body.incidents)));
router.post('/executive-report', handleRequest((body: any) => geminiService.generateExecutiveReport(body.metrics)));

// Inspection and Maintenance Routes
router.post('/inspection-fix', handleRequest((body: any) => geminiService.suggestInspectionFix(body.question, body.comment)));

// Risk Assessment Routes
router.post('/identify-hazards', handleRequest((body: any) => geminiService.identifyHazards(body.taskDescription, body.type)));
router.post('/suggest-controls', handleRequest((body: any) => geminiService.suggestControls(body.hazardDescription)));
router.post('/explain-risk-score', handleRequest((body: any) => geminiService.explainRiskScore(body.riskScore, body.description, body.probability, body.severity)));
router.post('/review-risk-assessment', handleRequest((body: any) => geminiService.reviewRiskAssessment(body.taskDescription, body.hazardsList)));

// Observation Routes
router.post('/analyze-observation-trends', handleRequest((body: any) => geminiService.analyzeObservationTrends(body.observations)));
router.post('/analyze-observation', handleRequest((body: any) => geminiService.analyzeObservation(body.description)));

// Certificate and Training Routes
router.post('/parse-certificate', handleRequest((body: any) => geminiService.parseCertificate(body.base64Image)));
router.post('/analyze-skill-gap', handleRequest((body: any) => geminiService.analyzeSkillGap(body.role, body.trainingTitles, body.incidents)));

// PPE Management Routes
router.post('/analyze-ppe-stock', handleRequest((body: any) => geminiService.analyzePPEStock(body.lowStockItems)));

// Permit Routes
router.post('/audit-permit', handleRequest((body: any) => geminiService.auditPermit(body.permitType, body.description, body.controlsText, body.hazards)));

// Asset Management Routes
router.post('/extract-certificate-data', handleRequest((body: any) => geminiService.extractCertificateData(body.base64Image)));

// Contractor Management Routes
router.post('/evaluate-contractor', handleRequest((body: any) => geminiService.evaluateContractorCompliance(body.contractor, body.workerCount)));

// Document Management Routes
router.post('/summarize-document', handleRequest((body: any) => geminiService.summarizeDocument(body.contentUrl, body.title)));

export default router;