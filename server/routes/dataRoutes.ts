import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { AuthRequest, authenticate, requirePermission } from '../auth.js';
import { notify, notifyAllManagers } from '../services/notificationService.js';

const router = Router();

// All routes require auth
router.use(authenticate);

// ---------- PAGINATION HELPER ----------
function paginate(req: AuthRequest, res: Response, table: string, orderBy = 'created_at DESC', where = '', whereParams: any[] = []) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  const whereClause = where ? `WHERE ${where}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`).get(...whereParams) as any;
  const total = countRow?.total || 0;
  const rows = db.prepare(`SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...whereParams, limit, offset);

  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(Math.ceil(total / limit)));
  res.json(rows);
}

// ---------- INCIDENTS ----------

router.get('/incidents', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'incidents');
});

router.get('/incidents/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(row);
});

router.post('/incidents', (req: AuthRequest, res: Response) => {
  const b = req.body;
  const id = uuid();
  db.prepare(
    `INSERT INTO incidents (id, description, location, date, type, category, severity, status, reported_by, image, images,
      root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action,
      date_reported, department, shift, weather_conditions, task_being_performed,
      injured_persons, witnesses, ppe_worn, ppe_adequate, environmental_impact,
      immediate_actions_taken, area_secured, emergency_services_notified, regulatory_notification)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, b.description ?? null, b.location ?? null, b.date || new Date().toISOString(), b.type ?? null, b.category || 'Near Miss',
    b.severity ?? null, b.status || 'Open', req.user?.id ?? null,
    b.image || (b.images?.[0] ?? null),
    b.images ? JSON.stringify(b.images) : null,
    b.root_cause ?? null, b.corrective_actions ?? null, b.days_lost || 0,
    b.body_part ?? null, b.mechanism ?? null, b.immediate_action ?? null,
    b.date_reported || new Date().toISOString(), b.department ?? null, b.shift ?? null, b.weather_conditions ?? null, b.task_being_performed ?? null,
    b.injured_persons ? JSON.stringify(b.injured_persons) : null,
    b.witnesses ? JSON.stringify(b.witnesses) : null,
    b.ppe_worn ? JSON.stringify(b.ppe_worn) : null,
    b.ppe_adequate != null ? (b.ppe_adequate ? 1 : 0) : null,
    b.environmental_impact ?? null, b.immediate_actions_taken ?? null,
    b.area_secured ? 1 : 0, b.emergency_services_notified ? 1 : 0, b.regulatory_notification ? 1 : 0);
  res.status(201).json({ id, message: 'Incident created' });

  // Fire-and-forget notification
  notifyAllManagers({
    type: b.severity === 'Critical' || b.severity === 'High' ? 'danger' : 'warning',
    title: `New Incident Reported`,
    message: `A ${b.severity || 'new'} ${b.type || 'incident'} has been reported at ${b.location || 'site'}. Description: ${(b.description || '').slice(0, 120)}`,
    entityType: 'incident',
    entityId: id,
  }).catch(err => console.error('[Notify] incident create:', err.message));
});

