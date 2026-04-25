import { 
  IncidentType, IncidentSeverity, IncidentCategory, Incident, ActionItem, 
  Observation, PPEItem, Contractor, HSEMetrics, EnvironmentalData 
} from "../types";
import { getAuthToken } from './apiService';

/**
 * AI PROXY Ã¢â‚¬â€ All Gemini calls are routed through the backend server
 * to keep the API key secure (never exposed in the browser bundle).
 *
 * The Type constants mirror @google/genai's Type enum values.
 */
const Type = {
  OBJECT: 'OBJECT' as const,
  STRING: 'STRING' as const,
  NUMBER: 'NUMBER' as const,
  INTEGER: 'INTEGER' as const,
  BOOLEAN: 'BOOLEAN' as const,
  ARRAY: 'ARRAY' as const,
};

const API_BASE = (import.meta as any).env.VITE_API_URL || '/api';
const MODEL_NAME = "gemini-2.5-flash"; // Use latest stable model

/**
 * Default config to disable thinking for faster responses
 */
const NO_THINK = { thinkingConfig: { thinkingBudget: 0 } } as any;

/**
 * Safely parse JSON from AI response text.
 * Handles cases where the model wraps JSON in markdown fences (```json ... ```)
 * or returns extra whitespace / preamble text around the JSON object.
 */
const safeParseJSON = (text: string | undefined | null, fallback: any = {}): any => {
  if (!text || text.trim().length === 0) return fallback;

  // 1. Try direct parse first (happy path when responseMimeType works)
  try { return JSON.parse(text); } catch { /* continue */ }

  // 2. Strip markdown code fences:  ```json ... ```  or  ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]!.trim()); } catch { /* continue */ }
  }

  // 3. Greedy extraction: first { … last }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
  }

  // 4. Try array extraction: first [ … last ]
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* continue */ }
  }

  return fallback;
};

/**
 * Proxy wrapper for ai.models.generateContent Ã¢â‚¬â€ calls the backend /api/ai/generate
 */
