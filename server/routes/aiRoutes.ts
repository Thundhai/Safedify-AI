/**
 * AI Proxy Routes — Proxies Gemini API calls through the server
 * 
 * This keeps the GEMINI_API_KEY on the server side instead of exposing it
 * in the frontend bundle. The frontend sends prompt/schema configs here,
 * and the server forwards them to Google Gemini.
 */
import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../auth.js';
import { GoogleGenAI } from '@google/genai';
const router = Router();
router.use(authenticate);

// Use consistent GEMINI_API_KEY env var
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[AI Routes] GEMINI_API_KEY not set - AI features will be disabled');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Allowlist of valid model names for @google/genai SDK (March 2026)
// To update: Review https://ai.google.dev/models/gemini regularly for new/retired models.
// Update this list as Gemini/AI models evolve to ensure compatibility and access to latest features.
const ALLOWED_MODELS = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.0-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-pro-001',
];

// Fallback model if preferred model fails (most stable/available)
const FALLBACK_MODEL = 'gemini-2.0-flash';

/**
 * POST /api/ai/generate
 * Body: { model?: string, contents: any, config?: any }
 * 
 * Generic proxy for ai.models.generateContent()
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  if (!ai) {
    res.status(503).json({ error: 'AI service not configured. Set GEMINI_API_KEY on the server.' });
    return;
  }

  try {
    const { model, contents, config } = req.body;

    if (!contents && contents !== '') {
      res.status(400).json({ error: 'contents is required' });
      return;
    }

    // contents must be a string, array, or object (all valid for Google GenAI SDK)
    if (typeof contents !== 'string' && !Array.isArray(contents) && typeof contents !== 'object') {
      res.status(400).json({ error: 'contents must be a string, array, or object' });
      return;
    }

    // Validate model name if provided - use gemini-2.0-flash as default
    const requestedModel = model && ALLOWED_MODELS.includes(model) ? model : 'gemini-2.0-flash';

    // Try with requested model, fallback to stable model if it fails with model-specific error
    let response;
    try {
      response = await ai.models.generateContent({
        model: requestedModel,
        contents,
        config,
      });
    } catch (modelErr: any) {
      // If model not found or unavailable, try fallback
      if (requestedModel !== FALLBACK_MODEL && (modelErr.message?.includes('not found') || modelErr.message?.includes('not supported') || modelErr.status === 404)) {
        console.warn(`[AI Proxy] Model ${requestedModel} unavailable, falling back to ${FALLBACK_MODEL}`);
        response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents,
          config,
        });
      } else {
        throw modelErr;
      }
    }

    res.json({ text: response.text || '' });
  } catch (err: any) {
    // Forward 429 rate-limit status properly
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
      const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending another request.', retryAfter });
      return;
    }
    // Handle API key errors
    if (err.message?.includes('API key') || err.message?.includes('invalid') || err.message?.includes('expired') || err.status === 401 || err.status === 403) {
      console.error('[AI Proxy] API key error:', err.message);
      console.error('[AI Proxy] Request body:', JSON.stringify(req.body));
      console.error('[AI Proxy] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
      if (err.stack) console.error('[AI Proxy] Stack:', err.stack);
      res.status(503).json({ error: 'AI service authentication failed. Please check that the GEMINI_API_KEY is valid and not expired.' });
      return;
    }
    // Log all other errors with stack and request context
    console.error('[AI Proxy] Generate error:', err.message);
    if (err.stack) console.error('[AI Proxy] Stack:', err.stack);
    console.error('[AI Proxy] Request body:', JSON.stringify(req.body));
    console.error('[AI Proxy] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    res.status(500).json({ error: err.message || 'AI generation failed', details: err.stack });
  }
});

/**
 * POST /api/ai/chat
 * Body: { model?: string, history: any[], config?: any, message: any }
 * 
 * Generic proxy for ai.chats.create() + sendMessage()
 */
