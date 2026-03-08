/**
 * Safedify AI Agent — ReAct-style agent loop
 * 
 * Architecture:
 *   User message → Agent (Gemini) → may call tools → observe results → reason → respond
 *   Supports multi-step reasoning with up to 10 tool calls per turn.
 */
import { GoogleGenAI } from '@google/genai';
import { toolMap, getToolDeclarations } from './tools.js';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[Agent] No GEMINI_API_KEY set — agent will not function.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL = 'gemini-2.5-flash';
const MAX_TOOL_ROUNDS = 10;

const SYSTEM_INSTRUCTION = `You are Safedify AI Agent — an intelligent HSE (Health, Safety & Environment) assistant for industrial workplaces.

Your capabilities:
1. **Query & Analyze**: Search incidents, observations, actions, permits, workers, inspections, and more from the SQLite database using your tools.
2. **Calculate Metrics**: Compute TRIR, LTIFR, safety scores, and other KPIs.
3. **Create Records**: Log new incidents, create corrective actions.
4. **Custom SQL**: Run read-only SQL queries for complex analysis.
5. **Safety Expertise**: Provide HSE guidance based on OSHA, ISO 45001, and industry standards.

Guidelines:
- Always use tools to fetch real data before answering questions about the organization's safety status.
- When the user asks about incidents, metrics, or trends, query the database first — never guess.
- Provide actionable recommendations grounded in the data.
- If asked to create an incident or action, confirm the details with the user and use the appropriate tool.
- Format responses clearly with bullet points and sections when appropriate.
- Be professional but approachable. Safety is serious but your tone should be helpful, not alarming.
- When computing rates (TRIR, LTIFR), always state the formula and inputs used.
- If data is insufficient, say so clearly rather than making up numbers.`;

export interface AgentMessage {
  role: 'user' | 'model';
  text: string;
  toolCalls?: { name: string; args: any; result: any }[];
}

/**
 * Run the agent for a single user turn.
 * Implements a ReAct loop: the model can call tools, observe results, and keep reasoning
 * until it produces a final text response (no more tool calls).
 */
export async function runAgent(
  userMessage: string,
  conversationHistory: AgentMessage[] = [],
  userContext?: { userId?: string; userName?: string }
): Promise<{ response: string; toolCalls: { name: string; args: any; result: any }[] }> {
  if (!ai) {
    return {
      response: 'AI Agent is not available. Please configure the GEMINI_API_KEY environment variable.',
      toolCalls: []
    };
  }

  // Build conversation contents for Gemini
  const contents: any[] = [];

  // Add conversation history
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }]
    });
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  // Tool declarations for function calling
  const tools = [{
    functionDeclarations: getToolDeclarations()
  }];

  const allToolCallsMade: { name: string; args: any; result: any }[] = [];

  // ReAct loop
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools,
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      return { response: 'Agent received no response from the model.', toolCalls: allToolCallsMade };
    }

    const parts = candidate.content?.parts || [];

    // Check if model wants to call functions
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      // No more tool calls — extract final text response
      const textParts = parts.filter((p: any) => p.text);
      const finalText = textParts.map((p: any) => p.text).join('\n');
      return { response: finalText || 'Agent completed without a text response.', toolCalls: allToolCallsMade };
    }

    // Execute each function call
    const functionResponses: any[] = [];

    for (const part of functionCalls) {
      const fc = part.functionCall;
      if (!fc) continue;
      const toolName = fc.name ?? '';
      const toolArgs = fc.args || {};

      console.log(`[Agent] Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);

      const tool = toolMap.get(toolName);
      let result: any;

      if (tool) {
        try {
          // Inject user context for tools that create records
          const argsWithContext = (toolName === 'create_incident' || toolName === 'create_action')
            ? { ...toolArgs, _userId: userContext?.userId, _userName: userContext?.userName }
            : toolArgs;
          result = tool.execute(argsWithContext);
        } catch (err: any) {
          result = { error: err.message };
        }
      } else {
        result = { error: `Unknown tool: ${toolName}` };
      }

      allToolCallsMade.push({ name: toolName as string, args: toolArgs, result });

      functionResponses.push({
        functionResponse: {
          name: toolName as string,
          response: { result: JSON.stringify(result).slice(0, 15000) } // cap size
        }
      });
    }

    // Add model's response (with function calls) to conversation
    contents.push({
      role: 'model',
      parts
    });

    // Add function results back
    contents.push({
      role: 'function' as any,
      parts: functionResponses
    });
  }

  return {
    response: 'Agent reached maximum tool call rounds. Here is what I found so far based on the data collected.',
    toolCalls: allToolCallsMade
  };
}