const aiGenerate = async (params: { model?: string; contents: any; config?: any }): Promise<{ text: string }> => {
  const token = getAuthToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout (less than Vercel's 60s)
  try {
    const res = await fetch(`${API_BASE}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') || '30';
        throw new Error(`AI rate limit exceeded. Please wait ${retryAfter} seconds and try again.`);
      }
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `AI call failed: ${res.status}`);
    }
    return res.json();
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('AI request timed out. Please try again.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Proxy wrapper for ai.chats Ã¢â‚¬â€ calls the backend /api/ai/chat
 */
const aiChat = async (params: { model?: string; history: any[]; config?: any; message: any }): Promise<{ text: string }> => {
  const token = getAuthToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout (less than Vercel's 60s)
  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') || '30';
        throw new Error(`AI rate limit exceeded. Please wait ${retryAfter} seconds and try again.`);
      }
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `AI chat failed: ${res.status}`);
    }
    return res.json();
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('AI request timed out. Please try again.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Helper: Cleans Base64 strings for Gemini
 */
const cleanBase64 = (base64: string) => base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

/**
 * 1. Incident Classification
 */
export const classifyIncidentAI = async (description: string) => {
  try {
    const prompt = `Analyze this HSE incident: "${description}". Classify by type and OSHA category (Near Miss, First Aid Case, Medical Treatment Case, Restricted Work Case, Lost Time Injury, Fatality). Perform causal analysis.`;
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: Object.values(IncidentType) },
            category: { type: Type.STRING, enum: Object.values(IncidentCategory) },
            severity: { type: Type.STRING, enum: Object.values(IncidentSeverity) },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            causes: { type: Type.ARRAY, items: { type: Type.STRING } },
            contributingFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["type", "category", "severity", "confidence", "reasoning", "causes", "contributingFactors"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("AI Classification Error:", error);
    throw error;
  }
};

/**
 * 2. Corrective Actions
 */
export const getCorrectiveActionsAI = async (description: string, type: string, severity: string) => {
  try {
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: `Suggest 3 actions for: "${description}" (Type: ${type}, Severity: ${severity})`,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actions: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return safeParseJSON(response.text, {"actions": []});
  } catch (error) {
    console.error("AI Corrective Actions Error:", error);
    throw error;
  }
};

/**
 * 3. Root Cause Analysis (5-Why / Fishbone)
 */
export const analyzeRootCauseAI = async (description: string, type: string, method: '5-Why' | 'Fishbone' = '5-Why') => {
  try {
    const prompt = method === '5-Why' 
      ? `Perform a 5-Why analysis for: ${description}`
      : `Perform a Fishbone analysis (Man, Machine, Method, Material, Environment) for: ${description}`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whys: { type: Type.ARRAY, items: { type: Type.STRING } },
            categories: {
              type: Type.OBJECT,
              properties: {
                man: { type: Type.STRING },
                machine: { type: Type.STRING },
                method: { type: Type.STRING },
                material: { type: Type.STRING },
                environment: { type: Type.STRING }
              }
            },
            rootCause: { type: Type.STRING }
          }
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Root Cause Analysis Error:", error);
    throw error;
  }
};

/**
 * 4. PPE Detection (Computer Vision)
 */
export const detectPPEAI = async (base64Image: string) => {
  try {
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
        { text: "Analyze for PPE compliance: Hard Hats, Vests, Glasses, Boots. Return JSON." }
      ],
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personsDetected: { type: Type.BOOLEAN },
            ppeItemsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingPPE: { type: Type.ARRAY, items: { type: Type.STRING } },
            complianceScore: { type: Type.INTEGER },
            summary: { type: Type.STRING }
          }
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("PPE Detection Error:", error);
    throw error;
  }
};

/**
 * 5. Document Data Extraction (OCR)
 */
export const extractDocumentDataAI = async (base64Image: string) => {
  try {
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
        { text: "Extract: Document Type, Date, Permit Holder, Hazards." }
      ],
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING },
            date: { type: Type.STRING },
            permitHolder: { type: Type.STRING },
            hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          }
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    throw error;
  }
};

/**
 * 6. Site Hazards (Smart Camera)
 */
export const detectSiteHazardsAI = async (base64Image: string) => {
  try {
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
        { text: "Detect construction site hazards: trip risks, height risks, PPE violations." }
      ],
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hazard: { type: Type.STRING },
                  location: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  recommendation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return safeParseJSON(response.text, {"detections": []});
  } catch (error) {
    console.error("Site Hazard Detection Error:", error);
    throw error;
  }
};

/**
 * 7. Chat Assistant
 */
export const chatSafetyAssistant = async (
    userMessage: string, 
    history: {role: 'user' | 'model', text: string}[],
    imageBase64?: string,
    systemContext: string = ''
) => {
    try {
        const parts: any[] = [{ text: userMessage }];
        if (imageBase64) {
            parts.unshift({ inlineData: { mimeType: "image/jpeg", data: cleanBase64(imageBase64) } });
        }

        const result = await aiChat({
            model: MODEL_NAME,
            history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
            config: {
                ...NO_THINK,
                systemInstruction: `You are Safedify AI, an HSE expert. Context: ${systemContext}`
            },
            message: parts,
        });
        return result.text || "I couldn't process that.";
    } catch (error: any) {
        console.error('[chatSafetyAssistant] Error:', error?.message || error);
        // Throw so the caller can show the real error to the user
        throw error;
    }
};

/**
 * 8. Regulatory News (Google Search Grounding)
 */
export const fetchRegulatoryNewsAI = async (country: string) => {
  try {
    const prompt = `Search for 3 recent safety regulatory updates in ${country}. Return JSON.`;
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        tools: [{ googleSearch: {} }] as any
      }
    });

    return safeParseJSON(response.text, { updates: [] });
  } catch (error) {
    console.error("Regulatory News Error:", error);
    throw error;
  }
};

/**
 * 9. Audio / TTS Logic (Browser SpeechSynthesis Ã¢â‚¬â€ reliable, no API calls)
 */
export const generateSpeechAI = async (text: string): Promise<string | null> => {
    // Check browser support for SpeechSynthesis
    if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported in this browser.');
        return null;
    }
    // Return the cleaned text Ã¢â‚¬â€ actual playback happens in playGeneratedAudio
    return text;
};

export const playGeneratedAudio = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            console.warn('SpeechSynthesis not supported.');
            resolve();
            return;
        }
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        // Pick a good English voice if available
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService) 
                          || voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) utterance.voice = englishVoice;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
            console.error("SpeechSynthesis error:", e);
            resolve(); // Don't break the caller flow
        };

        window.speechSynthesis.speak(utterance);
    });
};

export const stopSpeech = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

/**
 * 10. Weather Risk Analysis
 */
export const analyzeWeatherRisksAI = async (weatherData: EnvironmentalData) => {
  try {
    const prompt = `Analyze the following environmental conditions for construction site safety risks. Consider ALL readings together and provide practical, specific safety recommendations.

CURRENT CONDITIONS:
- Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feelsLike}°C)
- Humidity: ${weatherData.humidity}%
- Wind Speed: ${weatherData.windSpeed} km/h from ${weatherData.windDirection}
- Weather: ${weatherData.condition}
- Air Quality Index: ${weatherData.aqi}
- Noise Level: ${weatherData.noiseLevel} dB
- UV Index: ${weatherData.uvIndex}
- Visibility: ${weatherData.visibility} km
- Barometric Pressure: ${weatherData.pressure} hPa
- Precipitation Probability: ${weatherData.precipitation}%

SAFETY THRESHOLDS (for reference):
- Temperature >35°C: Heat stress risk. >40°C: Halt outdoor work
- Wind >25 km/h: Restrict elevated work. >40 km/h: Suspend crane operations
- AQI >100: Respiratory protection needed. >150: Limit outdoor exposure
- Noise >85 dB: Hearing protection mandatory
- UV >7: Sun protection, hydration breaks required
- Visibility <1 km: Restrict vehicle movement

Provide actionable safety recommendations that a site HSE officer can immediately implement.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            affectedActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
            workStoppageRequired: { type: Type.BOOLEAN },
          },
          required: ["riskLevel", "summary", "recommendations", "affectedActivities", "workStoppageRequired"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Weather Risk Analysis Error:", error);
    throw error;
  }
};

