/**
 * AI SAFETY CHAT ASSISTANT - REFACTORED FOR BACKEND API
 * Intelligent conversational AI for real-time safety guidance, compliance help, and emergency support
 * Features: Context-aware responses, multi-language support, emergency protocols, learning capabilities
 * 
 * REFACTORED: All AI processing now happens on backend for mobile compatibility
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    category?: 'general' | 'emergency' | 'compliance' | 'procedure' | 'incident';
    priority?: 'low' | 'medium' | 'high' | 'emergency';
    location?: string;
    user_context?: UserContext;
    confidence?: number;
    suggested_actions?: string[];
  };
}

interface UserContext {
  user_id: string;
  role: 'worker' | 'supervisor' | 'manager' | 'safety_officer' | 'contractor';
  location: string;
  department: string;
  current_activity?: string;
  safety_level: number; // 1-10 user's safety knowledge level
  language: string;
  emergency_contact?: string;
  certifications?: string[];
  recent_incidents?: string[];
}

interface SafetyKnowledgeBase {
  procedures: Map<string, ProcedureGuide>;
  regulations: Map<string, RegulationInfo>;
  emergency_protocols: Map<string, EmergencyProtocol>;
  equipment_guides: Map<string, EquipmentGuide>;
  training_materials: Map<string, TrainingContent>;
  incident_responses: Map<string, IncidentResponse>;
}

interface ProcedureGuide {
  id: string;
  title: string;
  category: string;
  steps: Array<{
    step_number: number;
    description: string;
    safety_note?: string;
    required_equipment?: string[];
    verification?: string;
  }>;
  safety_warnings: string[];
  required_certifications?: string[];
}

interface RegulationInfo {
  id: string;
  title: string;
  authority: string;
  scope: string;
  key_requirements: string[];
  compliance_checklist: string[];
  last_updated: string;
}

interface EmergencyProtocol {
  id: string;
  emergency_type: 'fire' | 'medical' | 'chemical_spill' | 'equipment_failure' | 'weather' | 'security';
  immediate_actions: string[];
  contact_numbers: Array<{
    service: string;
    number: string;
    when_to_call: string;
  }>;
  evacuation_routes?: string[];
  assembly_points?: string[];
}

interface EquipmentGuide {
  id: string;
  equipment_name: string;
  safety_procedures: string[];
  maintenance_requirements: string[];
  operating_instructions: string[];
  safety_warnings: string[];
  required_training: string[];
}

interface TrainingContent {
  id: string;
  module_name: string;
  learning_objectives: string[];
  content_summary: string;
  assessment_criteria: string[];
  certification_level: string;
  expiry_period: string;
}

interface IncidentResponse {
  incident_type: string;
  immediate_response: string[];
  investigation_steps: string[];
  reporting_requirements: string[];
  follow_up_actions: string[];
}

interface ChatResponse {
  response: string;
  confidence: number;
  metadata: {
    category: string;
    priority: string;
    suggested_actions?: string[];
    related_procedures?: string[];
    emergency_contacts?: string[];
  };
}

/**
 * Helper function for backend API calls
 */
const callChatAPI = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`/api/ai${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Chat API call failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Chat API call failed for ${endpoint}:`, error);
    return {
      response: 'AI chat service is temporarily unavailable. Please contact your safety supervisor for assistance.',
      confidence: 0,
      metadata: {
        category: 'error',
        priority: 'medium',
        suggested_actions: ['Contact safety supervisor', 'Refer to safety manual', 'Follow standard procedures']
      }
    };
  }
};

export class AISafetyChatAssistant {
  private conversation_history: ChatMessage[] = [];
  private user_context: UserContext | null = null;
  private knowledge_base: SafetyKnowledgeBase;

  constructor() {
    this.knowledge_base = {
      procedures: new Map(),
      regulations: new Map(),
      emergency_protocols: new Map(),
      equipment_guides: new Map(),
      training_materials: new Map(),
      incident_responses: new Map()
    };
  }