router.post('/chat', async (req: AuthRequest, res: Response) => {
  if (!ai) {
    res.status(503).json({ error: 'AI service not configured. Set GEMINI_API_KEY on the server.' });
    return;
  }

  try {
    const { model, history, config, message } = req.body;

    if (!message || typeof message !== 'object') {
      res.status(400).json({ error: 'message is required and must be an object' });
      return;
    }

    // Validate history if provided
    if (history && (!Array.isArray(history) || history.length > 100)) {
      res.status(400).json({ error: 'history must be an array with at most 100 items' });
      return;
    }

    // Validate model name if provided - use gemini-2.0-flash as default
    const requestedModel = model && ALLOWED_MODELS.includes(model) ? model : 'gemini-2.0-flash';

    // Try with requested model, fallback to stable model if it fails
    let result;
    try {
      const chat = ai.chats.create({
        model: requestedModel,
        history: history || [],
        config,
      });
      result = await chat.sendMessage({ message });
    } catch (modelErr: any) {
      if (requestedModel !== FALLBACK_MODEL && (modelErr.message?.includes('not found') || modelErr.message?.includes('not supported') || modelErr.status === 404)) {
        console.warn(`[AI Proxy] Model ${requestedModel} unavailable, falling back to ${FALLBACK_MODEL}`);
        const chat = ai.chats.create({
          model: FALLBACK_MODEL,
          history: history || [],
          config,
        });
        result = await chat.sendMessage({ message });
      } else {
        throw modelErr;
      }
    }

    res.json({ text: result.text || '' });
  } catch (err: any) {
    // Forward 429 rate-limit status properly
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
      const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending another request.', retryAfter });
      return;
    }
    // Handle API key errors
    if (err.message?.includes('API key') || err.message?.includes('invalid') || err.message?.includes('expired') || err.status === 401 || err.status === 403) {
      console.error('[AI Proxy] API key error:', err.message);
      console.error('[AI Proxy] Request body:', JSON.stringify(req.body));
      console.error('[AI Proxy] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
      if (err.stack) console.error('[AI Proxy] Stack:', err.stack);
      res.status(503).json({ error: 'AI service authentication failed. Please check that the GEMINI_API_KEY is valid and not expired.' });
      return;
    }
    // Log all other errors with stack and request context
    console.error('[AI Proxy] Chat error:', err.message);
    if (err.stack) console.error('[AI Proxy] Stack:', err.stack);
    console.error('[AI Proxy] Request body:', JSON.stringify(req.body));
    console.error('[AI Proxy] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    res.status(500).json({ error: err.message || 'AI chat failed', details: err.stack });
  }
});

/**
 * GET /api/ai/status
 * Check if AI service is configured and working
 */
router.get('/status', async (_req: AuthRequest, res: Response) => {
  if (!ai) {
    res.json({ 
      status: 'disabled', 
      message: 'AI service not configured. GEMINI_API_KEY is not set.',
      apiKeySet: false 
    });
    return;
  }

  try {
    const timeoutMs = Math.max(500, parseInt(process.env.AI_STATUS_TIMEOUT_MS || '4000', 10));

    // Test with a simple request
    const response = await Promise.race([
      ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: 'Say "OK" in one word.',
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`AI status check timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]);

    const typedResponse = response as { text?: string };

    res.json({ 
      status: 'ok', 
      message: 'AI service is working.',
      apiKeySet: true,
      model: FALLBACK_MODEL,
      testResponse: typedResponse.text?.substring(0, 50)
    });
  } catch (err: any) {
    console.error('[AI Status Check] Error:', err.message);
    if (err.stack) console.error('[AI Status Check] Stack:', err.stack);
    console.error('[AI Status Check] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    res.json({ 
      status: 'error', 
      message: err.message || 'Unknown error',
      apiKeySet: true,
      errorType: err.status === 401 || err.status === 403 ? 'authentication' : 
                 err.status === 429 ? 'rate_limit' : 'other',
      details: err.stack
    });
  }
});

export default router;
