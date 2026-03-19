import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../auth.js';
import { runAgent, AgentMessage } from '../agent/agent.js';
import pool from '../postgres';
import { v4 as uuid } from 'uuid';
import { validate, ValidationSchema, sanitizeString } from '../middleware/inputValidation.js';

const router = Router();

router.use(authenticate);

// Validation schema for chat endpoint
const chatSchema: ValidationSchema = {
  message: { type: 'string', required: true, maxLength: 10000, trim: true, allowInjection: true },
  conversationId: { type: 'uuid', required: false },
};

/**
 * POST /api/agent/chat
 * Body: { message: string, conversationId?: string }
 * 
 * The agent will:
 *   1. Load conversation history (if conversationId provided)
 *   2. Run the ReAct agent loop (tool calls + reasoning)
 *   3. Save updated conversation
 *   4. Return the response + tool calls made
 */
router.post('/chat', validate(chatSchema), async (req: AuthRequest, res: Response) => {
  // Early check for API key configuration
  if (!process.env.GEMINI_API_KEY) {
    console.error('[Agent] GEMINI_API_KEY not configured in environment');
    res.status(503).json({ 
      error: 'AI Agent is not configured. The GEMINI_API_KEY environment variable is missing on the server.',
      hint: 'In Vercel: Settings → Environment Variables → Add GEMINI_API_KEY (ensure Production is checked) → Redeploy'
    });
    return;
  }

  try {
    const { message, conversationId } = req.body;
    
    // Sanitize message content to prevent prompt injection in AI context
    const sanitizedMessage = sanitizeString(message, { stripHtml: true, maxLength: 10000 });

    if (!sanitizedMessage || sanitizedMessage.length < 1) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Load or create conversation
    let convId = conversationId;
    let history: AgentMessage[] = [];

    if (convId) {
      const { rows } = await pool.query('SELECT messages FROM agent_conversations WHERE id = $1 AND user_id = $2', [convId, req.user?.id]);
      if (rows[0]) {
        history = JSON.parse(rows[0].messages);
      }
    } else {
      convId = uuid();
    }

    // Run the agent
    const { response, toolCalls } = await runAgent(sanitizedMessage, history, {
      userId: req.user?.id,
      userName: req.user?.name,
    });

    // Update history
    history.push({ role: 'user', text: sanitizedMessage });
    history.push({ role: 'model', text: response, toolCalls });

    // Keep last 40 messages to prevent context overflow
    if (history.length > 40) {
      history = history.slice(-40);
    }

    // Save conversation
    const { rows: existingRows } = await pool.query('SELECT id FROM agent_conversations WHERE id = $1 AND user_id = $2', [convId, req.user?.id]);
    if (existingRows[0]) {
      await pool.query(
        'UPDATE agent_conversations SET messages = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [JSON.stringify(history), convId, req.user?.id]
      );
    } else {
      await pool.query(
        'INSERT INTO agent_conversations (id, user_id, messages, org_id) VALUES ($1, $2, $3, $4)',
        [convId, req.user?.id, JSON.stringify(history), req.user?.org_id]
      );
    }

    res.json({
      conversationId: convId,
      response,
      toolCalls: toolCalls.map(tc => ({
        tool: tc.name,
        args: tc.args,
        resultPreview: JSON.stringify(tc.result).slice(0, 500)
      }))
    });
  } catch (err: any) {
    // Forward 429 rate-limit status properly
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
      const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending another request.', retryAfter });
      return;
    }
    console.error('[Agent Route Error]', err);
    res.status(500).json({ error: err.message || 'Agent error' });
  }
});

/**
 * GET /api/agent/conversations
 * List user's agent conversations
 */
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  const { rows } = await pool.query(
    'SELECT id, created_at, updated_at FROM agent_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50',
    [req.user?.id]
  );
  res.json(rows);
});

/**
 * GET /api/agent/conversations/:id
 * Get full conversation history
 */
router.get('/conversations/:id', async (req: AuthRequest, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM agent_conversations WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user?.id]
  );
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json({
    id: row.id,
    messages: JSON.parse(row.messages),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
});

/**
 * DELETE /api/agent/conversations/:id
 */
router.delete('/conversations/:id', async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM agent_conversations WHERE id = $1 AND user_id = $2', [req.params.id, req.user?.id]);
  res.json({ message: 'Deleted' });
});

export default router;