  /**
   * Set user context for personalized responses
   */
  setUserContext(context: UserContext): void {
    this.user_context = context;
  }

  /**
   * Main chat interface - now uses backend API
   */
  async chat(user_message: string, image_data?: string): Promise<ChatResponse> {
    const chatData = {
      message: user_message,
      image: image_data,
      user_context: this.user_context,
      conversation_history: this.conversation_history.slice(-10), // Send last 10 messages for context
    };

    const response = await callChatAPI('/chat', chatData);

    // Update conversation history
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: user_message,
      timestamp: Date.now()
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.response,
      timestamp: Date.now() + 1,
      metadata: response.metadata
    };

    this.conversation_history.push(userMessage, assistantMessage);

    return response;
  }

  /**
   * Emergency assistance - high priority routing
   */
  async getEmergencyAssistance(emergency_type: string, location: string, description: string): Promise<ChatResponse> {
    const emergencyData = {
      emergency_type,
      location,
      description,
      user_context: this.user_context,
      priority: 'emergency'
    };

    return callChatAPI('/emergency-assistance', emergencyData);
  }

  /**
   * Procedure guidance
   */
  async getProcedureGuidance(procedure_name: string, current_step?: number): Promise<ChatResponse> {
    const procedureData = {
      procedure_name,
      current_step,
      user_context: this.user_context
    };

    return callChatAPI('/procedure-guidance', procedureData);
  }

  /**
   * Compliance checking
   */
  async checkCompliance(activity: string, location: string): Promise<ChatResponse> {
    const complianceData = {
      activity,
      location,
      user_context: this.user_context
    };

    return callChatAPI('/compliance-check', complianceData);
  }

  /**
   * Risk assessment assistance
   */
  async assessRisk(task_description: string, location: string, equipment_involved?: string[]): Promise<ChatResponse> {
    const riskData = {
      task_description,
      location,
      equipment_involved,
      user_context: this.user_context
    };

    return callChatAPI('/risk-assessment', riskData);
  }

  /**
   * Training recommendations
   */
  async getTrainingRecommendations(current_certifications: string[], role: string): Promise<ChatResponse> {
    const trainingData = {
      current_certifications,
      role,
      user_context: this.user_context
    };

    return callChatAPI('/training-recommendations', trainingData);
  }

  /**
   * Incident reporting assistance
   */
  async getIncidentReportingHelp(incident_type: string, severity: string): Promise<ChatResponse> {
    const incidentData = {
      incident_type,
      severity,
      user_context: this.user_context
    };

    return callChatAPI('/incident-reporting', incidentData);
  }

  /**
   * Equipment safety guidance
   */
  async getEquipmentGuidance(equipment_name: string, operation_type: string): Promise<ChatResponse> {
    const equipmentData = {
      equipment_name,
      operation_type,
      user_context: this.user_context
    };

    return callChatAPI('/equipment-guidance', equipmentData);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversation_history = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return this.conversation_history;
  }

  /**
   * Add knowledge base entry (local storage)
   */
  addKnowledgeBaseEntry(type: keyof SafetyKnowledgeBase, entry: any): void {
    if (type === 'procedures' && entry.id) {
      this.knowledge_base.procedures.set(entry.id, entry as ProcedureGuide);
    }
    // Add other types as needed
  }

  /**
   * Multi-language support
   */
  async setLanguage(language_code: string): Promise<void> {
    if (this.user_context) {
      this.user_context.language = language_code;
    }
  }

  /**
   * Get emergency contacts for current context
   */
  getEmergencyContacts(): Array<{ service: string; number: string }> {
    // Return fallback emergency contacts
    return [
      { service: 'Emergency Services', number: '911' },
      { service: 'Company Safety Hotline', number: 'Contact Admin' },
      { service: 'Site Supervisor', number: 'Contact Admin' }
    ];
  }
}

// Export singleton instance
export const safetyChatAssistant = new AISafetyChatAssistant();

