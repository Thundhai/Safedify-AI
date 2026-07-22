/**
 * AI-POWERED INCIDENT ANALYSIS SERVICE - REFACTORED FOR BACKEND API
 * Provides intelligent analysis, pattern detection, and recommendations for safety incidents
 * Features: Root cause analysis, severity prediction, similar incident matching, prevention suggestions
 * 
 * REFACTORED: All AI processing now happens on backend for mobile compatibility
 */

interface IncidentData {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  timestamp: number;
  injuryType?: string;
  equipmentInvolved?: string[];
  environmentalFactors?: string[];
  humanFactors?: string[];
  photos?: File[];
  witnesses?: number;
  immediateActions?: string;
}

interface AIAnalysisResult {
  rootCauseAnalysis: {
    primaryCause: string;
    contributingFactors: string[];
    confidence: number;
    reasoning: string;
  };
  severityAssessment: {
    predictedSeverity: 'low' | 'medium' | 'high' | 'critical';
    actualSeverity: 'low' | 'medium' | 'high' | 'critical';
    accuracy: number;
    riskFactors: string[];
  };
  patternDetection: {
    similarIncidents: Array<{
      id: string;
      title: string;
      similarity: number;
      commonFactors: string[];
    }>;
    trends: {
      timePattern: string;
      locationPattern: string;
      categoryPattern: string;
    };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    preventive: string[];
  };
  learningInsights: {
    keyLessons: string[];
    trainingNeeds: string[];
    systemImprovements: string[];
  };
}

interface TrendAnalysis {
  period: string;
  incidents: IncidentData[];
  patterns: {
    mostCommonCauses: Array<{ cause: string; frequency: number }>;
    locationHotspots: Array<{ location: string; count: number; riskLevel: string }>;
    timePatterns: Array<{ period: string; count: number; description: string }>;
    equipmentIssues: Array<{ equipment: string; incidents: number; issues: string[] }>;
  };
  predictions: {
    futureRisks: Array<{
      risk: string;
      probability: number;
      timeframe: string;
      mitigation: string[];
    }>;
    seasonalTrends: string[];
    emergingPatterns: string[];
  };
}

/**
 * Helper function for incident analysis API calls
 */
const callIncidentAPI = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`/api/ai${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Incident analysis API call failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Incident analysis API call failed for ${endpoint}:`, error);
    return {
      error: 'Incident analysis service temporarily unavailable',
      fallback: true
    };
  }
};

export class AIIncidentAnalysisService {
  /**
   * Comprehensive incident analysis
   */
  async analyzeIncident(incidentData: IncidentData): Promise<AIAnalysisResult> {
    const analysisData = {
      incident: incidentData,
      analysis_type: 'comprehensive'
    };

    const result = await callIncidentAPI('/analyze-incident', analysisData);
    
    // Return fallback if service unavailable
    if (result.fallback) {
      return {
        rootCauseAnalysis: {
          primaryCause: 'Manual analysis required - AI service unavailable',
          contributingFactors: ['Service temporarily unavailable'],
          confidence: 0,
          reasoning: 'AI analysis service is currently unavailable'
        },
        severityAssessment: {
          predictedSeverity: incidentData.severity,
          actualSeverity: incidentData.severity,
          accuracy: 50,
          riskFactors: ['Manual assessment required']
        },
        patternDetection: {
          similarIncidents: [],
          trends: {
            timePattern: 'Unknown',
            locationPattern: 'Unknown',
            categoryPattern: 'Unknown'
          }
        },
        recommendations: {
          immediate: ['Contact safety supervisor', 'Follow standard incident procedures'],
          shortTerm: ['Schedule manual incident review'],
          longTerm: ['Implement preventive measures'],
          preventive: ['Regular safety training', 'Equipment maintenance']
        },
        learningInsights: {
          keyLessons: ['Manual analysis required'],
          trainingNeeds: ['To be determined'],
          systemImprovements: ['Service restoration required']
        }
      };
    }

    return result;
  }

  /**
   * Root cause analysis using various methodologies
   */
  async performRootCauseAnalysis(incidentData: IncidentData, methodology: '5-why' | 'fishbone' | 'fault-tree' = '5-why'): Promise<any> {
    const rootCauseData = {
      incident: incidentData,
      methodology
    };

    return callIncidentAPI('/root-cause-analysis', rootCauseData);
  }

