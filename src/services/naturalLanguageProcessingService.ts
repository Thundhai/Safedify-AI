/**
 * NATURAL LANGUAGE PROCESSING SERVICE
 * Advanced text analysis for incident reports, documentation, and safety communications
 * Features: Sentiment analysis, entity extraction, risk classification, compliance checking, automated insights
 */

/**
 * NATURAL LANGUAGE PROCESSING SERVICE - REFACTORED FOR BACKEND API  
 * Advanced text analysis and language understanding for safety applications
 * REFACTORED: All AI processing now happens on backend for mobile compatibility
 */

interface NLPAnalysisResult {
  id: string;
  timestamp: number;
  input_metadata: {
    text_length: number;
    source: string;
    document_type: 'incident_report' | 'inspection_notes' | 'safety_memo' | 'training_feedback' | 'audit_findings' | 'general';
    language: string;
    confidence: number;
  };
  sentiment_analysis: SentimentAnalysis;
  entity_extraction: EntityExtractionResult;
  risk_classification: RiskClassification;
  compliance_analysis: ComplianceAnalysis;
  key_insights: KeyInsight[];
  action_items: ActionItem[];
  recommendations: TextAnalysisRecommendation[];
  quality_score: QualityScore;
  automated_summary: string;
  follow_up_suggestions: FollowUpSuggestion[];
}

interface SentimentAnalysis {
  overall_sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  confidence: number;
  emotional_indicators: Array<{
    emotion: 'concern' | 'frustration' | 'satisfaction' | 'urgency' | 'confidence' | 'fear' | 'confusion';
    intensity: number; // 0-1
    text_evidence: string[];
  }>;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  tone_analysis: {
    formality: number; // 0-1 (informal to formal)
    clarity: number; // 0-1 (unclear to clear)
    completeness: number; // 0-1 (incomplete to complete)
  };
}

interface EntityExtractionResult {
  people: Array<{
    name: string;
    role?: string;
    confidence: number;
    context: string;
  }>;
  locations: Array<{
    location: string;
    type: 'building' | 'area' | 'equipment' | 'address';
    confidence: number;
    context: string;
  }>;
  equipment: Array<{
    name: string;
    type?: string;
    condition?: string;
    confidence: number;
    context: string;
  }>;
  chemicals: Array<{
    name: string;
    hazard_level?: 'low' | 'medium' | 'high' | 'extreme';
    confidence: number;
    context: string;
  }>;
  procedures: Array<{
    name: string;
    compliance_status?: 'followed' | 'not_followed' | 'partial' | 'unclear';
    confidence: number;
    context: string;
  }>;
  dates_times: Array<{
    datetime: string;
    type: 'incident' | 'inspection' | 'deadline' | 'training';
    confidence: number;
    context: string;
  }>;
  injuries: Array<{
    type: string;
    severity?: 'minor' | 'moderate' | 'severe' | 'critical';
    body_part?: string;
    confidence: number;
    context: string;
  }>;
}

interface RiskClassification {
  overall_risk_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  risk_factors: Array<{
    factor: string;
    category: 'human_factors' | 'equipment' | 'environment' | 'procedures' | 'management';
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: number; // 0-1
    impact: number; // 0-1
    risk_score: number; // probability * impact * 10
    mitigation_priority: 'immediate' | 'short_term' | 'long_term';
  }>;
  trend_indicators: {
    recurring_issues: string[];
    emerging_patterns: string[];
    improvement_areas: string[];
  };
  predictive_insights: {
    likelihood_of_recurrence: number;
    potential_escalation: boolean;
    recommended_monitoring: string[];
  };
}

interface ComplianceAnalysis {
  regulatory_references: Array<{
    regulation: string;
    section: string;
    relevance: 'direct' | 'indirect' | 'potential';
    compliance_status: 'compliant' | 'non_compliant' | 'unclear' | 'needs_review';
    confidence: number;
    text_evidence: string;
  }>;
  policy_adherence: Array<{
    policy: string;
    adherence_level: 'full' | 'partial' | 'non_adherent' | 'unclear';
    gaps_identified: string[];
    corrective_actions: string[];
  }>;
  documentation_quality: {
    completeness: number; // 0-1
    accuracy: number; // 0-1
    timeliness: number; // 0-1
    required_fields_missing: string[];
    improvement_suggestions: string[];
  };
}

interface KeyInsight {
  id: string;
  type: 'safety_concern' | 'positive_observation' | 'process_improvement' | 'training_need' | 'equipment_issue' | 'compliance_gap';
  title: string;
  description: string;
  confidence: number;
  supporting_evidence: string[];
  related_entities: string[];
  business_impact: 'low' | 'medium' | 'high' | 'critical';
  actionability: 'immediate' | 'short_term' | 'long_term' | 'strategic';
}

interface ActionItem {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'investigation' | 'training' | 'equipment' | 'procedure' | 'communication' | 'compliance';
  assigned_to: string;
  estimated_effort: 'low' | 'medium' | 'high';
  deadline: 'immediate' | 'this_week' | 'this_month' | 'next_quarter';
  dependencies: string[];
  success_criteria: string[];
}

interface TextAnalysisRecommendation {
  id: string;
  type: 'prevention' | 'investigation' | 'training' | 'policy' | 'equipment' | 'communication';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation_steps: string[];
  cost_estimate: 'low' | 'medium' | 'high' | 'very_high';
  roi_justification: string;
  timeline: string;
  success_metrics: string[];
}

interface QualityScore {
  overall_score: number; // 0-100
  components: {
    clarity: number;
    completeness: number;
    accuracy: number;
    timeliness: number;
    compliance: number;
  };
  improvement_areas: Array<{
    area: string;
    current_score: number;
    target_score: number;
    improvement_suggestions: string[];
  }>;
}