// Export individual functions for backward compatibility
export const chatSafetyAssistant = async (message: string, history: any[], image?: string, context?: string) => {
  if (context && safetyChatAssistant.user_context) {
    safetyChatAssistant.setUserContext({ ...safetyChatAssistant.user_context, current_activity: context });
  }
  return safetyChatAssistant.chat(message, image);
};

export const getEmergencyAssistance = (type: string, location: string, description: string) => {
  return safetyChatAssistant.getEmergencyAssistance(type, location, description);
};

export const getProcedureGuidance = (procedure: string, step?: number) => {
  return safetyChatAssistant.getProcedureGuidance(procedure, step);
};

export const checkCompliance = (activity: string, location: string) => {
  return safetyChatAssistant.checkCompliance(activity, location);
};

export const assessRisk = (task: string, location: string, equipment?: string[]) => {
  return safetyChatAssistant.assessRisk(task, location, equipment);
};

export const getTrainingRecommendations = (certifications: string[], role: string) => {
  return safetyChatAssistant.getTrainingRecommendations(certifications, role);
};

interface EmergencyProtocol {
  id: string;
  emergency_type: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  immediate_actions: Array<{
    priority: number;
    action: string;
    timeline: string;
    responsible: string;
  }>;
  evacuation_procedures?: string[];
  communication_plan: Array<{
    contact: string;
    when_to_call: string;
    information_to_provide: string[];
  }>;
  equipment_needed: string[];
  follow_up_actions: string[];
}

interface ConversationAnalytics {
  session_id: string;
  user_satisfaction: number;
  resolution_time: number;
  category_distribution: Record<string, number>;
  common_questions: Array<{
    question: string;
    frequency: number;
    avg_confidence: number;
  }>;
  knowledge_gaps: string[];
  improvement_suggestions: string[];
}

interface AIResponse {
  message: string;
  confidence: number;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  suggested_actions: Array<{
    action: string;
    urgency: 'immediate' | 'soon' | 'when_convenient';
    safety_impact: 'critical' | 'important' | 'minor';
  }>;
  follow_up_questions: string[];
  related_procedures: string[];
  compliance_notes: string[];
  emergency_escalation?: {
    required: boolean;
    contacts: string[];
    reason: string;
  };
}

class AISafetyChatAssistant {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private initialized = false;
  private knowledgeBase: SafetyKnowledgeBase;
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private analytics: Map<string, ConversationAnalytics> = new Map();

  // Safety keywords and emergency triggers
  private readonly EMERGENCY_KEYWORDS = [
    'emergency', 'fire', 'explosion', 'injury', 'accident', 'bleeding', 
    'unconscious', 'chemical spill', 'gas leak', 'help', 'danger', 'urgent'
  ];

