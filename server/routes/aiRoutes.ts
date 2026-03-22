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
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Allowlist of valid model names
const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

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

    // Validate model name if provided
    const safeModel = model && ALLOWED_MODELS.includes(model) ? model : 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: safeModel,
      contents,
      config,
    });

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
      res.status(503).json({ error: 'AI service authentication failed. Please check that the GEMINI_API_KEY is valid and not expired.' });
      return;
    }
    console.error('[AI Proxy] Generate error:', err.message);
    res.status(500).json({ error: err.message || 'AI generation failed' });
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

    // Validate model name if provided
    const safeModel = model && ALLOWED_MODELS.includes(model) ? model : 'gemini-2.5-flash';

    const chat = ai.chats.create({
      model: safeModel,
      history: history || [],
      config,
    });

    const result = await chat.sendMessage({ message });
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
      res.status(503).json({ error: 'AI service authentication failed. Please check that the GEMINI_API_KEY is valid and not expired.' });
      return;
    }
    console.error('[AI Proxy] Chat error:', err.message);
    res.status(500).json({ error: err.message || 'AI chat failed' });
  }
});

export default router;