router.put('/incidents/:id', (req: AuthRequest, res: Response) => {
  const b = req.body;
  // Build dynamic SET clause for only provided fields
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, any> = {
    description: b.description, location: b.location, date: b.date,
    type: b.type, category: b.category, severity: b.severity, status: b.status,
    root_cause: b.root_cause, corrective_actions: b.corrective_actions,
    days_lost: b.days_lost, body_part: b.body_part, mechanism: b.mechanism,
    immediate_action: b.immediate_action, date_reported: b.date_reported,
    department: b.department, shift: b.shift, weather_conditions: b.weather_conditions,
    task_being_performed: b.task_being_performed,
    environmental_impact: b.environmental_impact, immediate_actions_taken: b.immediate_actions_taken,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) { fields.push(`${col}=?`); values.push(val); }
  }
  // JSON fields
  if (b.images !== undefined) { fields.push('images=?'); values.push(JSON.stringify(b.images)); fields.push('image=?'); values.push(b.images?.[0] ?? null); }
  if (b.injured_persons !== undefined) { fields.push('injured_persons=?'); values.push(JSON.stringify(b.injured_persons)); }
  if (b.witnesses !== undefined) { fields.push('witnesses=?'); values.push(JSON.stringify(b.witnesses)); }
  if (b.ppe_worn !== undefined) { fields.push('ppe_worn=?'); values.push(JSON.stringify(b.ppe_worn)); }
  // Boolean fields
  if (b.ppe_adequate !== undefined) { fields.push('ppe_adequate=?'); values.push(b.ppe_adequate != null ? (b.ppe_adequate ? 1 : 0) : null); }
  if (b.area_secured !== undefined) { fields.push('area_secured=?'); values.push(b.area_secured ? 1 : 0); }
  if (b.emergency_services_notified !== undefined) { fields.push('emergency_services_notified=?'); values.push(b.emergency_services_notified ? 1 : 0); }
  if (b.regulatory_notification !== undefined) { fields.push('regulatory_notification=?'); values.push(b.regulatory_notification ? 1 : 0); }

  fields.push("updated_at=datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id=?`).run(...values);
  res.json({ message: 'Updated' });

  // Notify on status change
  if (b.status) {
    const inc = db.prepare('SELECT reported_by, type, location FROM incidents WHERE id = ?').get(req.params.id) as any;
    if (inc?.reported_by) {
      notify({
        userId: inc.reported_by,
        type: b.status === 'Closed' ? 'success' : 'info',
        title: `Incident Status → ${b.status}`,
        message: `The ${inc.type || 'incident'} at ${inc.location || 'site'} has been updated to "${b.status}".`,
        entityType: 'incident',
        entityId: req.params.id as string,
      }).catch(err => console.error('[Notify] incident update:', err.message));
    }
  }
});

router.delete('/incidents/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- ACTIONS ----------

router.get('/actions', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'actions');
});

router.post('/actions', requirePermission('create_incident'), (req: AuthRequest, res: Response) => {
  const { title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, effectiveness } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO actions (id, title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, effectiveness) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(id, title, description, assignee, due_date, priority || 'Medium', status || 'Open', action_type || 'Corrective', category || 'Other', indicator || 'Lagging', related_incident_id, effectiveness || 'Not Assessed');
  res.status(201).json({ id });

  // Notify assignee if set
  if (assignee) {
    const worker = db.prepare('SELECT id FROM users WHERE name = ? OR id = ?').get(assignee, assignee) as any;
    if (worker) {
      notify({
        userId: worker.id,
        type: priority === 'Critical' ? 'danger' : 'info',
        title: 'New Action Assigned to You',
        message: `Action: "${title}" (${priority || 'Medium'} priority). Due: ${due_date || 'No date set'}.`,
        entityType: 'action',
        entityId: id,
      }).catch(err => console.error('[Notify] action create:', err.message));
    }
  }
});

router.put('/actions/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { title, description, assignee, due_date, completed_date, priority, status, action_type, category, indicator, verified_by, effectiveness } = req.body;
  db.prepare(
    `UPDATE actions SET title=COALESCE(?,title), description=COALESCE(?,description), assignee=COALESCE(?,assignee),
     due_date=COALESCE(?,due_date), completed_date=COALESCE(?,completed_date), priority=COALESCE(?,priority),
     status=COALESCE(?,status), action_type=COALESCE(?,action_type), category=COALESCE(?,category),
     indicator=COALESCE(?,indicator), verified_by=COALESCE(?,verified_by), effectiveness=COALESCE(?,effectiveness) WHERE id=?`
  ).run(title, description, assignee, due_date, completed_date, priority, status, action_type, category, indicator, verified_by, effectiveness, req.params.id);
  res.json({ message: 'Updated' });

  // Notify on status change
  if (status) {
    const action = db.prepare('SELECT assignee, title FROM actions WHERE id = ?').get(req.params.id) as any;
    if (action?.assignee) {
      const worker = db.prepare('SELECT id FROM users WHERE name = ? OR id = ?').get(action.assignee, action.assignee) as any;
      if (worker) {
        notify({
          userId: worker.id,
          type: status === 'Done' ? 'success' : 'info',
          title: `Action Status → ${status}`,
          message: `The action "${action.title}" status has been updated to "${status}".`,
          entityType: 'action',
          entityId: req.params.id as string,
        }).catch(err => console.error('[Notify] action update:', err.message));
      }
    }
  }
});