/**
 * 11. Predictive Safety Alerts
 */
export const predictiveSafetyAlertsAI = async (metrics: any, incidents: any[]) => {
  try {
    const prompt = `Analyze HSE data to predict safety risks for the next 7 days:

Metrics: ${JSON.stringify(metrics)}
Recent Incidents: ${JSON.stringify(incidents.slice(-10))}

Based on patterns, trends, and seasonality, predict potential safety issues and provide proactive mitigation strategies.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  alert: { type: Type.STRING },
                  likelihood: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                  suggestedMitigation: { type: Type.STRING },
                  timeframe: { type: Type.STRING },
                  riskCategory: { type: Type.STRING }
                },
                required: ["alert", "likelihood", "suggestedMitigation"]
              }
            },
            confidence: { type: Type.NUMBER },
            trendsAnalysis: { type: Type.STRING }
          },
          required: ["predictions"]
        }
      }
    });
    return safeParseJSON(response.text, {"predictions": []});
  } catch (error) {
    console.error("Predictive Safety Alerts Error:", error);
    throw error;
  }
};

/**
 * 12. Executive Report Generation
 */
export const generateExecutiveReportAI = async (metrics: any) => {
  try {
    const prompt = `Generate an executive HSE report based on these metrics:

${JSON.stringify(metrics, null, 2)}

Provide a comprehensive executive summary highlighting key performance indicators, trends, and strategic recommendations for HSE improvement.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  timeframe: { type: Type.STRING }
                },
                required: ["title", "description"]
              }
            },
            keyInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            overallScore: { type: Type.NUMBER }
          },
          required: ["executiveSummary", "recommendations"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Executive Report Generation Error:", error);
    throw error;
  }
};

