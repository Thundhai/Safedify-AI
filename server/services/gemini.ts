import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  private processImageData(imageData: string): string {
    return imageData.replace(/^data:image\/[a-z]+;base64,/, '');
  }

  private async generateStructuredContent(prompt: string, schema?: any): Promise<any> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      if (schema) {
        return JSON.parse(response.text());
      }
      return { response: response.text() };
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  private async generateContentWithImage(prompt: string, base64Image: string): Promise<any> {
    try {
      const imageData = this.processImageData(base64Image);
      const parts = [
        { text: prompt },
        {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg'
          }
        }
      ];

      const result = await this.model.generateContent(parts);
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      console.error('AI image analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  // Incident Analysis Methods
  async classifyIncident(description: string): Promise<any> {
    const prompt = `Analyze this HSE incident: "${description}". Classify and perform causal analysis. Return JSON with type, severity, confidence, reasoning, causes, and contributingFactors.`;
    return this.generateStructuredContent(prompt, true);
  }

  async getCorrectiveActions(description: string, type: string, severity: string): Promise<any> {
    const prompt = `Generate corrective actions for ${type} incident with ${severity} severity: "${description}". Return JSON with immediate, shortTerm, and longTerm actions.`;
    return this.generateStructuredContent(prompt, true);
  }

  async analyzeRootCause(description: string, type: string, method: string = '5-Why'): Promise<any> {
    const prompt = `Perform ${method} root cause analysis for ${type} incident: "${description}". Return structured analysis.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Computer Vision Methods
  async detectPPE(base64Image: string): Promise<any> {
    const prompt = `Analyze this image for PPE compliance. Return JSON with detected, missing, compliance score (0-100), and recommendations.`;
    return this.generateContentWithImage(prompt, base64Image);
  }

  async extractDocumentData(base64Image: string): Promise<any> {
    const prompt = `Extract all text and data from this document image. Return structured JSON.`;
    return this.generateContentWithImage(prompt, base64Image);
  }

  async detectSiteHazards(base64Image: string): Promise<any> {
    const prompt = `Analyze this site image for safety hazards. Return JSON with hazards, riskLevel, and recommendations.`;
    return this.generateContentWithImage(prompt, base64Image);
  }

  // Chat and Communication Methods
  async chatSafetyAssistant(message: string, image?: string, context?: any): Promise<any> {
    const contextStr = context ? JSON.stringify(context) : '';
    const prompt = `You are an AI Safety Assistant. Context: ${contextStr}. User message: ${message}. Provide helpful safety guidance.`;
    
    if (image) {
      return this.generateContentWithImage(prompt, image);
    }
    return this.generateStructuredContent(prompt);
  }

  async fetchRegulatoryNews(country: string): Promise<any> {
    const prompt = `Generate safety regulatory updates for ${country}. Return JSON with recent updates, deadlines, and compliance requirements.`;
    return this.generateStructuredContent(prompt, true);
  }

  async generateSpeech(text: string): Promise<any> {
    // For now, return the text as speech would require additional TTS service
    return { audioData: null, text, message: "Speech generation requires TTS service integration" };
  }

  // Analytics Methods
  async analyzeWeatherRisks(weatherData: any): Promise<any> {
    const prompt = `Analyze weather data for safety risks: ${JSON.stringify(weatherData)}. Return risk assessment and recommendations.`;
    return this.generateStructuredContent(prompt, true);
  }

  async predictiveSafetyAlerts(metrics: any, incidents: any[]): Promise<any> {
    const prompt = `Analyze metrics and incidents for predictive safety alerts: Metrics: ${JSON.stringify(metrics)}, Incidents: ${JSON.stringify(incidents)}. Return alerts and predictions.`;
    return this.generateStructuredContent(prompt, true);
  }

  async generateExecutiveReport(metrics: any): Promise<any> {
    const prompt = `Generate executive safety report from metrics: ${JSON.stringify(metrics)}. Return comprehensive report.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Inspection Methods
  async suggestInspectionFix(question: string, comment: string): Promise<any> {
    const prompt = `Suggest fixes for inspection issue. Question: "${question}", Comment: "${comment}". Return recommendations.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Risk Assessment Methods
  async identifyHazards(taskDescription: string, type: string): Promise<any> {
    const prompt = `Identify hazards for ${type} task: "${taskDescription}". Return JSON with hazards and risk levels.`;
    return this.generateStructuredContent(prompt, true);
  }

  async suggestControls(hazardDescription: string): Promise<any> {
    const prompt = `Suggest control measures for hazard: "${hazardDescription}". Return hierarchy of controls.`;
    return this.generateStructuredContent(prompt, true);
  }

  async explainRiskScore(riskScore: number, description: string, probability: number, severity: number): Promise<any> {
    const prompt = `Explain risk score ${riskScore} for "${description}" (P:${probability}, S:${severity}). Return detailed explanation.`;
    return this.generateStructuredContent(prompt, true);
  }

  async reviewRiskAssessment(taskDescription: string, hazardsList: string[]): Promise<any> {
    const prompt = `Review risk assessment for "${taskDescription}" with hazards: ${JSON.stringify(hazardsList)}. Return review and suggestions.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Observation Methods
  async analyzeObservationTrends(observations: any[]): Promise<any> {
    const prompt = `Analyze observation trends: ${JSON.stringify(observations)}. Return trend analysis and insights.`;
    return this.generateStructuredContent(prompt, true);
  }

  async analyzeObservation(description: string): Promise<any> {
    const prompt = `Analyze safety observation: "${description}". Return analysis and recommendations.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Certificate and Training Methods
  async parseCertificate(base64Image: string): Promise<any> {
    const prompt = `Parse certificate data from image. Return JSON with name, certification, expiry, issuer, and validity.`;
    return this.generateContentWithImage(prompt, base64Image);
  }

  async analyzeSkillGap(role: string, trainingTitles: string[], incidents: string[]): Promise<any> {
    const prompt = `Analyze skill gap for ${role} with training: ${JSON.stringify(trainingTitles)} and incidents: ${JSON.stringify(incidents)}. Return gap analysis.`;
    return this.generateStructuredContent(prompt, true);
  }

  // PPE Management Methods
  async analyzePPEStock(lowStockItems: any[]): Promise<any> {
    const prompt = `Analyze PPE stock levels: ${JSON.stringify(lowStockItems)}. Return recommendations and priority items.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Permit Methods
  async auditPermit(permitType: string, description: string, controlsText: string[], hazards: string[]): Promise<any> {
    const prompt = `Audit ${permitType} permit. Description: "${description}", Controls: ${JSON.stringify(controlsText)}, Hazards: ${JSON.stringify(hazards)}. Return audit results.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Asset Management Methods
  async extractCertificateData(base64Image: string): Promise<any> {
    const prompt = `Extract certificate data from asset image. Return structured equipment certification data.`;
    return this.generateContentWithImage(prompt, base64Image);
  }

  // Contractor Management Methods
  async evaluateContractorCompliance(contractor: any, workerCount: number): Promise<any> {
    const prompt = `Evaluate contractor compliance: ${JSON.stringify(contractor)} with ${workerCount} workers. Return compliance assessment.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Document Management Methods
  async summarizeDocument(contentUrl: string, title: string): Promise<any> {
    const prompt = `Summarize document "${title}" from URL: ${contentUrl}. Return key points and summary.`;
    return this.generateStructuredContent(prompt, true);
  }

  // Legacy compatibility methods
  async chatSafetyAssistant_old(message: string, image?: string): Promise<any> {
    return this.chatSafetyAssistant(message, image);
  }

  async generateRiskAssessment(description: string, location?: string, activities?: string[]): Promise<any> {
    return this.identifyHazards(description, location || 'general');
  }

  async analyzeIncident(incident: any): Promise<any> {
    return this.classifyIncident(incident.description || JSON.stringify(incident));
  }
}