router.delete('/actions/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM actions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- OBSERVATIONS ----------

router.get('/observations', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'observations');
});

router.post('/observations', requirePermission('create_incident'), (req: AuthRequest, res: Response) => {
  const { type, category, description, location, date, observer, is_anonymous, immediate_action, images } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO observations (id, type, category, description, location, date, observer, is_anonymous, immediate_action, images) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(id, type, category, description, location, date || new Date().toISOString(), observer, is_anonymous ? 1 : 0, immediate_action, JSON.stringify(images || []));
  res.status(201).json({ id });
});

router.put('/observations/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { type, category, description, location, date, observer, status, immediate_action, images } = req.body;
  db.prepare(
    `UPDATE observations SET type=COALESCE(?,type), category=COALESCE(?,category), description=COALESCE(?,description),
     location=COALESCE(?,location), date=COALESCE(?,date), observer=COALESCE(?,observer), status=COALESCE(?,status),
     immediate_action=COALESCE(?,immediate_action), images=COALESCE(?,images) WHERE id=?`
  ).run(type, category, description, location, date, observer, status, immediate_action, images ? JSON.stringify(images) : null, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/observations/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM observations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- INSPECTIONS ----------

router.get('/inspections', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'inspections');
});

router.post('/inspections', requirePermission('perform_inspection'), (req: AuthRequest, res: Response) => {
  const { template_name, title, date, location, items, score, completed, signature } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO inspections (id, template_name, title, date, location, inspector, items, score, completed, signature) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(id, template_name, title, date, location, req.user?.id, JSON.stringify(items || []), score || 0, completed ? 1 : 0, signature);
  res.status(201).json({ id });
});

// ---------- PERMITS ----------

router.get('/permits', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'permits');
});

router.post('/permits', requirePermission('create_permit'), (req: AuthRequest, res: Response) => {
  const { type, location, description, valid_from, valid_until, requestor, status, controls } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO permits (id, type, location, description, valid_from, valid_until, requestor, status, controls) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, type, location, description, valid_from, valid_until, requestor, status || 'Draft', JSON.stringify(controls || []));
  res.status(201).json({ id });
});

router.put('/permits/:id', requirePermission('approve_permit'), (req: AuthRequest, res: Response) => {
  const { status, approver, approver_comments } = req.body;
  db.prepare(
    'UPDATE permits SET status=COALESCE(?,status), approver=COALESCE(?,approver), approver_comments=COALESCE(?,approver_comments) WHERE id=?'
  ).run(status, approver, approver_comments, req.params.id);
  res.json({ message: 'Updated' });

  // Notify permit requestor on status change
  if (status) {
    const permit = db.prepare('SELECT requestor, type, location FROM permits WHERE id = ?').get(req.params.id) as any;
    if (permit?.requestor) {
      const requestorUser = db.prepare('SELECT id FROM users WHERE name = ? OR id = ?').get(permit.requestor, permit.requestor) as any;
      if (requestorUser) {
        notify({
          userId: requestorUser.id,
          type: status === 'Active' ? 'success' : status === 'Rejected' ? 'danger' : 'info',
          title: `Permit ${status}`,
          message: `Your ${permit.type || 'permit'} for ${permit.location || 'site'} has been ${status.toLowerCase()}.${approver_comments ? ` Comment: ${approver_comments}` : ''}`,
          entityType: 'permit',
          entityId: req.params.id as string,
        }).catch(err => console.error('[Notify] permit update:', err.message));
      }
    }
    // Also notify managers of permit approval/rejection
    notifyAllManagers({
      type: status === 'Active' ? 'success' : status === 'Rejected' ? 'warning' : 'info',
      title: `Permit ${status}: ${permit?.type || 'Unknown'}`,
      message: `${permit?.type || 'Permit'} at ${permit?.location || 'site'} has been ${status.toLowerCase()}.`,
      entityType: 'permit',
      entityId: req.params.id as string,
    }).catch(err => console.error('[Notify] permit managers:', err.message));
  }
});