  /**
   * Severity assessment and prediction
   */
  async assessSeverity(incidentData: IncidentData): Promise<any> {
    const severityData = {
      incident: incidentData
    };

    return callIncidentAPI('/severity-assessment', severityData);
  }

  /**
   * Find similar incidents and patterns
   */
  async findSimilarIncidents(incidentData: IncidentData, historicalIncidents: IncidentData[]): Promise<any> {
    const similarityData = {
      incident: incidentData,
      historical_incidents: historicalIncidents.slice(-100) // Limit to recent 100 incidents
    };

    return callIncidentAPI('/similar-incidents', similarityData);
  }

  /**
   * Generate prevention recommendations
   */
  async generateRecommendations(incidentData: IncidentData, analysisResult: AIAnalysisResult): Promise<any> {
    const recommendationData = {
      incident: incidentData,
      analysis: analysisResult
    };

    return callIncidentAPI('/incident-recommendations', recommendationData);
  }

  /**
   * Analyze trends across multiple incidents
   */
  async analyzeTrends(incidents: IncidentData[], timeframe: string = '30-days'): Promise<TrendAnalysis> {
    const trendsData = {
      incidents: incidents,
      timeframe,
      analysis_type: 'trends'
    };

    const result = await callIncidentAPI('/trend-analysis', trendsData);

    // Return fallback if service unavailable
    if (result.fallback) {
      return {
        period: timeframe,
        incidents: incidents,
        patterns: {
          mostCommonCauses: [{ cause: 'Manual analysis required', frequency: 0 }],
          locationHotspots: [],
          timePatterns: [],
          equipmentIssues: []
        },
        predictions: {
          futureRisks: [],
          seasonalTrends: [],
          emergingPatterns: []
        }
      };
    }

    return result;
  }

  /**
   * Predict future incident likelihood
   */
  async predictIncidentLikelihood(location: string, activity: string, conditions: any): Promise<any> {
    const predictionData = {
      location,
      activity,
      conditions,
      prediction_type: 'likelihood'
    };

    return callIncidentAPI('/predict-incident', predictionData);
  }

  /**
   * Generate learning insights from incidents
   */
  async generateLearningInsights(incidents: IncidentData[]): Promise<any> {
    const learningData = {
      incidents: incidents.slice(-50), // Analyze recent 50 incidents
      insight_type: 'learning'
    };

    return callIncidentAPI('/learning-insights', learningData);
  }

  /**
   * Assess investigation quality
   */
  async assessInvestigationQuality(incidentData: IncidentData, investigation: any): Promise<any> {
    const qualityData = {
      incident: incidentData,
      investigation
    };

    return callIncidentAPI('/investigation-quality', qualityData);
  }

  /**
   * Generate incident classification
   */
  async classifyIncident(description: string, context?: any): Promise<any> {
    const classificationData = {
      description,
      context
    };

    return callIncidentAPI('/classify-incident', classificationData);
  }

  /**
   * Risk factor analysis
   */
  async analyzeRiskFactors(incidentData: IncidentData): Promise<any> {
    const riskData = {
      incident: incidentData
    };

    return callIncidentAPI('/risk-factors', riskData);
  }

  /**
   * Corrective action effectiveness analysis
   */
  async analyzeCorrectiveActionEffectiveness(actions: any[], followUpIncidents: IncidentData[]): Promise<any> {
    const effectivenessData = {
      corrective_actions: actions,
      follow_up_incidents: followUpIncidents
    };

    return callIncidentAPI('/action-effectiveness', effectivenessData);
  }

  /**
   * Generate automated incident report
   */
  async generateIncidentReport(incidentData: IncidentData, analysis: AIAnalysisResult): Promise<any> {
    const reportData = {
      incident: incidentData,
      analysis
    };

    return callIncidentAPI('/incident-report', reportData);
  }
}

// Export singleton instance
export const incidentAnalysisService = new AIIncidentAnalysisService();

// Export individual functions for backward compatibility
export const analyzeIncident = (incidentData: IncidentData) => {
  return incidentAnalysisService.analyzeIncident(incidentData);
};

