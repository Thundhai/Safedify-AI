import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../auth.js';
import { runAgent, AgentMessage } from '../agent/agent.js';
import db from '../db.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.use(authenticate);

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
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Load or create conversation
    let convId = conversationId;
    let history: AgentMessage[] = [];

    if (convId) {
      const row = db.prepare('SELECT messages FROM agent_conversations WHERE id = ? AND user_id = ?')
        .get(convId, req.user?.id) as any;
      if (row) {
        history = JSON.parse(row.messages);
      }
    } else {
      convId = uuid();
    }

    // Run the agent
    const { response, toolCalls } = await runAgent(message, history);

    // Update history
    history.push({ role: 'user', text: message });
    history.push({ role: 'model', text: response, toolCalls });

    // Keep last 40 messages to prevent context overflow
    if (history.length > 40) {
      history = history.slice(-40);
    }

    // Save conversation
    const existing = db.prepare('SELECT id FROM agent_conversations WHERE id = ?').get(convId);
    if (existing) {
      db.prepare(
        "UPDATE agent_conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(JSON.stringify(history), convId);
    } else {
      db.prepare(
        'INSERT INTO agent_conversations (id, user_id, messages) VALUES (?, ?, ?)'
      ).run(convId, req.user?.id, JSON.stringify(history));
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
    console.error('[Agent Route Error]', err);
    res.status(500).json({ error: err.message || 'Agent error' });
  }
});

/**
 * GET /api/agent/conversations
 * List user's agent conversations
 */
router.get('/conversations', (req: AuthRequest, res: Response) => {
  const rows = db.prepare(
    'SELECT id, created_at, updated_at FROM agent_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50'
  ).all(req.user?.id);
  res.json(rows);
});

/**
 * GET /api/agent/conversations/:id
 * Get full conversation history
 */
router.get('/conversations/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare(
    'SELECT * FROM agent_conversations WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user?.id) as any;

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
router.delete('/conversations/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM agent_conversations WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user?.id);
  res.json({ message: 'Deleted' });
});

export default router;