router.delete('/permits/:id', requirePermission('approve_permit'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM permits WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- WORKERS ----------

router.get('/workers', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'workers');
});

router.get('/workers/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Worker not found' }); return; }
  res.json(row);
});

router.post('/workers', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const { name, role, department, company_id, joined_date, email, phone } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO workers (id, name, role, department, company_id, joined_date, email, phone) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, role, department, company_id, joined_date, email, phone);
  res.status(201).json({ id });
});

router.put('/workers/:id', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const { name, role, department, email, phone, points, level } = req.body;
  db.prepare(
    'UPDATE workers SET name=COALESCE(?,name), role=COALESCE(?,role), department=COALESCE(?,department), email=COALESCE(?,email), phone=COALESCE(?,phone), points=COALESCE(?,points), level=COALESCE(?,level) WHERE id=?'
  ).run(name, role, department, email, phone, points, level, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/workers/:id', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM workers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- CONTRACTORS ----------

router.get('/contractors', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'contractors');
});

router.get('/contractors/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM contractors WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Contractor not found' }); return; }
  res.json(row);
});

router.post('/contractors', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const { name, contact_person, email, phone, status } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO contractors (id, name, contact_person, email, phone, status) VALUES (?,?,?,?,?,?)'
  ).run(id, name, contact_person, email, phone, status || 'Pending');
  res.status(201).json({ id });
});

router.put('/contractors/:id', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const { name, contact_person, email, phone, status } = req.body;
  db.prepare(
    `UPDATE contractors SET name=COALESCE(?,name), contact_person=COALESCE(?,contact_person),
     email=COALESCE(?,email), phone=COALESCE(?,phone), status=COALESCE(?,status),
     updated_at=datetime('now') WHERE id=?`
  ).run(name, contact_person, email, phone, status, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/contractors/:id', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM contractors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- ASSETS ----------

router.get('/assets', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'assets');
});

router.get('/assets/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Asset not found' }); return; }
  res.json(row);
});

router.post('/assets', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { name, category, model_number, serial_number, location, status, next_inspection_date } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO assets (id, name, category, model_number, serial_number, location, status, next_inspection_date) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, category, model_number, serial_number, location, status || 'Active', next_inspection_date);
  res.status(201).json({ id });
});

router.put('/assets/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { name, category, model_number, serial_number, location, status, next_inspection_date } = req.body;
  db.prepare(
    `UPDATE assets SET name=COALESCE(?,name), category=COALESCE(?,category),
     model_number=COALESCE(?,model_number), serial_number=COALESCE(?,serial_number),
     location=COALESCE(?,location), status=COALESCE(?,status),
     next_inspection_date=COALESCE(?,next_inspection_date),
     updated_at=datetime('now') WHERE id=?`
  ).run(name, category, model_number, serial_number, location, status, next_inspection_date, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/assets/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- DOCUMENTS ----------

router.get('/documents', (req: AuthRequest, res: Response) => {
  paginate(req, res, 'documents');
});

router.get('/documents/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Document not found' }); return; }
  res.json(row);
});

router.post('/documents', requirePermission('manage_documents'), (req: AuthRequest, res: Response) => {
  const { title, category, content, status } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO documents (id, title, category, content, status, uploaded_by) VALUES (?,?,?,?,?,?)'
  ).run(id, title, category, content, status || 'Draft', req.user?.id);
  res.status(201).json({ id });
});