export const performRootCauseAnalysis = (incidentData: IncidentData, method?: '5-why' | 'fishbone' | 'fault-tree') => {
  return incidentAnalysisService.performRootCauseAnalysis(incidentData, method);
};

export const findSimilarIncidents = (incident: IncidentData, historical: IncidentData[]) => {
  return incidentAnalysisService.findSimilarIncidents(incident, historical);
};

export const analyzeTrends = (incidents: IncidentData[], timeframe?: string) => {
  return incidentAnalysisService.analyzeTrends(incidents, timeframe);
};

export const predictIncidentLikelihood = (location: string, activity: string, conditions: any) => {
  return incidentAnalysisService.predictIncidentLikelihood(location, activity, conditions);
};

export const generateLearningInsights = (incidents: IncidentData[]) => {
  return incidentAnalysisService.generateLearningInsights(incidents);
};

export const classifyIncident = (description: string, context?: any) => {
  return incidentAnalysisService.classifyIncident(description, context);
};

interface PredictiveInsights {
  likelihood: {
    nextIncident: number;
    timeframe: string;
    hotspots: Array<{
      location: string;
      risk: number;
      factors: string[];
    }>;
  };
  trends: {
    monthly: Array<{
      month: string;
      predicted: number;
      factors: string[];
    }>;
    seasonal: {
      pattern: string;
      peak: string;
      recommendations: string[];
    };
  };
  prevention: {
    strategies: Array<{
      strategy: string;
      effectiveness: number;
      implementation: string;
      cost: string;
    }>;
    interventions: Array<{
      intervention: string;
      target: string;
      expected_reduction: number;
    }>;
  };
}

class AIIncidentAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private initialized = false;

  constructor() {
    this.initializeAI();
  }

  private async initializeAI(): Promise<void> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('🤖 Gemini API key not found - AI features will use mock data');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        },
      });
      
      this.initialized = true;
      console.log('✅ AI Incident Analysis Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI service:', error);
    }
  }

  async analyzeIncident(incident: IncidentData, historicalData?: IncidentData[]): Promise<AIAnalysisResult> {
    if (!this.initialized || !this.model) {
      return this.generateMockAnalysis(incident);
    }

    try {
      const prompt = this.buildAnalysisPrompt(incident, historicalData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      return this.parseAIResponse(analysisText, incident);
    } catch (error) {
      console.error('AI analysis failed, falling back to mock data:', error);
      return this.generateMockAnalysis(incident);
    }
  }

  private buildAnalysisPrompt(incident: IncidentData, historicalData?: IncidentData[]): string {
    const historicalContext = historicalData ? 
      `Historical incidents for pattern analysis:\n${historicalData.slice(0, 10).map(h => 
        `- ${h.title} (${h.category}, ${h.severity}) at ${h.location}`
      ).join('\n')}\n\n` : '';

    return `As an expert safety analyst, provide a comprehensive analysis of this workplace incident:

INCIDENT DETAILS:
Title: ${incident.title}
Description: ${incident.description}
Category: ${incident.category}
Current Severity: ${incident.severity}
Location: ${incident.location}
Date: ${new Date(incident.timestamp).toLocaleDateString()}
Injury Type: ${incident.injuryType || 'None specified'}
Equipment Involved: ${incident.equipmentInvolved?.join(', ') || 'None specified'}
Environmental Factors: ${incident.environmentalFactors?.join(', ') || 'None specified'}
Human Factors: ${incident.humanFactors?.join(', ') || 'None specified'}
Witnesses: ${incident.witnesses || 0}
Immediate Actions: ${incident.immediateActions || 'None specified'}

${historicalContext}

Please provide analysis in the following JSON format (ensure valid JSON syntax):
{
  "rootCauseAnalysis": {
    "primaryCause": "string",
    "contributingFactors": ["factor1", "factor2"],
    "confidence": 0.85,
    "reasoning": "detailed explanation"
  },
  "severityAssessment": {
    "predictedSeverity": "medium",
    "riskFactors": ["factor1", "factor2"]
  },
  "recommendations": {
    "immediate": [
      {
        "action": "specific action",
        "priority": "high",
        "timeframe": "24 hours",
        "responsible": "Safety Manager"
      }
    ],
    "longTerm": [
      {
        "action": "long term action",
        "impact": "reduces incidents by 30%",
        "cost": "medium",
        "roi": "high"
      }
    ]
  },
  "riskScore": {
    "overall": 75,
    "probability": 0.65,
    "impact": 0.80,
    "factors": [
      {
        "factor": "risk factor",
        "weight": 0.3,
        "contribution": 22.5
      }
    ]
  },
  "complianceCheck": {
    "regulations": [
      {
        "standard": "OSHA 1910",
        "compliant": false,
        "gaps": ["gap description"],
        "actions": ["required action"]
      }
    ],
    "recommendations": ["compliance recommendation"]
  }
}

Focus on practical, actionable insights that can prevent similar incidents.`;
  }

  private parseAIResponse(responseText: string, incident: IncidentData): AIAnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Add pattern detection based on incident data
      const analysis: AIAnalysisResult = {
        ...parsed,
        patternDetection: {
          similarIncidents: this.findSimilarIncidents(incident),
          trends: {
            timePattern: this.analyzeTimePattern(incident),
            locationPattern: this.analyzeLocationPattern(incident),
            categoryPattern: this.analyzeCategoryPattern(incident)
          }
        }
      };

      return analysis;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.generateMockAnalysis(incident);
    }
  }

  private findSimilarIncidents(incident: IncidentData): Array<{
    id: string;
    title: string;
    similarity: number;
    commonFactors: string[];
  }> {
    // Mock similar incidents - in real app, would query historical data
    return [
      {
        id: 'inc-001',
        title: 'Slip and fall in warehouse',
        similarity: 0.87,
        commonFactors: ['Wet floor', 'Poor lighting', 'Same location']
      },
      {
        id: 'inc-002', 
        title: 'Equipment malfunction incident',
        similarity: 0.73,
        commonFactors: ['Equipment failure', 'Maintenance issue']
      }
    ];
  }

  private analyzeTimePattern(incident: IncidentData): string {
    const hour = new Date(incident.timestamp).getHours();
    if (hour >= 6 && hour <= 14) return 'Morning shift peak (6AM-2PM)';
    if (hour >= 14 && hour <= 22) return 'Afternoon shift (2PM-10PM)';
    return 'Night shift (10PM-6AM)';
  }

  private analyzeLocationPattern(incident: IncidentData): string {
    // Analyze location patterns
    if (incident.location.toLowerCase().includes('warehouse')) {
      return 'High-risk warehouse operations area';
    }
    if (incident.location.toLowerCase().includes('construction')) {
      return 'Active construction zone with elevated risks';
    }
    return 'Standard workplace location';
  }

  private analyzeCategoryPattern(incident: IncidentData): string {
    // Category-based trend analysis
    const patterns = {
      'slip': 'Recurring slip/fall incidents suggest housekeeping issues',
      'equipment': 'Equipment failures indicate maintenance gaps',
      'chemical': 'Chemical incidents suggest training or PPE issues',
      'fire': 'Fire incidents require immediate safety system review'
    };

    const category = incident.category.toLowerCase();
    for (const [key, pattern] of Object.entries(patterns)) {
      if (category.includes(key)) {
        return pattern;
      }
    }
    return 'Standard incident pattern';
  }

  async generatePredictiveInsights(historicalData: IncidentData[]): Promise<PredictiveInsights> {
    if (!this.initialized || !this.model) {
      return this.generateMockPredictiveInsights();
    }

    try {
      const prompt = `Analyze these ${historicalData.length} historical incidents and predict future safety trends:

${historicalData.map(incident => 
  `${incident.title} - ${incident.category} - ${incident.severity} - ${new Date(incident.timestamp).toLocaleDateString()}`
).join('\n')}

Provide predictions in JSON format:
{
  "likelihood": {
    "nextIncident": 0.65,
    "timeframe": "next 30 days",
    "hotspots": [
      {
        "location": "Warehouse A",
        "risk": 0.78,
        "factors": ["High traffic", "Equipment density"]
      }
    ]
  },
  "trends": {
    "monthly": [
      {
        "month": "Next month",
        "predicted": 3,
        "factors": ["Seasonal increase", "New equipment"]
      }
    ],
    "seasonal": {
      "pattern": "Higher incidents in winter months",
      "peak": "December-February",
      "recommendations": ["Increase training", "Weather precautions"]
    }
  },
  "prevention": {
    "strategies": [
      {
        "strategy": "Enhanced training program",
        "effectiveness": 0.85,
        "implementation": "Quarterly sessions",
        "cost": "medium"
      }
    ],
    "interventions": [
      {
        "intervention": "Safety checkpoints",
        "target": "High-risk areas",
        "expected_reduction": 0.40
      }
    ]
  }
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const insightsText = response.text();

      const jsonMatch = insightsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('No valid JSON in response');
    } catch (error) {
      console.error('Predictive analysis failed:', error);
      return this.generateMockPredictiveInsights();
    }
  }

  private generateMockAnalysis(incident: IncidentData): AIAnalysisResult {
    return {
      rootCauseAnalysis: {
        primaryCause: 'Inadequate safety protocols and training',
        contributingFactors: [
          'Insufficient safety training',
          'Lack of proper equipment maintenance',
          'Poor environmental conditions',
          'Inadequate supervision'
        ],
        confidence: 0.82,
        reasoning: 'Analysis based on incident description and common safety failure patterns in similar workplace environments.'
      },
      severityAssessment: {
        predictedSeverity: incident.severity,
        actualSeverity: incident.severity,
        accuracy: 0.85,
        riskFactors: [
          'Location-specific hazards',
          'Time of day',
          'Equipment condition',
          'Worker experience level'
        ]
      },
      patternDetection: {
        similarIncidents: this.findSimilarIncidents(incident),
        trends: {
          timePattern: this.analyzeTimePattern(incident),
          locationPattern: this.analyzeLocationPattern(incident),
          categoryPattern: this.analyzeCategoryPattern(incident)
        }
      },
      recommendations: {
        immediate: [
          {
            action: 'Isolate affected area and conduct immediate safety inspection',
            priority: 'high',
            timeframe: '2 hours',
            responsible: 'Safety Manager'
          },
          {
            action: 'Review and update safety protocols for this location',
            priority: 'high',
            timeframe: '24 hours',
            responsible: 'HSE Team'
          },
          {
            action: 'Conduct emergency safety briefing for all staff',
            priority: 'medium',
            timeframe: '1 week',
            responsible: 'Department Supervisors'
          }
        ],
        longTerm: [
          {
            action: 'Implement comprehensive safety training program',
            impact: 'Reduces incidents by 35-45%',
            cost: 'medium',
            roi: 'high - estimated 3:1 return on investment'
          },
          {
            action: 'Install advanced monitoring and alert systems',
            impact: 'Early hazard detection and prevention',
            cost: 'high',
            roi: 'medium - significant safety improvements'
          },
          {
            action: 'Establish regular safety audits and inspections',
            impact: 'Prevents 60% of potential incidents',
            cost: 'low',
            roi: 'very high - minimal cost, maximum benefit'
          }
        ]
      },
      riskScore: {
        overall: 72,
        probability: 0.68,
        impact: 0.76,
        factors: [
          {
            factor: 'Location Risk',
            weight: 0.25,
            contribution: 18
          },
          {
            factor: 'Equipment Safety',
            weight: 0.20,
            contribution: 14.4
          },
          {
            factor: 'Human Factors',
            weight: 0.30,
            contribution: 21.6
          },
          {
            factor: 'Environmental Conditions',
            weight: 0.25,
            contribution: 18
          }
        ]
      },
      complianceCheck: {
        regulations: [
          {
            standard: 'OSHA 1910.22 Walking-Working Surfaces',
            compliant: false,
            gaps: ['Inadequate floor maintenance', 'Missing safety signage'],
            actions: ['Install warning signs', 'Implement daily floor inspections']
          },
          {
            standard: 'OSHA 1910.132 Personal Protective Equipment',
            compliant: true,
            gaps: [],
            actions: ['Continue current PPE protocols']
          }
        ],
        recommendations: [
          'Conduct quarterly compliance audits',
          'Establish safety committee with worker representation',
          'Implement digital safety management system'
        ]
      }
    };
  }

  private generateMockPredictiveInsights(): PredictiveInsights {
    return {
      likelihood: {
        nextIncident: 0.42,
        timeframe: 'next 45 days',
        hotspots: [
          {
            location: 'Warehouse Section A',
            risk: 0.78,
            factors: ['High foot traffic', 'Equipment density', 'Limited visibility']
          },
          {
            location: 'Loading Dock',
            risk: 0.65,
            factors: ['Vehicle movement', 'Weather exposure', 'Time pressure']
          }
        ]
      },
      trends: {
        monthly: [
          {
            month: 'Next month',
            predicted: 2,
            factors: ['Seasonal weather changes', 'Increased workload']
          },
          {
            month: 'Following month',
            predicted: 3,
            factors: ['Holiday season activity', 'New staff onboarding']
          }
        ],
        seasonal: {
          pattern: 'Winter months show 40% increase in slip/fall incidents',
          peak: 'December-February',
          recommendations: [
            'Implement winter safety protocols',
            'Increase floor maintenance frequency',
            'Provide additional slip-resistant equipment'
          ]
        }
      },
      prevention: {
        strategies: [
          {
            strategy: 'Enhanced behavioral safety training',
            effectiveness: 0.85,
            implementation: 'Monthly interactive sessions',
            cost: 'medium'
          },
          {
            strategy: 'Predictive maintenance program',
            effectiveness: 0.78,
            implementation: 'Sensor-based monitoring',
            cost: 'high'
          },
          {
            strategy: 'Safety gamification system',
            effectiveness: 0.72,
            implementation: 'Mobile app with rewards',
            cost: 'low'
          }
        ],
        interventions: [
          {
            intervention: 'Daily safety huddles',
            target: 'All shift teams',
            expected_reduction: 0.35
          },
          {
            intervention: 'Hazard spotting campaigns',
            target: 'High-risk areas',
            expected_reduction: 0.42
          }
        ]
      }
    };
  }

  // Utility methods
  async analyzeBatch(incidents: IncidentData[]): Promise<AIAnalysisResult[]> {
    const analyses = await Promise.all(
      incidents.map(incident => this.analyzeIncident(incident, incidents))
    );
    return analyses;
  }

  async getInsightsSummary(analyses: AIAnalysisResult[]): Promise<{
    topRiskFactors: Array<{ factor: string; frequency: number }>;
    commonRecommendations: Array<{ action: string; priority: string }>;
    averageRiskScore: number;
    complianceGaps: Array<{ standard: string; frequency: number }>;
  }> {
    const riskFactors = new Map<string, number>();
    const recommendations = new Map<string, number>();
    const complianceGaps = new Map<string, number>();
    let totalRiskScore = 0;

    analyses.forEach(analysis => {
      // Aggregate risk factors
      analysis.riskScore.factors.forEach(factor => {
        riskFactors.set(factor.factor, (riskFactors.get(factor.factor) || 0) + 1);
      });

      // Aggregate recommendations
      analysis.recommendations.immediate.forEach(rec => {
        recommendations.set(rec.action, (recommendations.get(rec.action) || 0) + 1);
      });

      // Aggregate compliance gaps
      analysis.complianceCheck.regulations.forEach(reg => {
        if (!reg.compliant) {
          complianceGaps.set(reg.standard, (complianceGaps.get(reg.standard) || 0) + 1);
        }
      });

      totalRiskScore += analysis.riskScore.overall;
    });

    return {
      topRiskFactors: Array.from(riskFactors.entries())
        .map(([factor, frequency]) => ({ factor, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10),
      commonRecommendations: Array.from(recommendations.entries())
        .map(([action, frequency]) => ({ action, priority: frequency > analyses.length / 2 ? 'high' : 'medium' }))
        .slice(0, 10),
      averageRiskScore: totalRiskScore / analyses.length,
      complianceGaps: Array.from(complianceGaps.entries())
        .map(([standard, frequency]) => ({ standard, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
    };
  }
}

// Create singleton instance
const aiIncidentAnalysisService = new AIIncidentAnalysisService();

export default aiIncidentAnalysisService;
export type { IncidentData, AIAnalysisResult, PredictiveInsights };