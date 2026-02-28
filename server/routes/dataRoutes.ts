import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { AuthRequest, authenticate } from '../auth.js';

const router = Router();

// All routes require auth
router.use(authenticate);

// ---------- INCIDENTS ----------

router.get('/incidents', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/incidents/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(row);
});

router.post('/incidents', (req: AuthRequest, res: Response) => {
  const { description, location, date, type, category, severity, status, image, root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action } = req.body;
  const id = uuid();
  db.prepare(
    `INSERT INTO incidents (id, description, location, date, type, category, severity, status, reported_by, image, root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, description, location, date || new Date().toISOString(), type, category || 'Near Miss', severity, status || 'Open', req.user?.id, image, root_cause, corrective_actions, days_lost || 0, body_part, mechanism, immediate_action);
  res.status(201).json({ id, message: 'Incident created' });
});

router.put('/incidents/:id', (req: AuthRequest, res: Response) => {
  const { description, location, date, type, category, severity, status, root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action } = req.body;
  db.prepare(
    `UPDATE incidents SET description=COALESCE(?,description), location=COALESCE(?,location), date=COALESCE(?,date),
     type=COALESCE(?,type), category=COALESCE(?,category), severity=COALESCE(?,severity), status=COALESCE(?,status),
     root_cause=COALESCE(?,root_cause), corrective_actions=COALESCE(?,corrective_actions),
     days_lost=COALESCE(?,days_lost), body_part=COALESCE(?,body_part), mechanism=COALESCE(?,mechanism),
     immediate_action=COALESCE(?,immediate_action),
     updated_at=datetime('now') WHERE id=?`
  ).run(description, location, date, type, category, severity, status, root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/incidents/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- ACTIONS ----------

router.get('/actions', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM actions ORDER BY created_at DESC').all());
});

router.post('/actions', (req: AuthRequest, res: Response) => {
  const { title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, effectiveness } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO actions (id, title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, effectiveness) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(id, title, description, assignee, due_date, priority || 'Medium', status || 'Open', action_type || 'Corrective', category || 'Other', indicator || 'Lagging', related_incident_id, effectiveness || 'Not Assessed');
  res.status(201).json({ id });
});

router.put('/actions/:id', (req: AuthRequest, res: Response) => {
  const { title, description, assignee, due_date, completed_date, priority, status, action_type, category, indicator, verified_by, effectiveness } = req.body;
  db.prepare(
    `UPDATE actions SET title=COALESCE(?,title), description=COALESCE(?,description), assignee=COALESCE(?,assignee),
     due_date=COALESCE(?,due_date), completed_date=COALESCE(?,completed_date), priority=COALESCE(?,priority),
     status=COALESCE(?,status), action_type=COALESCE(?,action_type), category=COALESCE(?,category),
     indicator=COALESCE(?,indicator), verified_by=COALESCE(?,verified_by), effectiveness=COALESCE(?,effectiveness) WHERE id=?`
  ).run(title, description, assignee, due_date, completed_date, priority, status, action_type, category, indicator, verified_by, effectiveness, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/actions/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM actions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ---------- OBSERVATIONS ----------

router.get('/observations', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM observations ORDER BY created_at DESC').all());
});

router.post('/observations', (req: AuthRequest, res: Response) => {
  const { type, category, description, location, date, observer, is_anonymous, immediate_action, images } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO observations (id, type, category, description, location, date, observer, is_anonymous, immediate_action, images) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(id, type, category, description, location, date || new Date().toISOString(), observer, is_anonymous ? 1 : 0, immediate_action, JSON.stringify(images || []));
  res.status(201).json({ id });
});

// ---------- INSPECTIONS ----------

router.get('/inspections', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM inspections ORDER BY created_at DESC').all());
});

router.post('/inspections', (req: AuthRequest, res: Response) => {
  const { template_name, title, date, location, items, score, completed, signature } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO inspections (id, template_name, title, date, location, inspector, items, score, completed, signature) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(id, template_name, title, date, location, req.user?.id, JSON.stringify(items || []), score || 0, completed ? 1 : 0, signature);
  res.status(201).json({ id });
});

// ---------- PERMITS ----------

router.get('/permits', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM permits ORDER BY created_at DESC').all());
});

router.post('/permits', (req: AuthRequest, res: Response) => {
  const { type, location, description, valid_from, valid_until, requestor, status, controls } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO permits (id, type, location, description, valid_from, valid_until, requestor, status, controls) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, type, location, description, valid_from, valid_until, requestor, status || 'Draft', JSON.stringify(controls || []));
  res.status(201).json({ id });
});

router.put('/permits/:id', (req: AuthRequest, res: Response) => {
  const { status, approver, approver_comments } = req.body;
  db.prepare(
    'UPDATE permits SET status=COALESCE(?,status), approver=COALESCE(?,approver), approver_comments=COALESCE(?,approver_comments) WHERE id=?'
  ).run(status, approver, approver_comments, req.params.id);
  res.json({ message: 'Updated' });
});

// ---------- WORKERS ----------

router.get('/workers', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM workers ORDER BY created_at DESC').all());
});

router.post('/workers', (req: AuthRequest, res: Response) => {
  const { name, role, department, company_id, joined_date, email, phone } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO workers (id, name, role, department, company_id, joined_date, email, phone) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, role, department, company_id, joined_date, email, phone);
  res.status(201).json({ id });
});

router.put('/workers/:id', (req: AuthRequest, res: Response) => {
  const { name, role, department, email, phone, points, level } = req.body;
  db.prepare(
    'UPDATE workers SET name=COALESCE(?,name), role=COALESCE(?,role), department=COALESCE(?,department), email=COALESCE(?,email), phone=COALESCE(?,phone), points=COALESCE(?,points), level=COALESCE(?,level) WHERE id=?'
  ).run(name, role, department, email, phone, points, level, req.params.id);
  res.json({ message: 'Updated' });
});

// ---------- CONTRACTORS ----------

router.get('/contractors', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM contractors ORDER BY created_at DESC').all());
});

router.post('/contractors', (req: AuthRequest, res: Response) => {
  const { name, contact_person, email, phone, status } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO contractors (id, name, contact_person, email, phone, status) VALUES (?,?,?,?,?,?)'
  ).run(id, name, contact_person, email, phone, status || 'Pending');
  res.status(201).json({ id });
});

// ---------- ASSETS ----------

router.get('/assets', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all());
});

router.post('/assets', (req: AuthRequest, res: Response) => {
  const { name, category, model_number, serial_number, location, status, next_inspection_date } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO assets (id, name, category, model_number, serial_number, location, status, next_inspection_date) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, category, model_number, serial_number, location, status || 'Active', next_inspection_date);
  res.status(201).json({ id });
});

// ---------- DOCUMENTS ----------

router.get('/documents', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all());
});

router.post('/documents', (req: AuthRequest, res: Response) => {
  const { title, category, content, status } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO documents (id, title, category, content, status, uploaded_by) VALUES (?,?,?,?,?,?)'
  ).run(id, title, category, content, status || 'Draft', req.user?.id);
  res.status(201).json({ id });
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

router.post('/stats/log', (req: AuthRequest, res: Response) => {
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

router.post('/emergency/contacts', (req: AuthRequest, res: Response) => {
  const { name, role, phone, type, location } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO emergency_contacts (id, name, role, phone, type, location) VALUES (?,?,?,?,?,?)'
  ).run(id, name, role, phone, type, location);
  res.status(201).json({ id });
});

router.get('/emergency/drills', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM emergency_drills ORDER BY created_at DESC').all());
});

router.post('/emergency/drills', (req: AuthRequest, res: Response) => {
  const { type, date, location, participants_count, duration_minutes, outcome, notes, attendance_list } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO emergency_drills (id, type, date, location, participants_count, duration_minutes, outcome, notes, attendance_list) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, type, date, location, participants_count, duration_minutes, outcome, notes, JSON.stringify(attendance_list || []));
  res.status(201).json({ id });
});

// ---------- RISK ASSESSMENTS ----------

router.get('/risk-assessments', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM risk_assessments ORDER BY created_at DESC').all();
  res.json(rows.map((r: any) => ({ ...r, hazards: JSON.parse(r.hazards || '[]') })));
});

router.get('/risk-assessments/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM risk_assessments WHERE id = ?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ...row, hazards: JSON.parse(row.hazards || '[]') });
});

router.post('/risk-assessments', (req: AuthRequest, res: Response) => {
  const { id: clientId, title, task_description, taskDescription, type, date, author, hazards, status } = req.body;
  const id = clientId || uuid();
  db.prepare(
    'INSERT INTO risk_assessments (id, title, task_description, type, date, author, hazards, status) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, title, task_description || taskDescription, type || 'JHA', date || new Date().toISOString(), author || req.user?.name, JSON.stringify(hazards || []), status || 'Draft');
  res.status(201).json({ id });
});

router.put('/risk-assessments/:id', (req: AuthRequest, res: Response) => {
  const { title, task_description, taskDescription, type, date, hazards, status } = req.body;
  db.prepare(
    `UPDATE risk_assessments SET title=COALESCE(?,title), task_description=COALESCE(?,task_description),
     type=COALESCE(?,type), date=COALESCE(?,date), hazards=COALESCE(?,hazards), status=COALESCE(?,status),
     updated_at=datetime('now') WHERE id=?`
  ).run(title, task_description || taskDescription, type, date, hazards ? JSON.stringify(hazards) : null, status, req.params.id);
  res.json({ message: 'Updated' });
});

// ---------- INSPECTION TEMPLATES ----------

router.get('/inspection-templates', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM inspection_templates ORDER BY created_at DESC').all();
  res.json(rows.map((r: any) => ({ ...r, items: JSON.parse(r.items || '[]') })));
});

router.post('/inspection-templates', (req: AuthRequest, res: Response) => {
  const { id: clientId, name, category, description, items } = req.body;
  const id = clientId || uuid();
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

router.post('/training-modules', (req: AuthRequest, res: Response) => {
  const { id: clientId, title, description, required_for_roles, requiredForRoles, validity_months, validityMonths } = req.body;
  const id = clientId || uuid();
  db.prepare(
    'INSERT INTO training_modules (id, title, description, required_for_roles, validity_months) VALUES (?,?,?,?,?)'
  ).run(id, title, description, JSON.stringify(required_for_roles || requiredForRoles || []), validity_months ?? validityMonths ?? 0);
  res.status(201).json({ id });
});

// ---------- TRAINING RECORDS ----------

router.get('/training-records', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM training_records ORDER BY created_at DESC').all());
});

router.post('/training-records', (req: AuthRequest, res: Response) => {
  const { id: clientId, worker_id, workerId, module_id, moduleId, module_title, moduleTitle, completion_date, completionDate, expiry_date, expiryDate, certificate_url, certificateUrl, status } = req.body;
  const id = clientId || uuid();
  db.prepare(
    'INSERT INTO training_records (id, worker_id, module_id, module_title, completion_date, expiry_date, certificate_url, status) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, worker_id || workerId, module_id || moduleId, module_title || moduleTitle, completion_date || completionDate, expiry_date || expiryDate, certificate_url || certificateUrl, status || 'Valid');
  res.status(201).json({ id });
});

// ---------- PPE INVENTORY ----------

router.get('/ppe/inventory', (req: AuthRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM ppe_inventory ORDER BY created_at DESC').all());
});

router.post('/ppe/inventory', (req: AuthRequest, res: Response) => {
  const { id: clientId, name, category, stock_quantity, stockQuantity, min_stock_threshold, minStockThreshold, description } = req.body;
  const id = clientId || uuid();
  db.prepare(
    'INSERT INTO ppe_inventory (id, name, category, stock_quantity, min_stock_threshold, description) VALUES (?,?,?,?,?,?)'
  ).run(id, name, category, stock_quantity ?? stockQuantity ?? 0, min_stock_threshold ?? minStockThreshold ?? 5, description);
  res.status(201).json({ id });
});

router.put('/ppe/inventory/:id', (req: AuthRequest, res: Response) => {
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

router.post('/ppe/issuance', (req: AuthRequest, res: Response) => {
  const { id: clientId, worker_id, workerId, worker_name, workerName, ppe_item_id, ppeItemId, ppe_item_name, ppeItemName, issue_date, issueDate, expiry_date, expiryDate, signature_url, signatureUrl, status } = req.body;
  const id = clientId || uuid();
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

router.put('/ppe/issuance/:id', (req: AuthRequest, res: Response) => {
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

router.post('/roles', (req: AuthRequest, res: Response) => {
  const { id: clientId, name, description, is_system, isSystem, permissions } = req.body;
  const id = clientId || uuid();
  db.prepare(
    'INSERT OR REPLACE INTO roles (id, name, description, is_system, permissions) VALUES (?,?,?,?,?)'
  ).run(id, name, description, is_system ?? isSystem ?? 0, JSON.stringify(permissions || []));
  res.status(201).json({ id });
});

router.delete('/roles/:id', (req: AuthRequest, res: Response) => {
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

router.post('/safety-zones', (req: AuthRequest, res: Response) => {
  const { id: clientId, name, type, lat, lng, radius, required_ppe, requiredPPE, required_training, requiredTraining } = req.body;
  const id = clientId || uuid();
  db.prepare(
    'INSERT INTO safety_zones (id, name, type, lat, lng, radius, required_ppe, required_training) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, type || 'Safe', lat, lng, radius || 100, JSON.stringify(required_ppe || requiredPPE || []), JSON.stringify(required_training || requiredTraining || []));
  res.status(201).json({ id });
});

router.delete('/safety-zones/:id', (req: AuthRequest, res: Response) => {
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

export default router;