/**
 * 13. Inspection Fix Suggestions
 */
export const suggestInspectionFixAI = async (question: string, comment: string) => {
  try {
    const prompt = `Provide a practical fix suggestion for this failed inspection item:

Inspection Question: "${question}"
Inspector Comment: "${comment}"

Give a concise, actionable recommendation to address this issue and pass the inspection.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            estimatedTime: { type: Type.STRING },
            resources: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["suggestion"]
        }
      }
    });
    
    const result = safeParseJSON(response.text, {"suggestion": ""});
    return result.suggestion || "Unable to provide suggestion at this time.";
  } catch (error) {
    console.error("Inspection Fix Suggestion Error:", error);
    throw error;
  }
};

/**
 * 14. Risk Assessment Functions
 */
export const identifyHazardsAI = async (taskDescription: string, type: string) => {
  try {
    const prompt = `You are a senior HSE officer. For the work task below, generate a complete risk assessment table. For EACH hazard row, provide ALL fields fully filled in.

Task: "${taskDescription}"
Assessment Type: ${type}

Return 3-6 hazard rows. For each row:
- workActivity: the specific work step or activity (e.g. "Rigging and lifting")
- hazard: the specific hazard/risk description
- personAtRisk: who is at risk (e.g. "Rigger, Banksman, Bystanders")
- initialProbability: 1-5 (before controls)
- initialSeverity: 1-5 (before controls)
- controls: array of control measures with type (Elimination/Substitution/Engineering/Administrative/PPE) and description
- actualProbability: 1-5 (after controls applied — should be lower than initial)
- actualSeverity: 1-5 (after controls applied — should be lower or equal to initial)
- additionalControls: any further measures or monitoring required
- priority: Critical / High / Medium / Low
- actionBy: responsible person or role (e.g. "Site Supervisor", "Safety Officer")
- duration: timeframe for action (e.g. "Immediate", "Before task", "Ongoing", "1 week")`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  workActivity:       { type: Type.STRING },
                  hazard:             { type: Type.STRING },
                  personAtRisk:       { type: Type.STRING },
                  initialProbability: { type: Type.INTEGER },
                  initialSeverity:    { type: Type.INTEGER },
                  controls: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type:        { type: Type.STRING, enum: ["Elimination","Substitution","Engineering","Administrative","PPE"] },
                        description: { type: Type.STRING }
                      },
                      required: ["type","description"]
                    }
                  },
                  actualProbability:  { type: Type.INTEGER },
                  actualSeverity:     { type: Type.INTEGER },
                  additionalControls: { type: Type.STRING },
                  priority:           { type: Type.STRING, enum: ["Critical","High","Medium","Low"] },
                  actionBy:           { type: Type.STRING },
                  duration:           { type: Type.STRING }
                },
                required: ["workActivity","hazard","personAtRisk","initialProbability","initialSeverity","controls","actualProbability","actualSeverity","additionalControls","priority","actionBy","duration"]
              }
            }
          },
          required: ["rows"]
        }
      }
    });
    return safeParseJSON(response.text, { rows: [] });
  } catch (error) {
    console.error("Hazard Identification Error:", error);
    throw error;
  }
};

export const suggestControlsAI = async (hazardDescription: string) => {
  try {
    const prompt = `Suggest safety controls for this hazard:

Hazard: "${hazardDescription}"

Provide specific control measures using the hierarchy of controls (Elimination, Substitution, Engineering, Administrative, PPE).`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            controls: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["Elimination", "Substitution", "Engineering", "Administrative", "PPE"] },
                  description: { type: Type.STRING }
                },
                required: ["type", "description"]
              }
            }
          },
          required: ["controls"]
        }
      }
    });
    return safeParseJSON(response.text, {"controls": []});
  } catch (error) {
    console.error("Control Suggestion Error:", error);
    throw error;
  }
};

export const explainRiskScoreAI = async (riskScore: number, description: string, probability: number, severity: number) => {
  try {
    const prompt = `Explain this risk assessment score:

Hazard: "${description}"
Risk Score: ${riskScore} (Probability: ${probability}, Severity: ${severity})

Provide a clear explanation of why this risk score was calculated and what it means.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["explanation"]
        }
      }
    });
    
    const result = safeParseJSON(response.text, {"explanation": ""});
    return result.explanation || "Risk score explanation temporarily unavailable.";
  } catch (error) {
    console.error("Risk Explanation Error:", error);
    throw error;
  }
};