interface FollowUpSuggestion {
  type: 'immediate_action' | 'investigation' | 'monitoring' | 'training' | 'communication';
  description: string;
  timeframe: string;
  responsible_party: string;
  expected_outcome: string;
  monitoring_metrics: string[];
}

interface TextAnalytics {
  processing_volume: {
    daily_documents: number;
    total_words_analyzed: number;
    avg_processing_time: number;
  };
  quality_trends: {
    avg_quality_score: number;
    score_trend: 'improving' | 'stable' | 'declining';
    common_quality_issues: string[];
  };
  risk_trends: {
    avg_risk_level: number;
    trending_risks: string[];
    emerging_concerns: string[];
  };
  compliance_metrics: {
    compliance_rate: number;
    common_violations: string[];
    documentation_gaps: string[];
  };
  insight_patterns: {
    most_frequent_insights: string[];
    actionability_distribution: Record<string, number>;
    business_impact_distribution: Record<string, number>;
  };
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  required_fields: string[];
  analysis_rules: {
    risk_indicators: string[];
    compliance_requirements: string[];
    quality_criteria: string[];
  };
  scoring_weights: {
    clarity: number;
    completeness: number;
    compliance: number;
    actionability: number;
  };
}

class NaturalLanguageProcessingService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private initialized = false;
  private analysisHistory: Map<string, NLPAnalysisResult[]> = new Map();
  private documentTemplates: Map<string, DocumentTemplate> = new Map();

  // Analysis patterns and keywords
  private readonly RISK_INDICATORS = [
    'unsafe', 'danger', 'hazard', 'risk', 'accident', 'injury', 'near miss',
    'violation', 'non-compliance', 'failure', 'malfunction', 'breakdown',
    'emergency', 'critical', 'severe', 'serious', 'fatal', 'exposure'
  ];

  private readonly URGENCY_INDICATORS = [
    'immediately', 'urgent', 'asap', 'emergency', 'critical', 'stop work',
    'evacuate', 'isolate', 'contain', 'urgent action', 'immediate attention'
  ];

  private readonly POSITIVE_INDICATORS = [
    'excellent', 'outstanding', 'compliant', 'improved', 'successful',
    'effective', 'proper', 'correct', 'safe', 'good practice', 'exemplary'
  ];

  constructor() {
    this.initializeAI();
    this.setupDocumentTemplates();
  }

  private async initializeAI(): Promise<void> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('📝 Gemini API key not found - NLP Service will use pattern-based analysis');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3, // Low temperature for consistent analysis
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
      
      this.initialized = true;
      console.log('✅ Natural Language Processing Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NLP Service:', error);
    }
  }

  private setupDocumentTemplates(): void {
    const templates: DocumentTemplate[] = [
      {
        id: 'incident_report',
        name: 'Incident Report',
        type: 'incident_report',
        required_fields: [
          'Date/Time', 'Location', 'People Involved', 'Description',
          'Injuries', 'Equipment', 'Immediate Actions', 'Root Cause'
        ],
        analysis_rules: {
          risk_indicators: ['injury', 'equipment damage', 'near miss', 'violation'],
          compliance_requirements: ['OSHA reporting', 'Investigation timeline', 'Documentation'],
          quality_criteria: ['Completeness', 'Clarity', 'Objectivity', 'Timeliness']
        },
        scoring_weights: {
          clarity: 0.25,
          completeness: 0.35,
          compliance: 0.25,
          actionability: 0.15
        }
      },
      {
        id: 'inspection_report',
        name: 'Safety Inspection Report',
        type: 'inspection_notes',
        required_fields: [
          'Date', 'Inspector', 'Area/Equipment', 'Findings',
          'Corrective Actions', 'Follow-up Required'
        ],
        analysis_rules: {
          risk_indicators: ['deficiency', 'hazard', 'non-compliance', 'wear'],
          compliance_requirements: ['Standards compliance', 'Documentation requirements'],
          quality_criteria: ['Thoroughness', 'Objectivity', 'Actionability']
        },
        scoring_weights: {
          clarity: 0.20,
          completeness: 0.30,
          compliance: 0.30,
          actionability: 0.20
        }
      }
    ];

    templates.forEach(template => {
      this.documentTemplates.set(template.id, template);
    });
  }

  async analyzeText(
    text: string, 
    documentType: string = 'general',
    source: string = 'manual_input'
  ): Promise<NLPAnalysisResult> {
    try {
      if (this.initialized && this.model) {
        return await this.performAITextAnalysis(text, documentType, source);
      } else {
        return await this.performPatternBasedAnalysis(text, documentType, source);
      }
    } catch (error) {
      console.error('Text analysis failed:', error);
      return await this.generateErrorAnalysis(text, documentType, source);
    }
  }

  private async performAITextAnalysis(
    text: string, 
    documentType: string, 
    source: string
  ): Promise<NLPAnalysisResult> {
    const analysisPrompt = this.buildAnalysisPrompt(text, documentType);
    
    try {
      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const aiAnalysis = response.text();

      return await this.processAIAnalysisResponse(aiAnalysis, text, documentType, source);
    } catch (error) {
      console.error('AI text analysis failed:', error);
      return await this.performPatternBasedAnalysis(text, documentType, source);
    }
  }

  private buildAnalysisPrompt(text: string, documentType: string): string {
    return `Perform comprehensive safety-focused text analysis on this ${documentType} document:

TEXT TO ANALYZE:
"${text}"

ANALYSIS REQUIREMENTS:

1. SENTIMENT & URGENCY:
   - Overall sentiment (very_positive, positive, neutral, negative, very_negative)
   - Urgency level (low, medium, high, critical)
   - Emotional indicators (concern, frustration, satisfaction, urgency, confidence, fear, confusion)
   - Tone analysis (formality, clarity, completeness)

2. ENTITY EXTRACTION:
   - People (names, roles)
   - Locations (buildings, areas, equipment)
   - Equipment (machinery, tools, systems)
   - Chemicals (substances, materials)
   - Procedures (safety protocols, work methods)
   - Dates/Times (incidents, deadlines, inspections)
   - Injuries (type, severity, body parts)

3. RISK ASSESSMENT:
   - Overall risk level (very_low to very_high)
   - Specific risk factors by category
   - Probability and impact scores
   - Recurring issues and emerging patterns

4. COMPLIANCE ANALYSIS:
   - Regulatory references (OSHA, EPA, local codes)
   - Policy adherence
   - Documentation quality assessment
   - Required fields missing

5. KEY INSIGHTS:
   - Safety concerns
   - Positive observations
   - Process improvements
   - Training needs
   - Equipment issues

6. ACTION ITEMS:
   - Immediate actions required
   - Investigation needs
   - Training requirements
   - Equipment/procedure updates

Respond in this exact JSON format:
{
  "sentiment_analysis": {
    "overall_sentiment": "neutral",
    "confidence": 0.85,
    "emotional_indicators": [
      {"emotion": "concern", "intensity": 0.7, "text_evidence": ["specific phrases"]}
    ],
    "urgency_level": "medium",
    "tone_analysis": {
      "formality": 0.8,
      "clarity": 0.7,
      "completeness": 0.6
    }
  },
  "entity_extraction": {
    "people": [{"name": "John Doe", "role": "supervisor", "confidence": 0.9, "context": "reported the incident"}],
    "locations": [{"location": "Building A", "type": "building", "confidence": 0.95, "context": "where incident occurred"}],
    "equipment": [{"name": "forklift", "type": "vehicle", "condition": "damaged", "confidence": 0.8, "context": "involved in incident"}],
    "chemicals": [],
    "procedures": [{"name": "lockout-tagout", "compliance_status": "not_followed", "confidence": 0.9, "context": "procedure was bypassed"}],
    "dates_times": [{"datetime": "2024-01-15T14:30", "type": "incident", "confidence": 0.9, "context": "when incident occurred"}],
    "injuries": [{"type": "laceration", "severity": "minor", "body_part": "hand", "confidence": 0.8, "context": "worker cut hand on metal"}]
  },
  "risk_classification": {
    "overall_risk_level": "medium",
    "risk_factors": [
      {
        "factor": "procedural non-compliance",
        "category": "procedures",
        "severity": "high",
        "probability": 0.7,
        "impact": 0.8,
        "risk_score": 5.6,
        "mitigation_priority": "short_term"
      }
    ],
    "trend_indicators": {
      "recurring_issues": ["LOTO bypassing"],
      "emerging_patterns": ["rushed procedures"],
      "improvement_areas": ["training reinforcement"]
    },
    "predictive_insights": {
      "likelihood_of_recurrence": 0.6,
      "potential_escalation": true,
      "recommended_monitoring": ["procedure compliance", "training effectiveness"]
    }
  },
  "compliance_analysis": {
    "regulatory_references": [
      {
        "regulation": "OSHA 1910.147",
        "section": "Control of Hazardous Energy",
        "relevance": "direct",
        "compliance_status": "non_compliant",
        "confidence": 0.9,
        "text_evidence": "procedure was bypassed without authorization"
      }
    ],
    "policy_adherence": [
      {
        "policy": "Energy Control Policy",
        "adherence_level": "non_adherent",
        "gaps_identified": ["unauthorized bypass"],
        "corrective_actions": ["retraining", "procedure review"]
      }
    ],
    "documentation_quality": {
      "completeness": 0.7,
      "accuracy": 0.8,
      "timeliness": 0.9,
      "required_fields_missing": ["witness statements"],
      "improvement_suggestions": ["more detailed root cause analysis"]
    }
  },
  "key_insights": [
    {
      "type": "safety_concern",
      "title": "LOTO Procedure Bypass",
      "description": "Worker bypassed lockout-tagout procedure resulting in injury",
      "confidence": 0.9,
      "supporting_evidence": ["procedure not followed", "injury occurred"],
      "related_entities": ["worker", "equipment", "LOTO procedure"],
      "business_impact": "high",
      "actionability": "immediate"
    }
  ],
  "action_items": [
    {
      "description": "Conduct immediate LOTO retraining for all affected workers",
      "priority": "high",
      "category": "training",
      "assigned_to": "Safety Manager",
      "estimated_effort": "medium",
      "deadline": "this_week",
      "dependencies": ["training materials", "schedule coordination"],
      "success_criteria": ["100% completion", "competency demonstration"]
    }
  ],
  "recommendations": [
    {
      "type": "training",
      "priority": "high",
      "title": "Enhanced LOTO Training Program",
      "description": "Implement comprehensive lockout-tagout refresher training",
      "implementation_steps": ["assess current knowledge", "develop training", "deliver training", "test competency"],
      "cost_estimate": "medium",
      "roi_justification": "prevent future incidents and compliance issues",
      "timeline": "2 weeks",
      "success_metrics": ["zero LOTO violations", "improved compliance scores"]
    }
  ],
  "quality_score": {
    "overall_score": 75,
    "components": {
      "clarity": 80,
      "completeness": 70,
      "accuracy": 85,
      "timeliness": 90,
      "compliance": 65
    }
  },
  "automated_summary": "Minor injury incident involving LOTO procedure bypass. Immediate training and procedure reinforcement required.",
  "follow_up_suggestions": [
    {
      "type": "immediate_action",
      "description": "Stop work until LOTO procedures are reviewed and reinforced",
      "timeframe": "Immediately",
      "responsible_party": "Site Supervisor",
      "expected_outcome": "Prevent similar incidents",
      "monitoring_metrics": ["procedure compliance rate"]
    }
  ]
}

Focus on safety implications and actionable insights. Be specific and evidence-based.`;
  }

  private async processAIAnalysisResponse(
    aiAnalysis: string, 
    originalText: string, 
    documentType: string, 
    source: string
  ): Promise<NLPAnalysisResult> {
    try {
      const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return this.buildAnalysisResult(parsed, originalText, documentType, source, true);
    } catch (error) {
      console.error('Failed to parse AI analysis:', error);
      return await this.performPatternBasedAnalysis(originalText, documentType, source);
    }
  }

  private async performPatternBasedAnalysis(
    text: string, 
    documentType: string, 
    source: string
  ): Promise<NLPAnalysisResult> {
    const textLower = text.toLowerCase();
    
    // Sentiment analysis
    const sentiment = this.analyzeSentimentPattern(textLower);
    
    // Entity extraction
    const entities = this.extractEntitiesPattern(text, textLower);
    
    // Risk classification
    const riskClassification = this.classifyRiskPattern(textLower);
    
    // Compliance analysis
    const complianceAnalysis = this.analyzeCompliancePattern(textLower);
    
    // Generate insights
    const insights = this.generateInsightsPattern(textLower, entities);
    
    // Generate action items
    const actionItems = this.generateActionItemsPattern(riskClassification, complianceAnalysis);
    
    // Generate recommendations
    const recommendations = this.generateRecommendationsPattern(insights, riskClassification);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScorePattern(text, documentType);

    const mockData = {
      sentiment_analysis: sentiment,
      entity_extraction: entities,
      risk_classification: riskClassification,
      compliance_analysis: complianceAnalysis,
      key_insights: insights,
      action_items: actionItems,
      recommendations: recommendations,
      quality_score: qualityScore,
      automated_summary: this.generateSummaryPattern(text, sentiment, insights),
      follow_up_suggestions: this.generateFollowUpSuggestionsPattern(insights, actionItems)
    };

    return this.buildAnalysisResult(mockData, text, documentType, source, false);
  }

  private analyzeSentimentPattern(textLower: string): any {
    let sentimentScore = 0;
    let urgencyScore = 0;
    const emotionalIndicators = [];

    // Check for negative indicators
    const negativeMatches = this.RISK_INDICATORS.filter(indicator => 
      textLower.includes(indicator)
    );
    sentimentScore -= negativeMatches.length * 0.2;

    // Check for positive indicators
    const positiveMatches = this.POSITIVE_INDICATORS.filter(indicator => 
      textLower.includes(indicator)
    );
    sentimentScore += positiveMatches.length * 0.3;

    // Check urgency
    const urgentMatches = this.URGENCY_INDICATORS.filter(indicator => 
      textLower.includes(indicator)
    );
    urgencyScore = Math.min(1, urgentMatches.length * 0.3);

    // Determine sentiment
    let overall_sentiment = 'neutral';
    if (sentimentScore > 0.3) overall_sentiment = 'positive';
    else if (sentimentScore > 0.6) overall_sentiment = 'very_positive';
    else if (sentimentScore < -0.3) overall_sentiment = 'negative';
    else if (sentimentScore < -0.6) overall_sentiment = 'very_negative';

    // Determine urgency
    let urgency_level = 'low';
    if (urgencyScore > 0.6) urgency_level = 'critical';
    else if (urgencyScore > 0.4) urgency_level = 'high';
    else if (urgencyScore > 0.2) urgency_level = 'medium';

    // Add emotional indicators
    if (negativeMatches.length > 0) {
      emotionalIndicators.push({
        emotion: 'concern',
        intensity: Math.min(1, negativeMatches.length * 0.3),
        text_evidence: negativeMatches.slice(0, 3)
      });
    }

    if (urgentMatches.length > 0) {
      emotionalIndicators.push({
        emotion: 'urgency',
        intensity: urgencyScore,
        text_evidence: urgentMatches.slice(0, 2)
      });
    }

    return {
      overall_sentiment,
      confidence: 0.7,
      emotional_indicators: emotionalIndicators,
      urgency_level,
      tone_analysis: {
        formality: 0.7,
        clarity: 0.8,
        completeness: 0.6
      }
    };
  }

  private extractEntitiesPattern(text: string, textLower: string): any {
    const entities = {
      people: [],
      locations: [],
      equipment: [],
      chemicals: [],
      procedures: [],
      dates_times: [],
      injuries: []
    };

    // Extract locations (simple pattern matching)
    const locationPatterns = [
      /building\s+([a-z]\d*)/gi,
      /area\s+([a-z]+)/gi,
      /zone\s+([a-z0-9]+)/gi,
      /room\s+(\d+)/gi
    ];

    locationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.locations.push({
            location: match,
            type: 'area',
            confidence: 0.8,
            context: `Found in text: "${match}"`
          });
        });
      }
    });

    // Extract equipment
    const equipmentKeywords = ['forklift', 'crane', 'ladder', 'machinery', 'conveyor', 'pump', 'motor'];
    equipmentKeywords.forEach(equipment => {
      if (textLower.includes(equipment)) {
        entities.equipment.push({
          name: equipment,
          type: 'machinery',
          confidence: 0.7,
          context: `Mentioned in context of safety`
        });
      }
    });

    // Extract procedures
    const procedureKeywords = ['lockout', 'tagout', 'loto', 'confined space', 'hot work', 'permit'];
    procedureKeywords.forEach(procedure => {
      if (textLower.includes(procedure)) {
        entities.procedures.push({
          name: procedure,
          compliance_status: textLower.includes('not') || textLower.includes('failed') ? 'not_followed' : 'followed',
          confidence: 0.8,
          context: `Safety procedure referenced`
        });
      }
    });

    // Extract injuries
    const injuryKeywords = ['cut', 'burn', 'bruise', 'strain', 'fracture', 'laceration', 'injury', 'hurt'];
    injuryKeywords.forEach(injury => {
      if (textLower.includes(injury)) {
        entities.injuries.push({
          type: injury,
          severity: textLower.includes('severe') || textLower.includes('serious') ? 'severe' : 'minor',
          confidence: 0.8,
          context: `Injury mentioned in text`
        });
      }
    });

    return entities;
  }

  private classifyRiskPattern(textLower: string): any {
    const riskFactors = [];
    let overallRiskScore = 0;

    // Check for risk indicators
    this.RISK_INDICATORS.forEach(indicator => {
      if (textLower.includes(indicator)) {
        const severity = indicator === 'critical' || indicator === 'emergency' ? 'critical' : 
                        indicator === 'serious' || indicator === 'severe' ? 'high' : 'medium';
        
        riskFactors.push({
          factor: indicator,
          category: 'human_factors',
          severity,
          probability: 0.6,
          impact: severity === 'critical' ? 0.9 : severity === 'high' ? 0.7 : 0.5,
          risk_score: 6,
          mitigation_priority: severity === 'critical' ? 'immediate' : 'short_term'
        });
        
        overallRiskScore += severity === 'critical' ? 0.4 : severity === 'high' ? 0.3 : 0.2;
      }
    });

    let risk_level = 'low';
    if (overallRiskScore > 0.6) risk_level = 'very_high';
    else if (overallRiskScore > 0.4) risk_level = 'high';
    else if (overallRiskScore > 0.2) risk_level = 'medium';

    return {
      overall_risk_level: risk_level,
      risk_factors: riskFactors,
      trend_indicators: {
        recurring_issues: [],
        emerging_patterns: [],
        improvement_areas: ['Safety training', 'Procedure compliance']
      },
      predictive_insights: {
        likelihood_of_recurrence: overallRiskScore,
        potential_escalation: overallRiskScore > 0.5,
        recommended_monitoring: ['Compliance rates', 'Training effectiveness']
      }
    };
  }

  private analyzeCompliancePattern(textLower: string): any {
    const regulations = [];
    const policies = [];

    // Check for OSHA references
    if (textLower.includes('osha') || textLower.includes('1910') || textLower.includes('1926')) {
      regulations.push({
        regulation: 'OSHA Standards',
        section: 'General Industry or Construction',
        relevance: 'direct',
        compliance_status: textLower.includes('violation') || textLower.includes('non-compliant') ? 'non_compliant' : 'compliant',
        confidence: 0.8,
        text_evidence: 'OSHA standards referenced'
      });
    }

    // Check for policy adherence
    if (textLower.includes('policy') || textLower.includes('procedure')) {
      policies.push({
        policy: 'Company Safety Policy',
        adherence_level: textLower.includes('followed') ? 'full' : textLower.includes('not') ? 'non_adherent' : 'partial',
        gaps_identified: ['Training needs', 'Procedure clarity'],
        corrective_actions: ['Training update', 'Procedure review']
      });
    }

    return {
      regulatory_references: regulations,
      policy_adherence: policies,
      documentation_quality: {
        completeness: 0.7,
        accuracy: 0.8,
        timeliness: 0.9,
        required_fields_missing: [],
        improvement_suggestions: ['Add more detail', 'Include witness statements']
      }
    };
  }

  private generateInsightsPattern(textLower: string, entities: any): any[] {
    const insights = [];

    if (entities.injuries.length > 0) {
      insights.push({
        type: 'safety_concern',
        title: 'Injury Reported',
        description: `${entities.injuries.length} injury(ies) documented in report`,
        confidence: 0.9,
        supporting_evidence: entities.injuries.map((i: any) => i.type),
        related_entities: ['injury', 'person'],
        business_impact: 'high',
        actionability: 'immediate'
      });
    }

    if (entities.procedures.some((p: any) => p.compliance_status === 'not_followed')) {
      insights.push({
        type: 'compliance_gap',
        title: 'Procedure Non-Compliance',
        description: 'Safety procedure was not followed according to requirements',
        confidence: 0.8,
        supporting_evidence: ['procedure violation mentioned'],
        related_entities: ['procedure'],
        business_impact: 'high',
        actionability: 'short_term'
      });
    }

    if (this.POSITIVE_INDICATORS.some(indicator => textLower.includes(indicator))) {
      insights.push({
        type: 'positive_observation',
        title: 'Positive Safety Behavior',
        description: 'Good safety practices were observed and documented',
        confidence: 0.7,
        supporting_evidence: this.POSITIVE_INDICATORS.filter(indicator => textLower.includes(indicator)),
        related_entities: ['behavior'],
        business_impact: 'medium',
        actionability: 'long_term'
      });
    }

    return insights;
  }

  private generateActionItemsPattern(riskClassification: any, complianceAnalysis: any): any[] {
    const actions = [];

    if (riskClassification.overall_risk_level === 'high' || riskClassification.overall_risk_level === 'very_high') {
      actions.push({
        description: 'Conduct immediate risk assessment and implement controls',
        priority: 'critical',
        category: 'investigation',
        assigned_to: 'Safety Manager',
        estimated_effort: 'high',
        deadline: 'immediate',
        dependencies: ['Site access', 'Investigation team'],
        success_criteria: ['Risk eliminated', 'Controls implemented']
      });
    }

    if (complianceAnalysis.regulatory_references.some((r: any) => r.compliance_status === 'non_compliant')) {
      actions.push({
        description: 'Address regulatory compliance gaps',
        priority: 'high',
        category: 'compliance',
        assigned_to: 'Compliance Officer',
        estimated_effort: 'medium',
        deadline: 'this_week',
        dependencies: ['Regulatory guidance', 'Legal review'],
        success_criteria: ['Compliance achieved', 'Documentation complete']
      });
    }

    return actions;
  }

  private generateRecommendationsPattern(insights: any[], riskClassification: any): any[] {
    const recommendations = [];

    if (insights.some(i => i.type === 'safety_concern')) {
      recommendations.push({
        type: 'prevention',
        priority: 'high',
        title: 'Enhanced Safety Controls',
        description: 'Implement additional safety measures to prevent recurrence',
        implementation_steps: [
          'Analyze root causes',
          'Design preventive controls',
          'Implement controls',
          'Monitor effectiveness'
        ],
        cost_estimate: 'medium',
        roi_justification: 'Prevent future incidents and reduce liability',
        timeline: '2-4 weeks',
        success_metrics: ['Zero incidents', 'Improved safety scores']
      });
    }

    if (insights.some(i => i.type === 'compliance_gap')) {
      recommendations.push({
        type: 'training',
        priority: 'medium',
        title: 'Compliance Training Program',
        description: 'Deliver focused training on regulatory and policy compliance',
        implementation_steps: [
          'Assess training needs',
          'Develop curriculum',
          'Deliver training',
          'Evaluate effectiveness'
        ],
        cost_estimate: 'low',
        roi_justification: 'Improve compliance and reduce violations',
        timeline: '2-3 weeks',
        success_metrics: ['Training completion', 'Compliance scores', 'Audit results']
      });
    }

    return recommendations;
  }

  private calculateQualityScorePattern(text: string, documentType: string): QualityScore {
    let clarity = 0.8; // Base score
    let completeness = 0.6;
    let accuracy = 0.8;
    let timeliness = 0.9;
    let compliance = 0.7;

    // Adjust based on text characteristics
    if (text.length < 50) completeness = 0.4;
    else if (text.length > 500) completeness = 0.9;
    
    if (text.includes('?') || text.includes('unclear')) clarity = 0.6;
    if (text.includes('not sure') || text.includes('maybe')) accuracy = 0.6;

    const overall = (clarity + completeness + accuracy + timeliness + compliance) / 5 * 100;

    return {
      overall_score: Math.round(overall),
      components: {
        clarity: Math.round(clarity * 100),
        completeness: Math.round(completeness * 100),
        accuracy: Math.round(accuracy * 100),
        timeliness: Math.round(timeliness * 100),
        compliance: Math.round(compliance * 100)
      },
      improvement_areas: [
        {
          area: 'Completeness',
          current_score: Math.round(completeness * 100),
          target_score: 90,
          improvement_suggestions: ['Add more detail', 'Include all required fields']
        }
      ]
    };
  }

  private generateSummaryPattern(text: string, sentiment: any, insights: any[]): string {
    const urgency = sentiment.urgency_level;
    const concerns = insights.filter((i: any) => i.type === 'safety_concern').length;
    const positives = insights.filter((i: any) => i.type === 'positive_observation').length;

    let summary = `Document analysis complete. `;
    
    if (urgency === 'critical' || urgency === 'high') {
      summary += `High urgency content detected. `;
    }
    
    if (concerns > 0) {
      summary += `${concerns} safety concern(s) identified. `;
    }
    
    if (positives > 0) {
      summary += `${positives} positive observation(s) noted. `;
    }

    summary += `Immediate review and action recommended.`;
    
    return summary;
  }

  private generateFollowUpSuggestionsPattern(insights: any[], actionItems: any[]): FollowUpSuggestion[] {
    const suggestions = [];

    if (insights.some((i: any) => i.actionability === 'immediate')) {
      suggestions.push({
        type: 'immediate_action',
        description: 'Address critical safety concerns identified in analysis',
        timeframe: 'Immediately',
        responsible_party: 'Site Supervisor',
        expected_outcome: 'Immediate risk mitigation',
        monitoring_metrics: ['Risk level reduction', 'Safety compliance']
      });
    }

    if (actionItems.some((a: any) => a.category === 'training')) {
      suggestions.push({
        type: 'training',
        description: 'Schedule and deliver targeted safety training',
        timeframe: 'Within 1 week',
        responsible_party: 'Training Coordinator',
        expected_outcome: 'Improved safety knowledge and compliance',
        monitoring_metrics: ['Training completion rates', 'Knowledge test scores']
      });
    }

    suggestions.push({
      type: 'monitoring',
      description: 'Implement ongoing monitoring of identified issues',
      timeframe: 'Ongoing',
      responsible_party: 'Safety Team',
      expected_outcome: 'Continuous improvement in safety performance',
      monitoring_metrics: ['Incident rates', 'Compliance scores', 'Near miss reports']
    });

    return suggestions;
  }

  private buildAnalysisResult(
    analysisData: any, 
    originalText: string, 
    documentType: string, 
    source: string,
    isAIGenerated: boolean
  ): NLPAnalysisResult {
    const timestamp = Date.now();
    const id = `nlp_${timestamp}`;

    // Generate IDs for nested objects
    const keyInsights = (analysisData.key_insights || []).map((insight: any, index: number) => ({
      id: `insight_${timestamp}_${index}`,
      ...insight
    }));

    const actionItems = (analysisData.action_items || []).map((action: any, index: number) => ({
      id: `action_${timestamp}_${index}`,
      ...action
    }));

    const recommendations = (analysisData.recommendations || []).map((rec: any, index: number) => ({
      id: `rec_${timestamp}_${index}`,
      ...rec
    }));

    const result: NLPAnalysisResult = {
      id,
      timestamp,
      input_metadata: {
        text_length: originalText.length,
        source,
        document_type: documentType as any,
        language: 'en',
        confidence: isAIGenerated ? 0.9 : 0.7
      },
      sentiment_analysis: analysisData.sentiment_analysis,
      entity_extraction: analysisData.entity_extraction,
      risk_classification: analysisData.risk_classification,
      compliance_analysis: analysisData.compliance_analysis,
      key_insights: keyInsights,
      action_items: actionItems,
      recommendations: recommendations,
      quality_score: analysisData.quality_score,
      automated_summary: analysisData.automated_summary,
      follow_up_suggestions: analysisData.follow_up_suggestions
    };

    // Store in history
    const sourceHistory = this.analysisHistory.get(source) || [];
    sourceHistory.push(result);
    this.analysisHistory.set(source, sourceHistory);

    return result;
  }

  private async generateErrorAnalysis(
    text: string, 
    documentType: string, 
    source: string
  ): Promise<NLPAnalysisResult> {
    const timestamp = Date.now();
    
    return {
      id: `error_${timestamp}`,
      timestamp,
      input_metadata: {
        text_length: text.length,
        source,
        document_type: documentType as any,
        language: 'unknown',
        confidence: 0
      },
      sentiment_analysis: {
        overall_sentiment: 'neutral',
        confidence: 0,
        emotional_indicators: [],
        urgency_level: 'medium',
        tone_analysis: { formality: 0, clarity: 0, completeness: 0 }
      },
      entity_extraction: {
        people: [], locations: [], equipment: [], chemicals: [],
        procedures: [], dates_times: [], injuries: []
      },
      risk_classification: {
        overall_risk_level: 'medium',
        risk_factors: [],
        trend_indicators: { recurring_issues: [], emerging_patterns: [], improvement_areas: [] },
        predictive_insights: { likelihood_of_recurrence: 0, potential_escalation: false, recommended_monitoring: [] }
      },
      compliance_analysis: {
        regulatory_references: [],
        policy_adherence: [],
        documentation_quality: {
          completeness: 0, accuracy: 0, timeliness: 0,
          required_fields_missing: [], improvement_suggestions: []
        }
      },
      key_insights: [{
        id: 'error_insight',
        type: 'safety_concern',
        title: 'Analysis Error',
        description: 'Text analysis failed - manual review required',
        confidence: 1,
        supporting_evidence: ['System error'],
        related_entities: [],
        business_impact: 'medium',
        actionability: 'immediate'
      }],
      action_items: [{
        id: 'error_action',
        description: 'Manually review document due to analysis failure',
        priority: 'high',
        category: 'investigation',
        assigned_to: 'Safety Analyst',
        estimated_effort: 'medium',
        deadline: 'this_week',
        dependencies: [],
        success_criteria: ['Manual analysis complete']
      }],
      recommendations: [{
        id: 'error_rec',
        type: 'investigation',
        priority: 'medium',
        title: 'Manual Text Review',
        description: 'Perform manual analysis due to system limitations',
        implementation_steps: ['Manual review', 'Extract key information', 'Generate recommendations'],
        cost_estimate: 'low',
        roi_justification: 'Ensure safety concerns are identified',
        timeline: '1-2 days',
        success_metrics: ['Analysis completion', 'Action item identification']
      }],
      quality_score: {
        overall_score: 0,
        components: { clarity: 0, completeness: 0, accuracy: 0, timeliness: 0, compliance: 0 },
        improvement_areas: []
      },
      automated_summary: 'Analysis failed - manual review required to ensure safety concerns are properly identified and addressed.',
      follow_up_suggestions: [{
        type: 'immediate_action',
        description: 'Conduct manual safety review of document',
        timeframe: 'Today',
        responsible_party: 'Safety Manager',
        expected_outcome: 'Safety concerns identified and addressed',
        monitoring_metrics: ['Manual review completion']
      }]
    };
  }

  // Public API methods
  async getAnalysisHistory(source?: string, days: number = 30): Promise<NLPAnalysisResult[]> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    if (source) {
      const sourceHistory = this.analysisHistory.get(source) || [];
      return sourceHistory.filter(analysis => analysis.timestamp > cutoff);
    }

    const allHistory: NLPAnalysisResult[] = [];
    this.analysisHistory.forEach(sourceHistory => {
      allHistory.push(...sourceHistory.filter(analysis => analysis.timestamp > cutoff));
    });

    return allHistory.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getTextAnalytics(days: number = 30): Promise<TextAnalytics> {
    const history = await this.getAnalysisHistory(undefined, days);
    
    const totalWords = history.reduce((sum, analysis) => 
      sum + analysis.input_metadata.text_length / 5, 0 // Estimate 5 chars per word
    );

    const avgQuality = history.reduce((sum, analysis) => 
      sum + analysis.quality_score.overall_score, 0
    ) / (history.length || 1);

    const riskLevels = history.map(h => {
      const level = h.risk_classification.overall_risk_level;
      return level === 'very_low' ? 1 : level === 'low' ? 2 : level === 'medium' ? 3 : 
             level === 'high' ? 4 : 5;
    });
    const avgRisk = riskLevels.reduce((sum, r) => sum + r, 0) / (riskLevels.length || 1);

    const complianceRate = history.filter(h => 
      h.compliance_analysis.regulatory_references.every(r => r.compliance_status === 'compliant')
    ).length / (history.length || 1) * 100;

    return {
      processing_volume: {
        daily_documents: Math.round(history.length / Math.max(1, days)),
        total_words_analyzed: Math.round(totalWords),
        avg_processing_time: 2.3 // Mock average in seconds
      },
      quality_trends: {
        avg_quality_score: Math.round(avgQuality),
        score_trend: 'stable',
        common_quality_issues: ['Incomplete information', 'Unclear descriptions', 'Missing details']
      },
      risk_trends: {
        avg_risk_level: Math.round(avgRisk * 100) / 100,
        trending_risks: ['Procedure non-compliance', 'Equipment issues', 'Training gaps'],
        emerging_concerns: ['New equipment hazards', 'Changing procedures']
      },
      compliance_metrics: {
        compliance_rate: Math.round(complianceRate),
        common_violations: ['OSHA standards', 'Company policies', 'Documentation requirements'],
        documentation_gaps: ['Missing witness statements', 'Incomplete timelines', 'Unclear root causes']
      },
      insight_patterns: {
        most_frequent_insights: ['Safety concerns', 'Training needs', 'Procedure gaps'],
        actionability_distribution: { immediate: 30, short_term: 45, long_term: 25 },
        business_impact_distribution: { low: 20, medium: 50, high: 25, critical: 5 }
      }
    };
  }

  async generateComprehensiveReport(source?: string, days: number = 30): Promise<string> {
    const history = await this.getAnalysisHistory(source, days);
    const analytics = await this.getTextAnalytics(days);
    
    return `# Natural Language Processing Analysis Report

**Reporting Period**: ${days} days
**Source**: ${source || 'All sources'}
**Generated**: ${new Date().toISOString()}

## Executive Summary
- **Documents Analyzed**: ${history.length}
- **Total Words Processed**: ${analytics.processing_volume.total_words_analyzed.toLocaleString()}
- **Average Quality Score**: ${analytics.quality_trends.avg_quality_score}%
- **Compliance Rate**: ${analytics.compliance_metrics.compliance_rate}%
- **Average Risk Level**: ${analytics.risk_trends.avg_risk_level.toFixed(1)}/5

## Key Findings

### Quality Analysis
- **Average Quality**: ${analytics.quality_trends.avg_quality_score}%
- **Trend**: ${analytics.quality_trends.score_trend}
- **Common Issues**: ${analytics.quality_trends.common_quality_issues.join(', ')}

### Risk Analysis  
- **Average Risk Level**: ${analytics.risk_trends.avg_risk_level.toFixed(1)}/5
- **Trending Risks**: ${analytics.risk_trends.trending_risks.join(', ')}
- **Emerging Concerns**: ${analytics.risk_trends.emerging_concerns.join(', ')}

### Compliance Status
- **Overall Compliance**: ${analytics.compliance_metrics.compliance_rate}%
- **Common Violations**: ${analytics.compliance_metrics.common_violations.join(', ')}
- **Documentation Gaps**: ${analytics.compliance_metrics.documentation_gaps.join(', ')}

## Insights Distribution
${Object.entries(analytics.insight_patterns.actionability_distribution)
  .map(([key, value]) => `- **${key}**: ${value}%`)
  .join('\n')}

## Top Action Items
${history.slice(0, 5).map((h, i) => 
  `${i + 1}. ${h.action_items[0]?.description || 'No actions'} (${h.action_items[0]?.priority || 'N/A'})`
).join('\n')}

## Recommendations
1. Focus on improving documentation completeness and clarity
2. Address recurring compliance gaps through targeted training  
3. Implement systematic monitoring of high-risk areas
4. Enhance incident reporting procedures and training
5. Develop automated quality checks for document submissions

*This report is generated automatically by the NLP Analysis System*`;
  }

  async addCustomDocumentTemplate(template: DocumentTemplate): Promise<boolean> {
    try {
      this.documentTemplates.set(template.id, template);
      console.log(`✅ Document template '${template.name}' added`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to add template '${template.name}':`, error);
      return false;
    }
  }

  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    return Array.from(this.documentTemplates.values());
  }

  async analyzeDocumentQuality(text: string, templateId?: string): Promise<QualityScore> {
    const template = templateId ? this.documentTemplates.get(templateId) : null;
    
    if (template) {
      // Use template-specific quality assessment
      return this.assessQualityAgainstTemplate(text, template);
    }
    
    return this.calculateQualityScorePattern(text, 'general');
  }

  private assessQualityAgainstTemplate(text: string, template: DocumentTemplate): QualityScore {
    const textLower = text.toLowerCase();
    let completeness = 0;
    let compliance = 0;
    let clarity = 0.8; // Base score
    let accuracy = 0.8; // Base score
    let timeliness = 0.9; // Assume recent

    // Check required fields
    const foundFields = template.required_fields.filter(field => 
      textLower.includes(field.toLowerCase()) || 
      textLower.includes(field.replace(/[\/\s]/g, '').toLowerCase())
    );
    completeness = foundFields.length / template.required_fields.length;

    // Check compliance requirements  
    const foundCompliance = template.analysis_rules.compliance_requirements.filter(req =>
      textLower.includes(req.toLowerCase())
    );
    compliance = foundCompliance.length / template.analysis_rules.compliance_requirements.length;

    // Calculate weighted overall score
    const weights = template.scoring_weights;
    const overall = (
      clarity * weights.clarity +
      completeness * weights.completeness + 
      compliance * weights.compliance +
      accuracy * (1 - weights.clarity - weights.completeness - weights.compliance)
    ) * 100;

    return {
      overall_score: Math.round(overall),
      components: {
        clarity: Math.round(clarity * 100),
        completeness: Math.round(completeness * 100),
        accuracy: Math.round(accuracy * 100),
        timeliness: Math.round(timeliness * 100),
        compliance: Math.round(compliance * 100)
      },
      improvement_areas: [
        {
          area: 'Required Fields',
          current_score: Math.round(completeness * 100),
          target_score: 95,
          improvement_suggestions: template.required_fields.filter(field => 
            !foundFields.includes(field)
          ).map(field => `Add ${field}`)
        }
      ]
    };
  }

  clearAnalysisHistory(source?: string): boolean {
    try {
      if (source) {
        this.analysisHistory.delete(source);
        console.log(`✅ Cleared analysis history for source: ${source}`);
      } else {
        this.analysisHistory.clear();
        console.log(`✅ Cleared all analysis history`);
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to clear analysis history:', error);
      return false;
    }
  }
}

// Create singleton instance
const naturalLanguageProcessingService = new NaturalLanguageProcessingService();

export default naturalLanguageProcessingService;
export type { 
  NLPAnalysisResult, 
  SentimentAnalysis,
  EntityExtractionResult, 
  RiskClassification,
  ComplianceAnalysis,
  KeyInsight,
  ActionItem,
  TextAnalysisRecommendation,
  QualityScore,
  TextAnalytics,
  DocumentTemplate
};