router.put('/documents/:id', requirePermission('manage_documents'), (req: AuthRequest, res: Response) => {
  const { title, category, content, status } = req.body;
  db.prepare(
    `UPDATE documents SET title=COALESCE(?,title), category=COALESCE(?,category),
     content=COALESCE(?,content), status=COALESCE(?,status),
     updated_at=datetime('now') WHERE id=?`
  ).run(title, category, content, status, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/documents/:id', requirePermission('manage_documents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- STATS ----------

router.get('/stats', (req: AuthRequest, res: Response) => {
  const incidents = db.prepare('SELECT COUNT(*) as count FROM incidents').get() as any;
  const openActions = db.prepare("SELECT COUNT(*) as count FROM actions WHERE status != 'Done'").get() as any;
  const inspections = db.prepare('SELECT COUNT(*) as count FROM inspections WHERE completed = 1').get() as any;
  const workers = db.prepare('SELECT COUNT(*) as count FROM workers').get() as any;
  const observations = db.prepare('SELECT COUNT(*) as count FROM observations').get() as any;
  const permits = db.prepare('SELECT COUNT(*) as count FROM permits').get() as any;

  const severityBreakdown = db.prepare(
    'SELECT severity as name, COUNT(*) as value FROM incidents GROUP BY severity'
  ).all();

  const monthlyTrends = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, COUNT(*) as incidents 
     FROM incidents GROUP BY month ORDER BY month DESC LIMIT 12`
  ).all();

  const statsLogs = db.prepare('SELECT * FROM stats_logs ORDER BY date DESC LIMIT 30').all();
  const totalManHours = db.prepare('SELECT COALESCE(SUM(man_hours), 0) as total FROM stats_logs').get() as any;

  res.json({
    totalIncidents: incidents.count,
    openActions: openActions.count,
    inspectionsCompleted: inspections.count,
    totalWorkers: workers.count,
    totalObservations: observations.count,
    totalPermits: permits.count,
    totalManHours: totalManHours.total,
    severityBreakdown,
    monthlyTrends,
    statsLogs
  });
});

router.post('/stats/log', requirePermission('view_analytics'), (req: AuthRequest, res: Response) => {
  const { date, period, man_hours, active_workers, remarks } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO stats_logs (id, date, period, man_hours, active_workers, remarks) VALUES (?,?,?,?,?,?)'
  ).run(id, date, period || 'Daily', man_hours || 0, active_workers || 0, remarks);
  res.status(201).json({ id });
});

// ---------- EMERGENCY ----------

router.get('/emergency/contacts', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM emergency_contacts ORDER BY created_at DESC').all());
});

router.post('/emergency/contacts', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { name, role, phone, type, location } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO emergency_contacts (id, name, role, phone, type, location) VALUES (?,?,?,?,?,?)'
  ).run(id, name, role, phone, type, location);
  res.status(201).json({ id });
});

router.delete('/emergency/contacts/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM emergency_contacts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/emergency/drills', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM emergency_drills ORDER BY created_at DESC').all());
});

router.post('/emergency/drills', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { type, date, location, participants_count, duration_minutes, outcome, notes, attendance_list } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO emergency_drills (id, type, date, location, participants_count, duration_minutes, outcome, notes, attendance_list) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, type, date, location, participants_count, duration_minutes, outcome, notes, JSON.stringify(attendance_list || []));
  res.status(201).json({ id });
});

// ---------- RISK ASSESSMENTS ----------

router.get('/risk-assessments', (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  const countRow = db.prepare('SELECT COUNT(*) as total FROM risk_assessments').get() as any;
  const total = countRow?.total || 0;
  const rows = db.prepare('SELECT * FROM risk_assessments ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(Math.ceil(total / limit)));
  res.json(rows.map((r: any) => ({ ...r, hazards: JSON.parse(r.hazards || '[]') })));
});

router.get('/risk-assessments/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM risk_assessments WHERE id = ?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ...row, hazards: JSON.parse(row.hazards || '[]') });
});

router.post('/risk-assessments', requirePermission('create_incident'), (req: AuthRequest, res: Response) => {
  const { title, task_description, taskDescription, type, date, author, hazards, status } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO risk_assessments (id, title, task_description, type, date, author, hazards, status) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, title, task_description || taskDescription, type || 'JHA', date || new Date().toISOString(), author || req.user?.name, JSON.stringify(hazards || []), status || 'Draft');
  res.status(201).json({ id });
});

router.put('/risk-assessments/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { title, task_description, taskDescription, type, date, hazards, status } = req.body;
  db.prepare(
    `UPDATE risk_assessments SET title=COALESCE(?,title), task_description=COALESCE(?,task_description),
     type=COALESCE(?,type), date=COALESCE(?,date), hazards=COALESCE(?,hazards), status=COALESCE(?,status),
     updated_at=datetime('now') WHERE id=?`
  ).run(title, task_description || taskDescription, type, date, hazards ? JSON.stringify(hazards) : null, status, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/risk-assessments/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM risk_assessments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- INSPECTION TEMPLATES ----------

router.get('/inspection-templates', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM inspection_templates ORDER BY created_at DESC').all();
  res.json(rows.map((r: any) => ({ ...r, items: JSON.parse(r.items || '[]') })));
});

router.post('/inspection-templates', requirePermission('perform_inspection'), (req: AuthRequest, res: Response) => {
  const { name, category, description, items } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO inspection_templates (id, name, category, description, items) VALUES (?,?,?,?,?)'
  ).run(id, name, category, description, JSON.stringify(items || []));
  res.status(201).json({ id });
});

// ---------- TRAINING MODULES ----------

router.get('/training-modules', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM training_modules ORDER BY created_at DESC').all();
  res.json(rows.map((r: any) => ({ ...r, required_for_roles: JSON.parse(r.required_for_roles || '[]') })));
});

router.post('/training-modules', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const { title, description, required_for_roles, requiredForRoles, validity_months, validityMonths } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO training_modules (id, title, description, required_for_roles, validity_months) VALUES (?,?,?,?,?)'
  ).run(id, title, description, JSON.stringify(required_for_roles || requiredForRoles || []), validity_months ?? validityMonths ?? 0);
  res.status(201).json({ id });
});

// ---------- TRAINING RECORDS ----------

router.get('/training-records', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM training_records ORDER BY created_at DESC').all());
});

router.post('/training-records', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const { worker_id, workerId, module_id, moduleId, module_title, moduleTitle, completion_date, completionDate, expiry_date, expiryDate, certificate_url, certificateUrl, status } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO training_records (id, worker_id, module_id, module_title, completion_date, expiry_date, certificate_url, status) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, worker_id || workerId, module_id || moduleId, module_title || moduleTitle, completion_date || completionDate, expiry_date || expiryDate, certificate_url || certificateUrl, status || 'Valid');
  res.status(201).json({ id });
});

// ---------- PPE INVENTORY ----------

router.get('/ppe/inventory', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM ppe_inventory ORDER BY created_at DESC').all());
});

router.post('/ppe/inventory', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { name, category, stock_quantity, stockQuantity, min_stock_threshold, minStockThreshold, description } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO ppe_inventory (id, name, category, stock_quantity, min_stock_threshold, description) VALUES (?,?,?,?,?,?)'
  ).run(id, name, category, stock_quantity ?? stockQuantity ?? 0, min_stock_threshold ?? minStockThreshold ?? 5, description);
  res.status(201).json({ id });
});

router.put('/ppe/inventory/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { stock_quantity, stockQuantity, name, category } = req.body;
  db.prepare(
    'UPDATE ppe_inventory SET stock_quantity=COALESCE(?,stock_quantity), name=COALESCE(?,name), category=COALESCE(?,category) WHERE id=?'
  ).run(stock_quantity ?? stockQuantity, name, category, req.params.id);
  res.json({ message: 'Updated' });
});

// ---------- PPE ISSUANCE ----------

router.get('/ppe/issuance', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM ppe_issuance ORDER BY created_at DESC').all());
});

router.post('/ppe/issuance', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { worker_id, workerId, worker_name, workerName, ppe_item_id, ppeItemId, ppe_item_name, ppeItemName, issue_date, issueDate, expiry_date, expiryDate, signature_url, signatureUrl, status } = req.body;
  const id = uuid();
  const ppeId = ppe_item_id || ppeItemId;
  db.prepare(
    'INSERT INTO ppe_issuance (id, worker_id, worker_name, ppe_item_id, ppe_item_name, issue_date, expiry_date, signature_url, status) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, worker_id || workerId, worker_name || workerName, ppeId, ppe_item_name || ppeItemName, issue_date || issueDate, expiry_date || expiryDate, signature_url || signatureUrl, status || 'Active');

  // Deduct stock
  if (ppeId) {
    db.prepare('UPDATE ppe_inventory SET stock_quantity = MAX(0, stock_quantity - 1) WHERE id = ?').run(ppeId);
  }

  res.status(201).json({ id });
});

router.put('/ppe/issuance/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const log = db.prepare('SELECT * FROM ppe_issuance WHERE id = ?').get(req.params.id) as any;
  if (!log) { res.status(404).json({ error: 'Not found' }); return; }

  db.prepare('UPDATE ppe_issuance SET status = ? WHERE id = ?').run(status, req.params.id);

  // Return stock if returning
  if (status === 'Returned' && log.status === 'Active') {
    db.prepare('UPDATE ppe_inventory SET stock_quantity = stock_quantity + 1 WHERE id = ?').run(log.ppe_item_id);
  }

  res.json({ message: 'Updated' });
});

// ---------- ROLES ----------

router.get('/roles', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM roles ORDER BY created_at DESC').all();
  res.json(rows.map((r: any) => ({ ...r, permissions: JSON.parse(r.permissions || '[]'), isSystem: !!r.is_system })));
});

router.post('/roles', requirePermission('manage_roles'), (req: AuthRequest, res: Response) => {
  const { name, description, is_system, isSystem, permissions } = req.body;
  // Check if role name already exists
  const existing = db.prepare('SELECT id, is_system FROM roles WHERE name = ?').get(name) as any;
  if (existing) {
    if (existing.is_system) {
      res.status(403).json({ error: 'Cannot overwrite a system role' });
      return;
    }
    // Update existing role
    db.prepare(
      'UPDATE roles SET description = ?, permissions = ? WHERE id = ?'
    ).run(description, JSON.stringify(permissions || []), existing.id);
    res.json({ id: existing.id, message: 'Role updated' });
    return;
  }
  const id = uuid();
  db.prepare(
    'INSERT INTO roles (id, name, description, is_system, permissions) VALUES (?,?,?,?,?)'
  ).run(id, name, description, is_system ?? isSystem ?? 0, JSON.stringify(permissions || []));
  res.status(201).json({ id });
});

router.delete('/roles/:id', requirePermission('manage_roles'), (req: AuthRequest, res: Response) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id) as any;
  if (role && role.is_system) {
    res.status(403).json({ error: 'Cannot delete system role' });
    return;
  }
  db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- SAFETY ZONES ----------

router.get('/safety-zones', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM safety_zones ORDER BY created_at DESC').all();
  res.json(rows.map((r: any) => ({ ...r, required_ppe: JSON.parse(r.required_ppe || '[]'), required_training: JSON.parse(r.required_training || '[]') })));
});

router.post('/safety-zones', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  const { name, type, lat, lng, radius, required_ppe, requiredPPE, required_training, requiredTraining } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO safety_zones (id, name, type, lat, lng, radius, required_ppe, required_training) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, type || 'Safe', lat, lng, radius || 100, JSON.stringify(required_ppe || requiredPPE || []), JSON.stringify(required_training || requiredTraining || []));
  res.status(201).json({ id });
});

router.delete('/safety-zones/:id', requirePermission('manage_incidents'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM safety_zones WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- HSE METRICS (Calculated) ----------

router.get('/metrics', (req: AuthRequest, res: Response) => {
  const totalIncidents = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any).c;
  const ltiCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Lost Time Injury' OR type = 'Lost Time Injury'").get() as any).c;
  const rwcCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Restricted Work Case' OR type = 'Restricted Work Case'").get() as any).c;
  const mtcCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Medical Treatment Case' OR type = 'Medical Treatment'").get() as any).c;
  const facCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'First Aid Case' OR type = 'First Aid'").get() as any).c;
  const nmCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Near Miss' OR type = 'Near Miss'").get() as any).c;
  const fatalityCount = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE category = 'Fatality'").get() as any).c;
  const totalDaysLost = (db.prepare('SELECT COALESCE(SUM(days_lost),0) as t FROM incidents').get() as any).t;
  const totalManHours = (db.prepare('SELECT COALESCE(SUM(man_hours),0) as t FROM stats_logs').get() as any).t;

  const recordableIncidents = mtcCount + rwcCount + ltiCount + fatalityCount;
  const trir = totalManHours > 0 ? (recordableIncidents / totalManHours) * 200000 : 0;
  const ltifr = totalManHours > 0 ? (ltiCount / totalManHours) * 1000000 : 0;
  const severityRate = totalManHours > 0 ? (totalDaysLost / totalManHours) * 200000 : 0;
  const nearMissReportingRate = totalManHours > 0 ? (nmCount / totalManHours) * 200000 : 0;

  const totalActions = (db.prepare('SELECT COUNT(*) as c FROM actions').get() as any).c;
  const closedActions = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE status IN ('Done','Verified')").get() as any).c;
  const actionClosureRate = totalActions > 0 ? (closedActions / totalActions) * 100 : 100;

  const totalInspections = (db.prepare('SELECT COUNT(*) as c FROM inspections').get() as any).c;
  const passedInspections = (db.prepare('SELECT COUNT(*) as c FROM inspections WHERE score >= 80').get() as any).c;
  const inspectionCompliance = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 100;

  const leadingActions = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Leading'").get() as any).c;
  const leadingClosed = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Leading' AND status IN ('Done','Verified')").get() as any).c;
  const leadingClosureRate = leadingActions > 0 ? (leadingClosed / leadingActions) * 100 : 100;

  const laggingActions = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Lagging'").get() as any).c;
  const laggingClosed = (db.prepare("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Lagging' AND status IN ('Done','Verified')").get() as any).c;
  const laggingClosureRate = laggingActions > 0 ? (laggingClosed / laggingActions) * 100 : 100;

  const inspectionsCompleted = (db.prepare('SELECT COUNT(*) as c FROM inspections WHERE completed = 1').get() as any).c;

  res.json({
    totalManHours,
    ltiCount, mtcCount, rwcCount, facCount, nmCount, fatalityCount,
    trir: Math.round(trir * 100) / 100,
    ltifr: Math.round(ltifr * 100) / 100,
    severityRate: Math.round(severityRate * 100) / 100,
    actionClosureRate: Math.round(actionClosureRate),
    inspectionCompliance: Math.round(inspectionCompliance),
    leadingActions, leadingClosureRate: Math.round(leadingClosureRate),
    laggingActions, laggingClosureRate: Math.round(laggingClosureRate),
    inspectionsCompleted,
    trainingHours: 0,
    nearMissReportingRate: Math.round(nearMissReportingRate * 100) / 100,
    daysLost: totalDaysLost,
    recordableIncidents
  });
});

// ============ BULK OPERATIONS ============

// ---------- Bulk Delete Incidents ----------
router.post('/incidents/bulk-delete', requirePermission('DeleteIncidents'), (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM incidents WHERE id IN (${placeholders})`).run(...ids);
  res.json({ deleted: result.changes, message: `${result.changes} incident(s) deleted` });
});

// ---------- Bulk Update Incident Status ----------
router.post('/incidents/bulk-status', requirePermission('EditIncidents'), (req: AuthRequest, res: Response) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE incidents SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(status, ...ids);
  res.json({ updated: result.changes, message: `${result.changes} incident(s) updated to ${status}` });
});

// ---------- Bulk Delete Actions ----------
router.post('/actions/bulk-delete', requirePermission('DeleteActions'), (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM actions WHERE id IN (${placeholders})`).run(...ids);
  res.json({ deleted: result.changes, message: `${result.changes} action(s) deleted` });
});

// ---------- Bulk Complete Actions ----------
router.post('/actions/bulk-complete', requirePermission('EditActions'), (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE actions SET status = 'Completed', completed_date = datetime('now') WHERE id IN (${placeholders}) AND status != 'Completed'`).run(...ids);
  res.json({ updated: result.changes, message: `${result.changes} action(s) completed` });
});

// ---------- Bulk Delete Observations ----------
router.post('/observations/bulk-delete', requirePermission('DeleteObservations'), (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM observations WHERE id IN (${placeholders})`).run(...ids);
  res.json({ deleted: result.changes, message: `${result.changes} observation(s) deleted` });
});

// ---------- Bulk Export (returns IDs for client-side CSV generation) ----------
router.post('/bulk-export', (req: AuthRequest, res: Response) => {
  const { entity, ids } = req.body;
  if (!['incidents', 'actions', 'observations', 'risk_assessments', 'permits'].includes(entity)) {
    return res.status(400).json({ error: 'Invalid entity type' });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 items per export' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM ${entity} WHERE id IN (${placeholders})`).all(...ids);
  res.json(rows);
});

export default router;