export const reviewRiskAssessmentAI = async (taskDescription: string, hazardsList: string[]) => {
  try {
    const prompt = `Review this risk assessment for completeness and accuracy:

Task: "${taskDescription}"
Identified Hazards: ${hazardsList.join(', ')}

Provide feedback on the risk assessment quality, missing hazards, and improvement suggestions.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            completeness: { type: Type.STRING },
            missingHazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ["overallScore", "completeness", "summary"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Risk Assessment Review Error:", error);
    throw error;
  }
};

/**
 * 15. Observation Trends Analysis
 */
export const analyzeObservationTrendsAI = async (observations: any[]) => {
  try {
    const prompt = `Analyze these safety observations for patterns and trends:

${JSON.stringify(observations.map(o => ({
  type: o.type,
  category: o.category,
  description: o.description,
  date: o.date,
  location: o.location
})), null, 2)}

Identify key themes, recurring patterns, and actionable insights to improve safety performance.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  insight: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["theme", "count", "insight"]
              }
            },
            summary: { type: Type.STRING },
            overallScore: { type: Type.NUMBER }
          },
          required: ["trends"]
        }
      }
    });
    return safeParseJSON(response.text, {"trends": []});
  } catch (error) {
    console.error("Observation Trends Analysis Error:", error);
    throw error;
  }
};

/**
 * 16. Observation Analysis
 */
export const analyzeObservationAI = async (description: string) => {
  try {
    const prompt = `Analyze this safety observation and suggest appropriate classifications:

Observation Description: "${description}"

Based on the description, suggest:
1. Type (Unsafe Act, Unsafe Condition, Near Miss, Good Practice)
2. Category (PPE, Housekeeping, Tools & Equipment, Working at Height, Lifting / Manual Handling, Electrical, Chemicals, Traffic / Vehicles)
3. Immediate action required to address the observation`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { 
              type: Type.STRING, 
              enum: ["Unsafe Act", "Unsafe Condition", "Safe Behavior", "Near Miss"] 
            },
            category: { 
              type: Type.STRING, 
              enum: ["PPE", "Housekeeping", "Tools & Equipment", "Working at Height", "Lifting / Manual Handling", "Electrical", "Chemicals", "Traffic / Vehicles"] 
            },
            immediateAction: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            reasoning: { type: Type.STRING }
          },
          required: ["type", "category", "immediateAction"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Observation Analysis Error:", error);
    throw error;
  }
};

/**
 * 17. Certificate Parsing
 */
export const parseCertificateAI = async (base64Image: string) => {
  try {
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
        { text: "Extract training certificate information: course title, completion date, expiry date, issuing authority." }
      ],
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            courseTitle: { type: Type.STRING },
            completionDate: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            issuingAuthority: { type: Type.STRING },
            certificateNumber: { type: Type.STRING }
          },
          required: ["courseTitle"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Certificate Parsing Error:", error);
    throw error;
  }
};

/**
 * 18. Skill Gap Analysis
 */