  private readonly HIGH_PRIORITY_KEYWORDS = [
    'unsafe', 'hazard', 'risk', 'violation', 'non-compliance', 
    'broken equipment', 'malfunction', 'leak', 'damage'
  ];

  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
    this.initializeAI();
  }

  private async initializeAI(): Promise<void> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('🤖 Gemini API key not found - Safety Assistant will use knowledge base responses');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.4, // Balanced creativity for helpful responses
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
      
      this.initialized = true;
      console.log('✅ AI Safety Chat Assistant initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Safety Chat Assistant:', error);
    }
  }

  private initializeKnowledgeBase(): SafetyKnowledgeBase {
    return {
      procedures: new Map([
        ['lockout-tagout', {
          id: 'loto-001',
          title: 'Lockout/Tagout Procedure',
          category: 'Energy Control',
          steps: [
            {
              step_number: 1,
              instruction: 'Notify all affected personnel of the shutdown',
              safety_note: 'Ensure clear communication before proceeding',
              checkpoints: ['Verbal notification given', 'Documentation completed']
            },
            {
              step_number: 2,
              instruction: 'Identify and locate all energy sources',
              safety_note: 'Include electrical, mechanical, hydraulic, pneumatic, chemical, and thermal',
              required_ppe: ['Safety glasses', 'Hard hat']
            },
            {
              step_number: 3,
              instruction: 'Turn off equipment using normal shutdown procedures',
              safety_note: 'Do not skip normal shutdown sequence'
            },
            {
              step_number: 4,
              instruction: 'Apply lockout devices to all energy isolation points',
              safety_note: 'Each worker must apply their own personal lock',
              required_ppe: ['Insulated gloves']
            },
            {
              step_number: 5,
              instruction: 'Attempt to start equipment to verify isolation',
              safety_note: 'Test all controls to ensure energy is isolated'
            }
          ],
          prerequisites: ['LOTO training completion', 'Authorized person designation'],
          safety_warnings: [
            'Never remove another person\'s lock',
            'Verify zero energy state before work begins',
            'Use only your assigned personal locks'
          ],
          compliance_notes: ['OSHA 29 CFR 1910.147 compliance required'],
          last_updated: Date.now(),
          version: '2.1'
        }]
      ]),
      regulations: new Map(),
      emergency_protocols: new Map([
        ['fire', {
          id: 'fire-001',
          emergency_type: 'Fire',
          severity_level: 'critical',
          immediate_actions: [
            {
              priority: 1,
              action: 'Activate fire alarm',
              timeline: 'Immediately',
              responsible: 'Anyone discovering fire'
            },
            {
              priority: 2,
              action: 'Call 911',
              timeline: 'Immediately after alarm',
              responsible: 'Designate person or do yourself'
            },
            {
              priority: 3,
              action: 'Begin evacuation procedures',
              timeline: 'Within 30 seconds',
              responsible: 'All personnel'
            }
          ],
          evacuation_procedures: [
            'Use nearest exit',
            'Do not use elevators', 
            'Proceed to assembly point',
            'Report to accountability officer'
          ],
          communication_plan: [
            {
              contact: 'Fire Department (911)',
              when_to_call: 'Immediately upon discovery',
              information_to_provide: ['Location', 'Type of fire', 'People at risk', 'Chemical involvement']
            },
            {
              contact: 'Safety Manager',
              when_to_call: 'After 911 call',
              information_to_provide: ['Incident details', 'Personnel status', 'Containment efforts']
            }
          ],
          equipment_needed: ['Fire extinguisher (if safe)', 'Emergency shutdown tools'],
          follow_up_actions: [
            'Account for all personnel',
            'Provide information to fire department',
            'Do not re-enter until all-clear given',
            'Begin incident investigation process'
          ]
        }]
      ]),
      equipment_guides: new Map(),
      training_materials: new Map(),
      incident_responses: new Map()
    };
  }

  async processMessage(
    message: string, 
    userContext: UserContext, 
    sessionId: string = 'default'
  ): Promise<AIResponse> {
    try {
      // Analyze message for emergency/priority
      const priority = this.analyzePriority(message);
      const category = this.categorizeMessage(message);
      
      // Handle emergency scenarios
      if (priority === 'emergency') {
        return await this.handleEmergencyMessage(message, userContext);
      }

      // Get conversation history
      const history = this.conversationHistory.get(sessionId) || [];
      
      // Add user message to history
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
        metadata: {
          category,
          priority,
          location: userContext.location,
          user_context: userContext
        }
      };
      
      history.push(userMessage);

      let response: AIResponse;

      if (this.initialized && this.model) {
        response = await this.generateAIResponse(message, userContext, history);
      } else {
        response = await this.generateKnowledgeBaseResponse(message, userContext, category);
      }

      // Add assistant response to history
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        metadata: {
          category: response.category,
          priority: response.priority,
          confidence: response.confidence,
          suggested_actions: response.suggested_actions.map(a => a.action)
        }
      };

      history.push(assistantMessage);
      this.conversationHistory.set(sessionId, history);

      // Update analytics
      this.updateAnalytics(sessionId, userMessage, response);

      return response;
    } catch (error) {
      console.error('Chat processing failed:', error);
      return this.generateFallbackResponse(message, userContext);
    }
  }

  private async generateAIResponse(
    message: string, 
    userContext: UserContext, 
    history: ChatMessage[]
  ): Promise<AIResponse> {
    const contextPrompt = this.buildContextPrompt(message, userContext, history);
    
    try {
      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      const aiText = response.text();

      return this.parseAIResponse(aiText, message, userContext);
    } catch (error) {
      console.error('AI response generation failed:', error);
      return this.generateKnowledgeBaseResponse(message, userContext, 'general');
    }
  }

  private buildContextPrompt(
    message: string, 
    userContext: UserContext, 
    history: ChatMessage[]
  ): string {
    const recentHistory = history.slice(-6).map(h => 
      `${h.role}: ${h.content}`
    ).join('\n');

    return `You are SafetyBot, an expert AI safety assistant for workplace safety guidance. Your role is to provide accurate, helpful, and safety-focused responses.

USER CONTEXT:
- Role: ${userContext.role}
- Location: ${userContext.location}
- Department: ${userContext.department}
- Safety Level: ${userContext.safety_level}/10
- Language: ${userContext.language}
- Current Activity: ${userContext.current_activity || 'Not specified'}

CONVERSATION HISTORY:
${recentHistory}

CURRENT QUESTION:
${message}

INSTRUCTIONS:
1. Provide clear, actionable safety guidance
2. Include specific safety steps when relevant
3. Mention required PPE if applicable  
4. Reference relevant regulations/standards
5. Suggest follow-up actions if needed
6. Escalate to emergency services if life-threatening
7. Adapt language complexity to user's safety level (${userContext.safety_level}/10)

Response format (JSON):
{
  "message": "Your helpful response here",
  "confidence": 0.85,
  "category": "procedure|compliance|emergency|general",
  "priority": "low|medium|high|emergency", 
  "suggested_actions": [
    {
      "action": "Specific action to take",
      "urgency": "immediate|soon|when_convenient",
      "safety_impact": "critical|important|minor"
    }
  ],
  "follow_up_questions": ["Question 1?", "Question 2?"],
  "related_procedures": ["Procedure name 1", "Procedure name 2"],
  "compliance_notes": ["Regulation reference"],
  "emergency_escalation": {
    "required": false,
    "contacts": [],
    "reason": ""
  }
}

Prioritize user safety above all else. If uncertain about critical safety information, recommend consulting with safety personnel.`;
  }

  private parseAIResponse(aiText: string, originalMessage: string, userContext: UserContext): AIResponse {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and ensure required fields
        return {
          message: parsed.message || 'I can help you with that safety question.',
          confidence: parsed.confidence || 0.7,
          category: parsed.category || 'general',
          priority: parsed.priority || 'medium',
          suggested_actions: parsed.suggested_actions || [],
          follow_up_questions: parsed.follow_up_questions || [],
          related_procedures: parsed.related_procedures || [],
          compliance_notes: parsed.compliance_notes || [],
          emergency_escalation: parsed.emergency_escalation
        };
      }

      throw new Error('No valid JSON in AI response');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.generateKnowledgeBaseResponse(originalMessage, userContext, 'general');
    }
  }

  private async generateKnowledgeBaseResponse(
    message: string, 
    userContext: UserContext, 
    category: string
  ): Promise<AIResponse> {
    const messageLower = message.toLowerCase();
    
    // Check for procedure requests
    if (messageLower.includes('lockout') || messageLower.includes('tagout') || messageLower.includes('loto')) {
      const procedure = this.knowledgeBase.procedures.get('lockout-tagout');
      if (procedure) {
        return {
          message: `Here's the Lockout/Tagout procedure:\n\n${procedure.steps.map(step => 
            `${step.step_number}. ${step.instruction}`
          ).join('\n')}\n\nSafety warnings:\n${procedure.safety_warnings.map(w => `• ${w}`).join('\n')}`,
          confidence: 0.9,
          category: 'procedure',
          priority: 'high',
          suggested_actions: [
            {
              action: 'Review complete LOTO procedure document',
              urgency: 'soon',
              safety_impact: 'critical'
            },
            {
              action: 'Verify your LOTO training is current',
              urgency: 'soon', 
              safety_impact: 'important'
            }
          ],
          follow_up_questions: [
            'Do you need help with specific energy source identification?',
            'Are you authorized to perform LOTO procedures?',
            'Do you have questions about lockout device types?'
          ],
          related_procedures: ['Energy Isolation', 'Equipment Shutdown'],
          compliance_notes: ['OSHA 29 CFR 1910.147 - Control of Hazardous Energy']
        };
      }
    }

    // Check for PPE questions
    if (messageLower.includes('ppe') || messageLower.includes('personal protective')) {
      return {
        message: `Personal Protective Equipment (PPE) is essential for workplace safety. The required PPE depends on your specific work activity and hazards present. Common PPE includes:\n\n• **Head Protection**: Hard hats for impact/falling object risks\n• **Eye Protection**: Safety glasses/goggles for chemical/particle hazards\n• **Hearing Protection**: Earplugs/muffs in noise >85dB areas\n• **Respiratory Protection**: Masks/respirators for air contaminants\n• **Hand Protection**: Gloves for chemical/cut/burn protection\n• **Foot Protection**: Safety boots for impact/puncture protection\n\nAlways inspect PPE before use and replace if damaged.`,
        confidence: 0.85,
        category: 'compliance',
        priority: 'high',
        suggested_actions: [
          {
            action: 'Conduct PPE hazard assessment for your work area',
            urgency: 'soon',
            safety_impact: 'important'
          },
          {
            action: 'Verify your PPE is properly fitted and maintained',
            urgency: 'immediate',
            safety_impact: 'critical'
          }
        ],
        follow_up_questions: [
          'What specific work activity do you need PPE guidance for?',
          'Do you need help with PPE fitting or maintenance?',
          'Are you experiencing any PPE-related issues?'
        ],
        related_procedures: ['PPE Selection Guide', 'PPE Maintenance'],
        compliance_notes: ['OSHA 29 CFR 1910.132 - General Requirements for PPE']
      };
    }

    // Default helpful response
    return {
      message: `I'm here to help with your safety question: "${message}"\n\nAs a safety assistant, I can help you with:\n• Safety procedures and protocols\n• PPE requirements and usage\n• Emergency response procedures\n• Compliance and regulation questions\n• Incident reporting guidance\n• Equipment safety checks\n\nCould you provide more specific details about what safety topic you need assistance with?`,
      confidence: 0.6,
      category: category,
      priority: 'medium',
      suggested_actions: [
        {
          action: 'Provide more specific details about your safety question',
          urgency: 'when_convenient',
          safety_impact: 'minor'
        }
      ],
      follow_up_questions: [
        'What specific safety procedure do you need help with?',
        'Are you dealing with an immediate safety concern?',
        'Do you need information about compliance requirements?'
      ],
      related_procedures: [],
      compliance_notes: []
    };
  }

  private async handleEmergencyMessage(message: string, userContext: UserContext): Promise<AIResponse> {
    const messageLower = message.toLowerCase();
    
    // Determine emergency type
    let emergencyType = 'general';
    if (messageLower.includes('fire')) emergencyType = 'fire';
    if (messageLower.includes('injury') || messageLower.includes('hurt')) emergencyType = 'injury';
    if (messageLower.includes('chemical') && messageLower.includes('spill')) emergencyType = 'chemical_spill';

    const emergency = this.knowledgeBase.emergency_protocols.get(emergencyType);
    
    if (emergencyType === 'fire' && emergency) {
      return {
        message: `🚨 **FIRE EMERGENCY PROTOCOL** 🚨\n\n**IMMEDIATE ACTIONS:**\n${emergency.immediate_actions.map(action => 
          `${action.priority}. ${action.action} (${action.timeline})`
        ).join('\n')}\n\n**EVACUATION:**\n${emergency.evacuation_procedures?.map(step => `• ${step}`).join('\n')}\n\n**CALL 911 IMMEDIATELY** if you haven't already!\n\nStay safe and follow your facility's emergency procedures.`,
        confidence: 1.0,
        category: 'emergency',
        priority: 'emergency',
        suggested_actions: [
          {
            action: 'Call 911 if not already done',
            urgency: 'immediate',
            safety_impact: 'critical'
          },
          {
            action: 'Activate fire alarm',
            urgency: 'immediate', 
            safety_impact: 'critical'
          },
          {
            action: 'Begin evacuation procedures',
            urgency: 'immediate',
            safety_impact: 'critical'
          }
        ],
        follow_up_questions: [],
        related_procedures: ['Fire Emergency Response', 'Evacuation Procedures'],
        compliance_notes: ['OSHA Emergency Action Plan requirements'],
        emergency_escalation: {
          required: true,
          contacts: ['911', 'Site Emergency Coordinator', 'Safety Manager'],
          reason: 'Fire emergency requires immediate professional response'
        }
      };
    }

    return {
      message: `🚨 **EMERGENCY SITUATION DETECTED** 🚨\n\n**IMMEDIATE PRIORITIES:**\n1. **CALL 911** if there is immediate danger to life or property\n2. **Ensure personal safety** - evacuate if necessary\n3. **Alert others** in the immediate area\n4. **Contact your supervisor** and safety personnel\n\nIf this is a medical emergency, get professional help immediately. For other emergencies, follow your facility's emergency procedures.\n\n**Do you need me to help you contact emergency services?**`,
      confidence: 1.0,
      category: 'emergency',
      priority: 'emergency',
      suggested_actions: [
        {
          action: 'Call 911 if there is immediate danger',
          urgency: 'immediate',
          safety_impact: 'critical'
        },
        {
          action: 'Ensure your personal safety first',
          urgency: 'immediate',
          safety_impact: 'critical'
        },
        {
          action: 'Alert nearby personnel of the emergency',
          urgency: 'immediate',
          safety_impact: 'critical'
        }
      ],
      follow_up_questions: [],
      related_procedures: ['Emergency Response Plan'],
      compliance_notes: ['Emergency Action Plan compliance required'],
      emergency_escalation: {
        required: true,
        contacts: ['911', 'Emergency Coordinator', 'Safety Manager'],
        reason: 'Emergency situation requires immediate professional response'
      }
    };
  }

  private analyzePriority(message: string): 'low' | 'medium' | 'high' | 'emergency' {
    const messageLower = message.toLowerCase();
    
    if (this.EMERGENCY_KEYWORDS.some(keyword => messageLower.includes(keyword))) {
      return 'emergency';
    }
    
    if (this.HIGH_PRIORITY_KEYWORDS.some(keyword => messageLower.includes(keyword))) {
      return 'high';
    }

    if (messageLower.includes('compliance') || messageLower.includes('regulation') || messageLower.includes('ppe')) {
      return 'medium';
    }

    return 'low';
  }

  private categorizeMessage(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (this.EMERGENCY_KEYWORDS.some(keyword => messageLower.includes(keyword))) {
      return 'emergency';
    }
    
    if (messageLower.includes('procedure') || messageLower.includes('how to') || messageLower.includes('steps')) {
      return 'procedure';
    }
    
    if (messageLower.includes('compliance') || messageLower.includes('regulation') || messageLower.includes('osha')) {
      return 'compliance';
    }
    
    if (messageLower.includes('incident') || messageLower.includes('report') || messageLower.includes('accident')) {
      return 'incident';
    }

    return 'general';
  }

  private generateFallbackResponse(message: string, userContext: UserContext): AIResponse {
    return {
      message: `I understand you're asking about: "${message}"\n\nI'm here to help with safety questions, but I need a bit more information to provide the best guidance. Could you please clarify what specific safety topic or situation you need assistance with?\n\nFor immediate emergencies, always call 911 first, then contact your local safety personnel.`,
      confidence: 0.5,
      category: 'general',
      priority: 'medium',
      suggested_actions: [
        {
          action: 'Clarify your specific safety question',
          urgency: 'when_convenient',
          safety_impact: 'minor'
        }
      ],
      follow_up_questions: [
        'Is this related to a specific procedure or regulation?',
        'Are you dealing with an immediate safety concern?',
        'Would you like general safety information for your work area?'
      ],
      related_procedures: [],
      compliance_notes: []
    };
  }

  private updateAnalytics(sessionId: string, userMessage: ChatMessage, response: AIResponse): void {
    let analytics = this.analytics.get(sessionId);
    
    if (!analytics) {
      analytics = {
        session_id: sessionId,
        user_satisfaction: 0.8, // Default assumption
        resolution_time: 0,
        category_distribution: {},
        common_questions: [],
        knowledge_gaps: [],
        improvement_suggestions: []
      };
    }

    // Update category distribution
    const category = response.category;
    analytics.category_distribution[category] = (analytics.category_distribution[category] || 0) + 1;

    this.analytics.set(sessionId, analytics);
  }

  // Public methods for advanced features
  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.conversationHistory.get(sessionId) || [];
  }

  async getAnalytics(sessionId: string): Promise<ConversationAnalytics | null> {
    return this.analytics.get(sessionId) || null;
  }

  async getSafetyKnowledgeTopics(): Promise<Array<{
    category: string;
    topics: string[];
    coverage: number;
  }>> {
    return [
      {
        category: 'Emergency Procedures',
        topics: ['Fire Response', 'Medical Emergency', 'Chemical Spill', 'Evacuation'],
        coverage: 0.85
      },
      {
        category: 'Safety Procedures',
        topics: ['Lockout/Tagout', 'Confined Space', 'Hot Work', 'Fall Protection'],
        coverage: 0.75
      },
      {
        category: 'PPE & Equipment',
        topics: ['PPE Selection', 'Equipment Inspection', 'Maintenance', 'Training'],
        coverage: 0.90
      },
      {
        category: 'Compliance',
        topics: ['OSHA Regulations', 'Company Policies', 'Industry Standards', 'Audits'],
        coverage: 0.70
      }
    ];
  }

  async updateKnowledgeBase(category: string, data: any): Promise<boolean> {
    try {
      switch (category) {
        case 'procedure':
          this.knowledgeBase.procedures.set(data.id, data);
          break;
        case 'emergency':
          this.knowledgeBase.emergency_protocols.set(data.id, data);
          break;
        case 'regulation':
          this.knowledgeBase.regulations.set(data.id, data);
          break;
        default:
          return false;
      }
      
      console.log(`✅ Knowledge base updated: ${category}`);
      return true;
    } catch (error) {
      console.error('Knowledge base update failed:', error);
      return false;
    }
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
    this.analytics.delete(sessionId);
  }

  async exportConversation(sessionId: string, format: 'json' | 'text' = 'json'): Promise<string> {
    const history = this.conversationHistory.get(sessionId);
    if (!history) return '';

    if (format === 'text') {
      return history.map(msg => 
        `[${new Date(msg.timestamp).toISOString()}] ${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
    }

    return JSON.stringify({
      session_id: sessionId,
      messages: history,
      analytics: this.analytics.get(sessionId)
    }, null, 2);
  }
}

// Create singleton instance
const aiSafetyChatAssistant = new AISafetyChatAssistant();

export default aiSafetyChatAssistant;
export type { 
  ChatMessage, 
  UserContext, 
  AIResponse, 
  ConversationAnalytics,
  ProcedureGuide,
  EmergencyProtocol
};