export const analyzeSkillGapAI = async (role: string, trainingTitles: string[], incidents: string[]) => {
  try {
    const prompt = `Analyze skill gaps for this worker:

Role: "${role}"
Current Training: ${trainingTitles.join(', ')}
Related Incidents: ${incidents.join(' | ')}

Identify missing training requirements and recommend specific modules to address skill gaps and prevent incidents.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            missingModules: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedModules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                },
                required: ["title", "reason"]
              }
            },
            summary: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] }
          },
          required: ["score", "missingModules", "recommendedModules", "summary"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Skill Gap Analysis Error:", error);
    throw error;
  }
};

/**
 * 19. PPE Stock Analysis
 */
export const analyzePPEStockAI = async (lowStockItems: any[]) => {
  try {
    const prompt = `Analyze low PPE stock situation and provide recommendations:

Low Stock Items:
${lowStockItems.map(item => 
  `- ${item.name} (Category: ${item.category}, Current: ${item.stockQuantity}, Min: ${item.minStockThreshold})`
).join('\n')}

Assess the safety impact and provide specific action recommendations for restocking and risk mitigation.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyImpact: { type: Type.STRING },
            estimatedRestockTime: { type: Type.STRING },
            alternativeSources: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["priority", "summary", "recommendations"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("PPE Stock Analysis Error:", error);
    throw error;
  }
};

/**
 * 20. Permit Audit
 */
export const auditPermitAI = async (permitType: string, description: string, controlsText: string[], hazards: string[]) => {
  try {
    const prompt = `Audit this work permit for safety compliance:

Permit Type: ${permitType}
Work Description: "${description}"
Control Measures: ${controlsText.join(', ')}
Associated Hazards: ${hazards.join(', ')}

Review for completeness, adequacy of controls, and compliance with safety standards. Identify any gaps or missing requirements.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            overallRating: { type: Type.STRING, enum: ["Pass", "Conditional", "Fail"] },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingControls: { type: Type.ARRAY, items: { type: Type.STRING } },
            complianceScore: { type: Type.INTEGER }
          },
          required: ["issues", "overallRating"]
        }
      }
    });
    return safeParseJSON(response.text, {"issues": [], "overallRating": "Pass"});
  } catch (error) {
    console.error("Permit Audit Error:", error);
    throw error;
  }
};

/**
 * 21. Certificate Data Extraction for Assets
 */
export const extractCertificateDataAI = async (base64Image: string) => {
  try {
    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
        { text: "Extract certificate/document information for asset management: document title, expiry date, certificate number, type." }
      ],
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            certificateNumber: { type: Type.STRING },
            documentType: { type: Type.STRING },
            issuingAuthority: { type: Type.STRING },
            issueDate: { type: Type.STRING }
          },
          required: ["title"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Certificate Data Extraction Error:", error);
    throw error;
  }
};

/**
 * 22. Contractor Compliance Evaluation
 */
export const evaluateContractorComplianceAI = async (contractor: any, workerCount: number) => {
  try {
    const prompt = `Evaluate contractor compliance and performance:

Contractor: ${contractor.name}
Contact: ${contractor.contactPerson} (${contractor.email})
Current Status: ${contractor.status}
Worker Count: ${workerCount}
Documents: ${contractor.documents.map((d: any) => `${d.title} (${d.type})`).join(', ')}
Current Compliance Score: ${contractor.complianceScore}

Assess contractor compliance, identify issues, and provide performance rating based on documentation, worker management, and safety standards.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complianceScore: { type: Type.INTEGER },
            performanceRating: { type: Type.STRING, enum: ["Excellent", "Good", "Fair", "Poor"] },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextReviewDate: { type: Type.STRING }
          },
          required: ["complianceScore", "performanceRating", "issues"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Contractor Compliance Evaluation Error:", error);
    throw error;
  }
};

/**
 * 23. Document Summarization
 */
export const summarizeDocumentAI = async (contentUrl: string, title: string) => {
  try {
    const prompt = `Summarize this HSE document for quick reference:

Document Title: "${title}"
Content: ${contentUrl}

Provide a concise summary highlighting key safety requirements, procedures, and important points for HSE management.`;

    const response = await aiGenerate({
      model: MODEL_NAME,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64(contentUrl) } },
        { text: prompt }
      ],
      config: {
        ...NO_THINK,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            documentType: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            applicableRoles: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary"]
        }
      }
    });
    return safeParseJSON(response.text, {});
  } catch (error) {
    console.error("Document Summarization Error:", error);
    throw error;
  }
};

// Remaining logic for analyzeRiskTrendsAI, etc. follows the MODEL_NAME + JSON schema pattern.