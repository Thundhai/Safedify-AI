
import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import pool from '../postgres';
import { AuthRequest, authenticate, requirePermission } from '../auth.js';
import { notify, notifyAllManagers } from '../services/notificationService.js';
import { 
  validate, validateParams, validateQuery,
  ValidationSchema, sanitizeString 
} from '../middleware/inputValidation.js';

const router = Router();

// ---------- VALIDATION SCHEMAS ----------

const uuidParamSchema: ValidationSchema = {
  id: { type: 'uuid', required: true }
};

const paginationQuerySchema: ValidationSchema = {
  page: { type: 'number', min: 1, max: 10000 },
  limit: { type: 'number', min: 1, max: 200 }
};

const incidentSchema: ValidationSchema = {
  description: { type: 'string', required: false, maxLength: 10000, trim: true },
  location: { type: 'string', required: false, maxLength: 500, trim: true },
  date: { type: 'date', required: false },
  type: { type: 'string', required: false, maxLength: 100, trim: true },
  category: { type: 'string', required: false, maxLength: 100, trim: true, enum: ['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time', 'Fatality', 'Property Damage', 'Environmental'] },
  severity: { type: 'string', required: false, maxLength: 50, trim: true, enum: ['Low', 'Medium', 'High', 'Critical'] },
  status: { type: 'string', required: false, maxLength: 50, trim: true, enum: ['Open', 'In Progress', 'Under Investigation', 'Closed'] },
  root_cause: { type: 'string', required: false, maxLength: 5000, trim: true },
  corrective_actions: { type: 'string', required: false, maxLength: 5000, trim: true },
  days_lost: { type: 'number', required: false, min: 0, max: 9999 },
  body_part: { type: 'string', required: false, maxLength: 200, trim: true },
  mechanism: { type: 'string', required: false, maxLength: 500, trim: true },
  immediate_action: { type: 'string', required: false, maxLength: 2000, trim: true },
  department: { type: 'string', required: false, maxLength: 200, trim: true },
  shift: { type: 'string', required: false, maxLength: 50, trim: true },
  weather_conditions: { type: 'string', required: false, maxLength: 200, trim: true },
  task_being_performed: { type: 'string', required: false, maxLength: 1000, trim: true },
  environmental_impact: { type: 'string', required: false, maxLength: 2000, trim: true },
  immediate_actions_taken: { type: 'string', required: false, maxLength: 2000, trim: true },
  area_secured: { type: 'boolean', required: false },
  emergency_services_notified: { type: 'boolean', required: false },
  regulatory_notification: { type: 'boolean', required: false },
  ppe_adequate: { type: 'boolean', required: false },
  images: { type: 'array', required: false, maxLength: 20 },
  injured_persons: { type: 'array', required: false, maxLength: 50 },
  witnesses: { type: 'array', required: false, maxLength: 50 },
  ppe_worn: { type: 'array', required: false, maxLength: 20 },
};

const actionSchema: ValidationSchema = {
  title: { type: 'string', required: true, maxLength: 500, trim: true },
  description: { type: 'string', required: false, maxLength: 5000, trim: true },
  assignee: { type: 'string', required: false, maxLength: 200, trim: true },
  due_date: { type: 'date', required: false },
  completed_date: { type: 'date', required: false },
  priority: { type: 'string', required: false, maxLength: 50, enum: ['Low', 'Medium', 'High', 'Critical'] },
  status: { type: 'string', required: false, maxLength: 50, enum: ['Open', 'In Progress', 'Done', 'Overdue', 'Cancelled'] },
  action_type: { type: 'string', required: false, maxLength: 100, enum: ['Corrective', 'Preventive', 'Improvement'] },
  category: { type: 'string', required: false, maxLength: 100, trim: true },
  indicator: { type: 'string', required: false, maxLength: 50, enum: ['Leading', 'Lagging'] },
  related_incident_id: { type: 'uuid', required: false },
  effectiveness: { type: 'string', required: false, maxLength: 100, enum: ['Not Assessed', 'Effective', 'Partially Effective', 'Not Effective'] },
  verified_by: { type: 'string', required: false, maxLength: 200, trim: true },
};

const observationSchema: ValidationSchema = {
  type: { type: 'string', required: true, maxLength: 100, trim: true, enum: ['Safe', 'Unsafe', 'Near Miss', 'Positive Recognition'] },
  category: { type: 'string', required: false, maxLength: 100, trim: true },
  description: { type: 'string', required: false, maxLength: 5000, trim: true },
  location: { type: 'string', required: false, maxLength: 500, trim: true },
  date: { type: 'date', required: false },
  observer: { type: 'string', required: false, maxLength: 200, trim: true },
  status: { type: 'string', required: false, maxLength: 50, enum: ['Open', 'Reviewed', 'Closed'] },
  is_anonymous: { type: 'boolean', required: false },
  immediate_action: { type: 'string', required: false, maxLength: 2000, trim: true },
  images: { type: 'array', required: false, maxLength: 20 },
};

const inspectionSchema: ValidationSchema = {
  template_name: { type: 'string', required: false, maxLength: 200, trim: true },
  title: { type: 'string', required: true, maxLength: 500, trim: true },
  date: { type: 'date', required: false },
  location: { type: 'string', required: false, maxLength: 500, trim: true },
  score: { type: 'number', required: false, min: 0, max: 100 },
  completed: { type: 'boolean', required: false },
  signature: { type: 'string', required: false, maxLength: 50000 }, // Base64 signature
  items: { type: 'array', required: false, maxLength: 200 },
};

const permitSchema: ValidationSchema = {
  type: { type: 'string', required: true, maxLength: 100, trim: true },
  location: { type: 'string', required: false, maxLength: 500, trim: true },
  description: { type: 'string', required: false, maxLength: 5000, trim: true },
  valid_from: { type: 'date', required: false },
  valid_until: { type: 'date', required: false },
  requestor: { type: 'string', required: false, maxLength: 200, trim: true },
  status: { type: 'string', required: false, maxLength: 50, enum: ['Draft', 'Pending', 'Active', 'Expired', 'Rejected', 'Cancelled'] },
  approver: { type: 'string', required: false, maxLength: 200, trim: true },
  approver_comments: { type: 'string', required: false, maxLength: 2000, trim: true },
  controls: { type: 'array', required: false, maxLength: 100 },
};

const workerSchema: ValidationSchema = {
  name: { type: 'string', required: true, maxLength: 200, trim: true },
  role: { type: 'string', required: false, maxLength: 100, trim: true },
  department: { type: 'string', required: false, maxLength: 200, trim: true },
  company_id: { type: 'uuid', required: false },
  joined_date: { type: 'date', required: false },
  email: { type: 'email', required: false },
  phone: { type: 'string', required: false, maxLength: 30, pattern: /^[\d\s\-+()]+$/ },
  points: { type: 'number', required: false, min: 0, max: 1000000 },
  level: { type: 'number', required: false, min: 1, max: 100 },
};

const contractorSchema: ValidationSchema = {
  name: { type: 'string', required: true, maxLength: 200, trim: true },
  contact_person: { type: 'string', required: false, maxLength: 200, trim: true },
  email: { type: 'email', required: false },
  phone: { type: 'string', required: false, maxLength: 30, pattern: /^[\d\s\-+()]+$/ },
  status: { type: 'string', required: false, maxLength: 50, enum: ['Pending', 'Approved', 'Suspended', 'Rejected'] },
};

const assetSchema: ValidationSchema = {
  name: { type: 'string', required: true, maxLength: 500, trim: true },
  category: { type: 'string', required: false, maxLength: 100, trim: true },
  model_number: { type: 'string', required: false, maxLength: 200, trim: true },
  serial_number: { type: 'string', required: false, maxLength: 200, trim: true },
  location: { type: 'string', required: false, maxLength: 500, trim: true },
  status: { type: 'string', required: false, maxLength: 50, enum: ['Active', 'Inactive', 'Maintenance', 'Retired'] },
  next_inspection_date: { type: 'date', required: false },
};

const documentSchema: ValidationSchema = {
  title: { type: 'string', required: true, maxLength: 500, trim: true },
  category: { type: 'string', required: false, maxLength: 100, trim: true },
  content: { type: 'string', required: false, maxLength: 100000 }, // Allow large content for documents
  status: { type: 'string', required: false, maxLength: 50, enum: ['Draft', 'Published', 'Archived'] },
};

// All routes require auth
router.use(authenticate);

// ---------- OWNERSHIP VERIFICATION HELPER ----------
/**
 * Verify that the current user owns or can modify a resource.
 * Allows: resource owner, Admin role, or Manager role.
 * 
 * @param table - Database table name
 * @param idParam - Route param name for the resource ID (default: 'id')
 * @param ownerColumn - Column that stores owner's user ID or name
 * @param ownerIsName - If true, compare against req.user.name instead of req.user.id
 * @param altColumn - Alternative column to check (e.g., 'assignee' for actions)
 */
function requireOwnership(
  table: string,
  ownerColumn: string,
  ownerIsName = false,
  altColumn?: string
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const resourceId = req.params.id;
    const userId = req.user?.id;
    const userName = req.user?.name;
    const userRole = req.user?.role;
    const orgId = req.user?.org_id;

    try {
      const selectColumns = altColumn ? `${ownerColumn}, ${altColumn}, org_id` : `${ownerColumn}, org_id`;
      const result = await pool.query(
        `SELECT ${selectColumns} FROM ${table} WHERE id = $1`,
        [resourceId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      const row = result.rows[0];

      // Org isolation: resource must belong to user's org
      if (orgId && row.org_id && row.org_id !== orgId) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      // Admins and Managers can modify any record within their org
      if (userRole === 'Admin' || userRole === 'Manager') {
        return next();
      }

      const ownerValue = row[ownerColumn];
      const altValue = altColumn ? row[altColumn] : null;
      const currentUserValue = ownerIsName ? userName : userId;

      // Check if user owns the resource OR is the alternate (e.g., assignee)
      const isOwner = ownerValue === currentUserValue;
      const isAlt = altColumn && (altValue === userId || altValue === userName);

      if (!isOwner && !isAlt) {
        res.status(403).json({ 
          error: 'Access denied: You can only modify your own records' 
        });
        return;
      }

      next();
    } catch (err: any) {
      console.error('[Ownership Check] Error:', err.message);
      res.status(500).json({ error: 'Failed to verify ownership' });
    }
  };
}

// ---------- PAGINATION HELPER ----------
async function paginate(req: AuthRequest, res: Response, table: string, orderBy = 'created_at DESC', where = '', whereParams: any[] = []) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  // Inject org_id filter for multi-tenancy
  const orgId = req.user?.org_id;
  let finalWhere = where;
  let finalParams = [...whereParams];
  if (orgId) {
    const orgParamIdx = finalParams.length + 1;
    finalWhere = where ? `org_id = $${orgParamIdx} AND (${where})` : `org_id = $${orgParamIdx}`;
    finalParams.push(orgId);
  }

  const whereClause = finalWhere ? `WHERE ${finalWhere}` : '';
  const countResult = await pool.query(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`, finalParams);
  const total = countResult.rows[0]?.total || 0;
  const rowsResult = await pool.query(`SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} LIMIT $${finalParams.length + 1} OFFSET $${finalParams.length + 2}`, [...finalParams, limit, offset]);
  const rows = rowsResult.rows;

  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(Math.ceil(total / limit)));
  res.json(rows);
}

// ---------- INCIDENTS ----------

router.get('/incidents', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'incidents');
});

router.get('/incidents/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM incidents WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(row);
});

router.post('/incidents', validate(incidentSchema), async (req: AuthRequest, res: Response) => {
  const b = req.body;
  const id = uuid();
  await pool.query(
    `INSERT INTO incidents (id, description, location, date, type, category, severity, status, reported_by, image, images,
      root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action,
      date_reported, department, shift, weather_conditions, task_being_performed,
      injured_persons, witnesses, ppe_worn, ppe_adequate, environmental_impact,
      immediate_actions_taken, area_secured, emergency_services_notified, regulatory_notification, org_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)`
  , [id, b.description ?? null, b.location ?? null, b.date || new Date().toISOString(), b.type ?? null, b.category || 'Near Miss',
    b.severity ?? null, b.status || 'Open', req.user?.id ?? null,
    b.image || (b.images?.[0] ?? null),
    b.images ? JSON.stringify(b.images) : null,
    b.root_cause ?? null, b.corrective_actions ?? null, b.days_lost || 0,
    b.body_part ?? null, b.mechanism ?? null, b.immediate_action ?? null,
    b.date_reported || new Date().toISOString(), b.department ?? null, b.shift ?? null, b.weather_conditions ?? null, b.task_being_performed ?? null,
    b.injured_persons ? JSON.stringify(b.injured_persons) : null,
    b.witnesses ? JSON.stringify(b.witnesses) : null,
    b.ppe_worn ? JSON.stringify(b.ppe_worn) : null,
    b.ppe_adequate != null ? b.ppe_adequate : null,
    b.environmental_impact ?? null, b.immediate_actions_taken ?? null,
    b.area_secured ? true : false, b.emergency_services_notified ? true : false, b.regulatory_notification ? true : false, req.user?.org_id]);
  res.status(201).json({ id, message: 'Incident created' });

  // Fire-and-forget notification
  notifyAllManagers({
    orgId: req.user?.org_id,
    type: b.severity === 'Critical' || b.severity === 'High' ? 'danger' : 'warning',
    title: `New Incident Reported`,
    message: `A ${b.severity || 'new'} ${b.type || 'incident'} has been reported at ${b.location || 'site'}. Description: ${(b.description || '').slice(0, 120)}`,
    entityType: 'incident',
    entityId: id,
  }).catch((err: any) => console.error('[Notify] incident create:', err.message));
});

router.put('/incidents/:id', validateParams(uuidParamSchema), validate(incidentSchema), requireOwnership('incidents', 'reported_by'), async (req: AuthRequest, res: Response) => {
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
    if (val !== undefined) { fields.push(`${col} = $${fields.length + 1}`); values.push(val); }
  }
  // JSON fields
  if (b.images !== undefined) { fields.push(`images = $${fields.length + 1}`); values.push(JSON.stringify(b.images)); fields.push(`image = $${fields.length + 1}`); values.push(b.images?.[0] ?? null); }
  if (b.injured_persons !== undefined) { fields.push(`injured_persons = $${fields.length + 1}`); values.push(JSON.stringify(b.injured_persons)); }
  if (b.witnesses !== undefined) { fields.push(`witnesses = $${fields.length + 1}`); values.push(JSON.stringify(b.witnesses)); }
  if (b.ppe_worn !== undefined) { fields.push(`ppe_worn = $${fields.length + 1}`); values.push(JSON.stringify(b.ppe_worn)); }
  // Boolean fields
  if (b.ppe_adequate !== undefined) { fields.push(`ppe_adequate = $${fields.length + 1}`); values.push(b.ppe_adequate != null ? b.ppe_adequate : null); }
  if (b.area_secured !== undefined) { fields.push(`area_secured = $${fields.length + 1}`); values.push(b.area_secured ? true : false); }
  if (b.emergency_services_notified !== undefined) { fields.push(`emergency_services_notified = $${fields.length + 1}`); values.push(b.emergency_services_notified ? true : false); }
  if (b.regulatory_notification !== undefined) { fields.push(`regulatory_notification = $${fields.length + 1}`); values.push(b.regulatory_notification ? true : false); }

  fields.push(`updated_at = NOW()`);
  values.push(req.params.id);
  await pool.query(`UPDATE incidents SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  res.json({ message: 'Updated' });

  // Notify on status change
  if (b.status) {
    const incResult = await pool.query('SELECT reported_by, type, location FROM incidents WHERE id = $1', [req.params.id]);
    const inc = incResult.rows[0];
    if (inc?.reported_by) {
      notify({
        userId: inc.reported_by,
        type: b.status === 'Closed' ? 'success' : 'info',
        title: `Incident Status → ${b.status}`,
        message: `The ${inc.type || 'incident'} at ${inc.location || 'site'} has been updated to "${b.status}".`,
        entityType: 'incident',
        entityId: req.params.id as string,
      }).catch((err: any) => console.error('[Notify] incident update:', err.message));
    }
  }
});

router.delete('/incidents/:id', validateParams(uuidParamSchema), requireOwnership('incidents', 'reported_by'), requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ---------- ACTIONS ----------

router.get('/actions', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'actions');
});

router.post('/actions', validate(actionSchema), requirePermission('create_incident'), async (req: AuthRequest, res: Response) => {
  const { title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, effectiveness } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO actions (id, title, description, assignee, due_date, priority, status, action_type, category, indicator, related_incident_id, effectiveness, created_by, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
    [id, title, description, assignee, due_date, priority || 'Medium', status || 'Open', action_type || 'Corrective', category || 'Other', indicator || 'Lagging', related_incident_id, effectiveness || 'Not Assessed', req.user?.id, req.user?.org_id]
  );
  res.status(201).json({ id });

  // Notify assignee if set
  if (assignee) {
    const workerResult = await pool.query('SELECT id FROM users WHERE name = $1 OR id = $2', [assignee, assignee]);
    const worker = workerResult.rows[0];
    if (worker) {
      notify({
        userId: worker.id,
        type: priority === 'Critical' ? 'danger' : 'info',
        title: 'New Action Assigned to You',
        message: `Action: "${title}" (${priority || 'Medium'} priority). Due: ${due_date || 'No date set'}.`,
        entityType: 'action',
        entityId: id,
      }).catch((err: any) => console.error('[Notify] action create:', err.message));
    }
  }
});

router.put('/actions/:id', validateParams(uuidParamSchema), validate(actionSchema), requireOwnership('actions', 'created_by', false, 'assignee'), async (req: AuthRequest, res: Response) => {
  const { title, description, assignee, due_date, completed_date, priority, status, action_type, category, indicator, verified_by, effectiveness } = req.body;
  await pool.query(
    `UPDATE actions SET title=COALESCE($1,title), description=COALESCE($2,description), assignee=COALESCE($3,assignee),
     due_date=COALESCE($4,due_date), completed_date=COALESCE($5,completed_date), priority=COALESCE($6,priority),
     status=COALESCE($7,status), action_type=COALESCE($8,action_type), category=COALESCE($9,category),
     indicator=COALESCE($10,indicator), verified_by=COALESCE($11,verified_by), effectiveness=COALESCE($12,effectiveness) WHERE id=$13`,
    [title, description, assignee, due_date, completed_date, priority, status, action_type, category, indicator, verified_by, effectiveness, req.params.id]
  );
  res.json({ message: 'Updated' });

  // Notify on status change
  if (status) {
    const actionResult = await pool.query('SELECT assignee, title FROM actions WHERE id = $1', [req.params.id]);
    const action = actionResult.rows[0];
    if (action?.assignee) {
      const workerResult = await pool.query('SELECT id FROM users WHERE name = $1 OR id = $2', [action.assignee, action.assignee]);
      const worker = workerResult.rows[0];
      if (worker) {
        notify({
          userId: worker.id, 
          type: status === 'Done' ? 'success' : 'info',
          title: `Action Status → ${status}`,
          message: `The action "${action.title}" status has been updated to "${status}".`,
          entityType: 'action',
          entityId: req.params.id as string,
        }).catch((err: any) => console.error('[Notify] action update:', err.message));
      }
    }
  }
});

router.delete('/actions/:id', validateParams(uuidParamSchema), requireOwnership('actions', 'created_by', false, 'assignee'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM actions WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ---------- OBSERVATIONS ----------

router.get('/observations', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'observations');
});

router.post('/observations', validate(observationSchema), requirePermission('create_incident'), async (req: AuthRequest, res: Response) => {
  const { type, category, description, location, date, observer, is_anonymous, immediate_action, images } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO observations (id, type, category, description, location, date, observer, is_anonymous, immediate_action, images, created_by, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [id, type, category, description, location, date || new Date().toISOString(), observer, is_anonymous ? 1 : 0, immediate_action, JSON.stringify(images || []), req.user?.id, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/observations/:id', validateParams(uuidParamSchema), validate(observationSchema), requireOwnership('observations', 'created_by'), async (req: AuthRequest, res: Response) => {
  const { type, category, description, location, date, observer, status, immediate_action, images } = req.body;
  await pool.query(
    `UPDATE observations SET type=COALESCE($1,type), category=COALESCE($2,category), description=COALESCE($3,description),
     location=COALESCE($4,location), date=COALESCE($5,date), observer=COALESCE($6,observer), status=COALESCE($7,status),
     immediate_action=COALESCE($8,immediate_action), images=COALESCE($9,images) WHERE id=$10`,
    [type, category, description, location, date, observer, status, immediate_action, images ? JSON.stringify(images) : null, req.params.id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/observations/:id', validateParams(uuidParamSchema), requireOwnership('observations', 'created_by'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM observations WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ---------- INSPECTIONS ----------

router.get('/inspections', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'inspections');
});

router.post('/inspections', validate(inspectionSchema), requirePermission('perform_inspection'), async (req: AuthRequest, res: Response) => {
  const { template_name, title, date, location, items, score, completed, signature } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO inspections (id, template_name, title, date, location, inspector, items, score, completed, signature, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [id, template_name, title, date, location, req.user?.id, JSON.stringify(items || []), score || 0, completed ? 1 : 0, signature, req.user?.org_id]
  );
  res.status(201).json({ id });
});

// ---------- PERMITS ----------

router.get('/permits', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'permits');
});

router.post('/permits', validate(permitSchema), requirePermission('create_permit'), async (req: AuthRequest, res: Response) => {
  const { type, location, description, valid_from, valid_until, requestor, status, controls } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO permits (id, type, location, description, valid_from, valid_until, requestor, status, controls, created_by, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [id, type, location, description, valid_from, valid_until, requestor, status || 'Draft', JSON.stringify(controls || []), req.user?.id, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/permits/:id', validateParams(uuidParamSchema), validate(permitSchema), requirePermission('approve_permit'), async (req: AuthRequest, res: Response) => {
  const { status, approver, approver_comments } = req.body;
  await pool.query(
    'UPDATE permits SET status=COALESCE($1,status), approver=COALESCE($2,approver), approver_comments=COALESCE($3,approver_comments) WHERE id=$4',
    [status, approver, approver_comments, req.params.id]
  );
  res.json({ message: 'Updated' });

  // Notify permit requestor on status change
  if (status) {
    const permitResult = await pool.query('SELECT requestor, type, location FROM permits WHERE id = $1', [req.params.id]);
    const permit = permitResult.rows[0];
    if (permit?.requestor) {
      const requestorUserResult = await pool.query('SELECT id FROM users WHERE name = $1 OR id = $2', [permit.requestor, permit.requestor]);
      const requestorUser = requestorUserResult.rows[0];
      if (requestorUser) {
        notify({
          userId: requestorUser.id,
          type: status === 'Active' ? 'success' : status === 'Rejected' ? 'danger' : 'info',
          title: `Permit ${status}`,
          message: `Your ${permit.type || 'permit'} for ${permit.location || 'site'} has been ${status.toLowerCase()}.${approver_comments ? ` Comment: ${approver_comments}` : ''}`,
          entityType: 'permit',
          entityId: req.params.id as string,
        }).catch((err: any) => console.error('[Notify] permit update:', err.message));
      }
    }
    // Also notify managers of permit approval/rejection
    notifyAllManagers({
      orgId: req.user?.org_id,
      type: status === 'Active' ? 'success' : status === 'Rejected' ? 'warning' : 'info',
      title: `Permit ${status}: ${permit?.type || 'Unknown'}`,
      message: `${permit?.type || 'Permit'} at ${permit?.location || 'site'} has been ${status.toLowerCase()}.`,
      entityType: 'permit',
      entityId: req.params.id as string,
    }).catch((err: any) => console.error('[Notify] permit managers:', err.message));
  }
});

router.delete('/permits/:id', validateParams(uuidParamSchema), requireOwnership('permits', 'created_by'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM permits WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ---------- WORKERS ----------

router.get('/workers', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'workers');
});

router.get('/workers/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM workers WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: 'Worker not found' }); return; }
  res.json(row);
});

router.post('/workers', validate(workerSchema), requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { name, role, department, company_id, joined_date, email, phone } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO workers (id, name, role, department, company_id, joined_date, email, phone, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, name, role, department, company_id, joined_date, email, phone, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/workers/:id', validateParams(uuidParamSchema), validate(workerSchema), requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { name, role, department, email, phone, points, level } = req.body;
  await pool.query(
    'UPDATE workers SET name=COALESCE($1,name), role=COALESCE($2,role), department=COALESCE($3,department), email=COALESCE($4,email), phone=COALESCE($5,phone), points=COALESCE($6,points), level=COALESCE($7,level) WHERE id=$8 AND org_id=$9',
    [name, role, department, email, phone, points, level, req.params.id, req.user?.org_id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/workers/:id', validateParams(uuidParamSchema), requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM workers WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

// ---------- CONTRACTORS ----------

router.get('/contractors', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'contractors');
});

router.get('/contractors/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM contractors WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: 'Contractor not found' }); return; }
  res.json(row);
});

router.post('/contractors', validate(contractorSchema), requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { name, contact_person, email, phone, status } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO contractors (id, name, contact_person, email, phone, status, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, name, contact_person, email, phone, status || 'Pending', req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/contractors/:id', validateParams(uuidParamSchema), validate(contractorSchema), requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { name, contact_person, email, phone, status } = req.body;
  await pool.query(
    `UPDATE contractors SET name=COALESCE($1,name), contact_person=COALESCE($2,contact_person),
     email=COALESCE($3,email), phone=COALESCE($4,phone), status=COALESCE($5,status),
     updated_at=NOW() WHERE id=$6 AND org_id=$7`,
    [name, contact_person, email, phone, status, req.params.id, req.user?.org_id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/contractors/:id', validateParams(uuidParamSchema), requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM contractors WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

// ---------- ASSETS ----------

router.get('/assets', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'assets');
});

router.get('/assets/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM assets WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: 'Asset not found' }); return; }
  res.json(row);
});

router.post('/assets', validate(assetSchema), requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { name, category, model_number, serial_number, location, status, next_inspection_date } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO assets (id, name, category, model_number, serial_number, location, status, next_inspection_date, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, name, category, model_number, serial_number, location, status || 'Active', next_inspection_date, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/assets/:id', validateParams(uuidParamSchema), validate(assetSchema), requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { name, category, model_number, serial_number, location, status, next_inspection_date } = req.body;
  await pool.query(
    `UPDATE assets SET name=COALESCE($1,name), category=COALESCE($2,category),
     model_number=COALESCE($3,model_number), serial_number=COALESCE($4,serial_number),
     location=COALESCE($5,location), status=COALESCE($6,status),
     next_inspection_date=COALESCE($7,next_inspection_date),
     updated_at=NOW() WHERE id=$8 AND org_id=$9`,
    [name, category, model_number, serial_number, location, status, next_inspection_date, req.params.id, req.user?.org_id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/assets/:id', validateParams(uuidParamSchema), requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM assets WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

// ---------- DOCUMENTS ----------

router.get('/documents', validateQuery(paginationQuerySchema), async (req: AuthRequest, res: Response) => {
  await paginate(req, res, 'documents');
});

router.get('/documents/:id', validateParams(uuidParamSchema), async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM documents WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: 'Document not found' }); return; }
  res.json(row);
});

router.post('/documents', validate(documentSchema), requirePermission('manage_documents'), async (req: AuthRequest, res: Response) => {
  const { title, category, content, status } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO documents (id, title, category, content, status, uploaded_by, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, title, category, content, status || 'Draft', req.user?.id, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/documents/:id', validateParams(uuidParamSchema), validate(documentSchema), requirePermission('manage_documents'), async (req: AuthRequest, res: Response) => {
  const { title, category, content, status } = req.body;
  await pool.query(
    `UPDATE documents SET title=COALESCE($1,title), category=COALESCE($2,category),
     content=COALESCE($3,content), status=COALESCE($4,status),
     updated_at=NOW() WHERE id=$5 AND org_id=$6`,
    [title, category, content, status, req.params.id, req.user?.org_id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/documents/:id', validateParams(uuidParamSchema), requirePermission('manage_documents'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM documents WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

// ---------- STATS ----------

router.get('/stats', async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  const incidents = (await pool.query('SELECT COUNT(*) as count FROM incidents WHERE org_id = $1', [orgId])).rows[0];
  const openActions = (await pool.query("SELECT COUNT(*) as count FROM actions WHERE status != 'Done' AND org_id = $1", [orgId])).rows[0];
  const inspections = (await pool.query('SELECT COUNT(*) as count FROM inspections WHERE completed = 1 AND org_id = $1', [orgId])).rows[0];
  const workers = (await pool.query('SELECT COUNT(*) as count FROM workers WHERE org_id = $1', [orgId])).rows[0];
  const observations = (await pool.query('SELECT COUNT(*) as count FROM observations WHERE org_id = $1', [orgId])).rows[0];
  const permits = (await pool.query('SELECT COUNT(*) as count FROM permits WHERE org_id = $1', [orgId])).rows[0];

  const severityBreakdown = (await pool.query('SELECT severity as name, COUNT(*) as value FROM incidents WHERE org_id = $1 GROUP BY severity', [orgId])).rows;
  const monthlyTrends = (await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as incidents FROM incidents WHERE org_id = $1 GROUP BY month ORDER BY month DESC LIMIT 12`, [orgId])).rows;
  const statsLogs = (await pool.query('SELECT * FROM stats_logs WHERE org_id = $1 ORDER BY date DESC LIMIT 30', [orgId])).rows;
  const totalManHours = (await pool.query('SELECT COALESCE(SUM(man_hours), 0) as total FROM stats_logs WHERE org_id = $1', [orgId])).rows[0];

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

router.post('/stats/log', requirePermission('view_analytics'), async (req: AuthRequest, res: Response) => {
  const { date, period, man_hours, active_workers, remarks } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO stats_logs (id, date, period, man_hours, active_workers, remarks, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, date, period || 'Daily', man_hours || 0, active_workers || 0, remarks, req.user?.org_id]
  );
  res.status(201).json({ id });
});

// ---------- EMERGENCY ----------

router.get('/emergency/contacts', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM emergency_contacts WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows);
});

router.post('/emergency/contacts', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { name, role, phone, type, location } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO emergency_contacts (id, name, role, phone, type, location, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, name, role, phone, type, location, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.delete('/emergency/contacts/:id', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM emergency_contacts WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

router.get('/emergency/drills', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM emergency_drills WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows);
});

router.post('/emergency/drills', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { type, date, location, participants_count, duration_minutes, outcome, notes, attendance_list } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO emergency_drills (id, type, date, location, participants_count, duration_minutes, outcome, notes, attendance_list, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, type, date, location, participants_count, duration_minutes, outcome, notes, JSON.stringify(attendance_list || []), req.user?.org_id]
  );
  res.status(201).json({ id });
});

// ---------- RISK ASSESSMENTS ----------

router.get('/risk-assessments', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  const orgId = req.user?.org_id;
  const countResult = await pool.query('SELECT COUNT(*) as total FROM risk_assessments WHERE org_id = $1', [orgId]);
  const total = countResult.rows[0]?.total || 0;
  const rowsResult = await pool.query('SELECT * FROM risk_assessments WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [orgId, limit, offset]);
  const rows = rowsResult.rows;
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(Math.ceil(total / limit)));
  res.json(rows.map((r: any) => ({ ...r, hazards: JSON.parse(r.hazards || '[]') })));
});

router.get('/risk-assessments/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM risk_assessments WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ...row, hazards: JSON.parse(row.hazards || '[]') });
});

router.post('/risk-assessments', requirePermission('create_incident'), async (req: AuthRequest, res: Response) => {
  const { title, task_description, taskDescription, type, date, author, hazards, status } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO risk_assessments (id, title, task_description, type, date, author, hazards, status, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, title, task_description || taskDescription, type || 'JHA', date || new Date().toISOString(), author || req.user?.name, JSON.stringify(hazards || []), status || 'Draft', req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/risk-assessments/:id', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { title, task_description, taskDescription, type, date, hazards, status } = req.body;
  await pool.query(
    `UPDATE risk_assessments SET title=COALESCE($1,title), task_description=COALESCE($2,task_description),
     type=COALESCE($3,type), date=COALESCE($4,date), hazards=COALESCE($5,hazards), status=COALESCE($6,status),
     updated_at=NOW() WHERE id=$7 AND org_id=$8`,
    [title, task_description || taskDescription, type, date, hazards ? JSON.stringify(hazards) : null, status, req.params.id, req.user?.org_id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/risk-assessments/:id', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM risk_assessments WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

// ---------- INSPECTION TEMPLATES ----------

router.get('/inspection-templates', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM inspection_templates WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows.map((r: any) => ({ ...r, items: JSON.parse(r.items || '[]') })));
});

router.post('/inspection-templates', requirePermission('perform_inspection'), async (req: AuthRequest, res: Response) => {
  const { name, category, description, items } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO inspection_templates (id, name, category, description, items, org_id) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, name, category, description, JSON.stringify(items || []), req.user?.org_id]
  );
  res.status(201).json({ id });
});

// ---------- TRAINING MODULES ----------

router.get('/training-modules', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM training_modules WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows.map((r: any) => ({ ...r, required_for_roles: JSON.parse(r.required_for_roles || '[]') })));
});

router.post('/training-modules', requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { title, description, required_for_roles, requiredForRoles, validity_months, validityMonths } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO training_modules (id, title, description, required_for_roles, validity_months, org_id) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, title, description, JSON.stringify(required_for_roles || requiredForRoles || []), validity_months ?? validityMonths ?? 0, req.user?.org_id]
  );
  res.status(201).json({ id });
});

// ---------- TRAINING RECORDS ----------

router.get('/training-records', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM training_records WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows);
});

router.post('/training-records', requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { worker_id, workerId, module_id, moduleId, module_title, moduleTitle, completion_date, completionDate, expiry_date, expiryDate, certificate_url, certificateUrl, status } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO training_records (id, worker_id, module_id, module_title, completion_date, expiry_date, certificate_url, status, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, worker_id || workerId, module_id || moduleId, module_title || moduleTitle, completion_date || completionDate, expiry_date || expiryDate, certificate_url || certificateUrl, status || 'Valid', req.user?.org_id]
  );
  res.status(201).json({ id });
});

// ---------- PPE INVENTORY ----------

router.get('/ppe/inventory', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM ppe_inventory WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows);
});

router.post('/ppe/inventory', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { name, category, stock_quantity, stockQuantity, min_stock_threshold, minStockThreshold, description } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO ppe_inventory (id, name, category, stock_quantity, min_stock_threshold, description, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, name, category, stock_quantity ?? stockQuantity ?? 0, min_stock_threshold ?? minStockThreshold ?? 5, description, req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.put('/ppe/inventory/:id', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { stock_quantity, stockQuantity, name, category } = req.body;
  await pool.query(
    'UPDATE ppe_inventory SET stock_quantity=COALESCE($1,stock_quantity), name=COALESCE($2,name), category=COALESCE($3,category) WHERE id=$4 AND org_id=$5',
    [stock_quantity ?? stockQuantity, name, category, req.params.id, req.user?.org_id]
  );
  res.json({ message: 'Updated' });
});

// ---------- PPE ISSUANCE ----------

router.get('/ppe/issuance', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM ppe_issuance WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows);
});

router.post('/ppe/issuance', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { worker_id, workerId, worker_name, workerName, ppe_item_id, ppeItemId, ppe_item_name, ppeItemName, issue_date, issueDate, expiry_date, expiryDate, signature_url, signatureUrl, status } = req.body;
  const id = uuid();
  const ppeId = ppe_item_id || ppeItemId;
  await pool.query(
    'INSERT INTO ppe_issuance (id, worker_id, worker_name, ppe_item_id, ppe_item_name, issue_date, expiry_date, signature_url, status, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, worker_id || workerId, worker_name || workerName, ppeId, ppe_item_name || ppeItemName, issue_date || issueDate, expiry_date || expiryDate, signature_url || signatureUrl, status || 'Active', req.user?.org_id]
  );
  // Deduct stock
  if (ppeId) {
    await pool.query('UPDATE ppe_inventory SET stock_quantity = GREATEST(0, stock_quantity - 1) WHERE id = $1', [ppeId]);
  }
  res.status(201).json({ id });
});

router.put('/ppe/issuance/:id', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const logResult = await pool.query('SELECT * FROM ppe_issuance WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  const log = logResult.rows[0];
  if (!log) { res.status(404).json({ error: 'Not found' }); return; }
  await pool.query('UPDATE ppe_issuance SET status = $1 WHERE id = $2 AND org_id = $3', [status, req.params.id, req.user?.org_id]);
  // Return stock if returning
  if (status === 'Returned' && log.status === 'Active') {
    await pool.query('UPDATE ppe_inventory SET stock_quantity = stock_quantity + 1 WHERE id = $1', [log.ppe_item_id]);
  }
  res.json({ message: 'Updated' });
});

// ---------- ROLES ----------

router.get('/roles', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM roles ORDER BY created_at DESC');
  res.json(result.rows.map((r: any) => ({ ...r, permissions: JSON.parse(r.permissions || '[]'), isSystem: !!r.is_system })));
});

router.post('/roles', requirePermission('manage_roles'), async (req: AuthRequest, res: Response) => {
  const { name, description, is_system, isSystem, permissions } = req.body;
  // Check if role name already exists
  const existingResult = await pool.query('SELECT id, is_system FROM roles WHERE name = $1', [name]);
  const existing = existingResult.rows[0];
  if (existing) {
    if (existing.is_system) {
      res.status(403).json({ error: 'Cannot overwrite a system role' });
      return;
    }
    // Update existing role
    await pool.query('UPDATE roles SET description = $1, permissions = $2 WHERE id = $3', [description, JSON.stringify(permissions || []), existing.id]);
    res.json({ id: existing.id, message: 'Role updated' });
    return;
  }
  const id = uuid();
  await pool.query('INSERT INTO roles (id, name, description, is_system, permissions) VALUES ($1,$2,$3,$4,$5)', [id, name, description, is_system ?? isSystem ?? 0, JSON.stringify(permissions || [])]);
  res.status(201).json({ id });
});

router.delete('/roles/:id', requirePermission('manage_roles'), async (req: AuthRequest, res: Response) => {
  const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
  const role = roleResult.rows[0];
  if (role && role.is_system) {
    res.status(403).json({ error: 'Cannot delete system role' });
    return;
  }
  await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ---------- SAFETY ZONES ----------

router.get('/safety-zones', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM safety_zones WHERE org_id = $1 ORDER BY created_at DESC', [req.user?.org_id]);
  res.json(result.rows.map((r: any) => ({ ...r, required_ppe: JSON.parse(r.required_ppe || '[]'), required_training: JSON.parse(r.required_training || '[]') })));
});

router.post('/safety-zones', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  const { name, type, lat, lng, radius, required_ppe, requiredPPE, required_training, requiredTraining } = req.body;
  const id = uuid();
  await pool.query(
    'INSERT INTO safety_zones (id, name, type, lat, lng, radius, required_ppe, required_training, org_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, name, type || 'Safe', lat, lng, radius || 100, JSON.stringify(required_ppe || requiredPPE || []), JSON.stringify(required_training || requiredTraining || []), req.user?.org_id]
  );
  res.status(201).json({ id });
});

router.delete('/safety-zones/:id', requirePermission('manage_incidents'), async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM safety_zones WHERE id = $1 AND org_id = $2', [req.params.id, req.user?.org_id]);
  res.json({ message: 'Deleted' });
});

// ---------- HSE METRICS (Calculated) ----------

router.get('/metrics', async (req: AuthRequest, res: Response) => {
  const orgId = req.user?.org_id;
  const [totalIncidents, ltiCount, rwcCount, mtcCount, facCount, nmCount, fatalityCount, totalDaysLost, totalManHours, totalActions, closedActions, totalInspections, passedInspections, leadingActions, leadingClosed, laggingActions, laggingClosed, inspectionsCompleted] = await Promise.all([
    pool.query('SELECT COUNT(*) as c FROM incidents WHERE org_id = $1', [orgId]),
    pool.query("SELECT COUNT(*) as c FROM incidents WHERE (category = 'Lost Time Injury' OR type = 'Lost Time Injury') AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM incidents WHERE (category = 'Restricted Work Case' OR type = 'Restricted Work Case') AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM incidents WHERE (category = 'Medical Treatment Case' OR type = 'Medical Treatment') AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM incidents WHERE (category = 'First Aid Case' OR type = 'First Aid') AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM incidents WHERE (category = 'Near Miss' OR type = 'Near Miss') AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM incidents WHERE category = 'Fatality' AND org_id = $1", [orgId]),
    pool.query('SELECT COALESCE(SUM(days_lost),0) as t FROM incidents WHERE org_id = $1', [orgId]),
    pool.query('SELECT COALESCE(SUM(man_hours),0) as t FROM stats_logs WHERE org_id = $1', [orgId]),
    pool.query('SELECT COUNT(*) as c FROM actions WHERE org_id = $1', [orgId]),
    pool.query("SELECT COUNT(*) as c FROM actions WHERE status IN ('Done','Verified') AND org_id = $1", [orgId]),
    pool.query('SELECT COUNT(*) as c FROM inspections WHERE org_id = $1', [orgId]),
    pool.query('SELECT COUNT(*) as c FROM inspections WHERE score >= 80 AND org_id = $1', [orgId]),
    pool.query("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Leading' AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Leading' AND status IN ('Done','Verified') AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Lagging' AND org_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) as c FROM actions WHERE indicator = 'Lagging' AND status IN ('Done','Verified') AND org_id = $1", [orgId]),
    pool.query('SELECT COUNT(*) as c FROM inspections WHERE completed = 1 AND org_id = $1', [orgId]),
  ]);

  const totalIncidentsVal = Number(totalIncidents.rows[0]?.c || 0);
  const ltiCountVal = Number(ltiCount.rows[0]?.c || 0);
  const rwcCountVal = Number(rwcCount.rows[0]?.c || 0);
  const mtcCountVal = Number(mtcCount.rows[0]?.c || 0);
  const facCountVal = Number(facCount.rows[0]?.c || 0);
  const nmCountVal = Number(nmCount.rows[0]?.c || 0);
  const fatalityCountVal = Number(fatalityCount.rows[0]?.c || 0);
  const totalDaysLostVal = Number(totalDaysLost.rows[0]?.t || 0);
  const totalManHoursVal = Number(totalManHours.rows[0]?.t || 0);
  const totalActionsVal = Number(totalActions.rows[0]?.c || 0);
  const closedActionsVal = Number(closedActions.rows[0]?.c || 0);
  const totalInspectionsVal = Number(totalInspections.rows[0]?.c || 0);
  const passedInspectionsVal = Number(passedInspections.rows[0]?.c || 0);
  const leadingActionsVal = Number(leadingActions.rows[0]?.c || 0);
  const leadingClosedVal = Number(leadingClosed.rows[0]?.c || 0);
  const laggingActionsVal = Number(laggingActions.rows[0]?.c || 0);
  const laggingClosedVal = Number(laggingClosed.rows[0]?.c || 0);
  const inspectionsCompletedVal = Number(inspectionsCompleted.rows[0]?.c || 0);

  const recordableIncidents = mtcCountVal + rwcCountVal + ltiCountVal + fatalityCountVal;
  const trir = totalManHoursVal > 0 ? (recordableIncidents / totalManHoursVal) * 200000 : 0;
  const ltifr = totalManHoursVal > 0 ? (ltiCountVal / totalManHoursVal) * 1000000 : 0;
  const severityRate = totalManHoursVal > 0 ? (totalDaysLostVal / totalManHoursVal) * 200000 : 0;
  const nearMissReportingRate = totalManHoursVal > 0 ? (nmCountVal / totalManHoursVal) * 200000 : 0;
  const actionClosureRate = totalActionsVal > 0 ? (closedActionsVal / totalActionsVal) * 100 : 100;
  const inspectionCompliance = totalInspectionsVal > 0 ? (passedInspectionsVal / totalInspectionsVal) * 100 : 100;
  const leadingClosureRate = leadingActionsVal > 0 ? (leadingClosedVal / leadingActionsVal) * 100 : 100;
  const laggingClosureRate = laggingActionsVal > 0 ? (laggingClosedVal / laggingActionsVal) * 100 : 100;

  res.json({
    totalManHours: totalManHoursVal,
    ltiCount: ltiCountVal,
    mtcCount: mtcCountVal,
    rwcCount: rwcCountVal,
    facCount: facCountVal,
    nmCount: nmCountVal,
    fatalityCount: fatalityCountVal,
    trir: Math.round(trir * 100) / 100,
    ltifr: Math.round(ltifr * 100) / 100,
    severityRate: Math.round(severityRate * 100) / 100,
    actionClosureRate: Math.round(actionClosureRate),
    inspectionCompliance: Math.round(inspectionCompliance),
    leadingActions: leadingActionsVal,
    leadingClosureRate: Math.round(leadingClosureRate),
    laggingActions: laggingActionsVal,
    laggingClosureRate: Math.round(laggingClosureRate),
    inspectionsCompleted: inspectionsCompletedVal,
    trainingHours: 0,
    nearMissReportingRate: Math.round(nearMissReportingRate * 100) / 100,
    daysLost: totalDaysLostVal,
    recordableIncidents
  });
});

// ============ BULK OPERATIONS ============

// Helper: check if user has privileged role (Admin/Manager bypass ownership)
function isPrivilegedRole(role?: string): boolean {
  return role === 'Admin' || role === 'Manager';
}

// Ownership column mapping for bulk operations
const BULK_OWNER_COLUMNS: Record<string, { col: string; altCol?: string }> = {
  incidents: { col: 'reported_by' },
  actions: { col: 'created_by', altCol: 'assignee' },
  observations: { col: 'created_by' },
  risk_assessments: { col: 'author' },
  permits: { col: 'created_by' },
};

// ---------- Bulk Delete Incidents ----------
router.post('/incidents/bulk-delete', requirePermission('DeleteIncidents'), async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  // Non-privileged users can only delete their own records
  if (isPrivilegedRole(req.user?.role)) {
    const params = ids.map((_: any, i: number) => `$${i + 2}`).join(',');
    const result = await pool.query(`DELETE FROM incidents WHERE id IN (${params}) AND org_id = $1`, [req.user?.org_id, ...ids]);
    res.json({ deleted: result.rowCount, message: `${result.rowCount} incident(s) deleted` });
  } else {
    const params = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    const result = await pool.query(`DELETE FROM incidents WHERE id IN (${params}) AND reported_by = $1 AND org_id = $2`, [req.user?.id, req.user?.org_id, ...ids]);
    res.json({ deleted: result.rowCount, message: `${result.rowCount} incident(s) deleted` });
  }
});

// ---------- Bulk Update Incident Status ----------
router.post('/incidents/bulk-status', requirePermission('EditIncidents'), async (req: AuthRequest, res: Response) => {
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
  // Non-privileged users can only update their own records
  if (isPrivilegedRole(req.user?.role)) {
    const params = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    const result = await pool.query(`UPDATE incidents SET status = $1, updated_at = NOW() WHERE id IN (${params}) AND org_id = $2`, [status, req.user?.org_id, ...ids]);
    res.json({ updated: result.rowCount, message: `${result.rowCount} incident(s) updated to ${status}` });
  } else {
    const params = ids.map((_: any, i: number) => `$${i + 4}`).join(',');
    const result = await pool.query(`UPDATE incidents SET status = $1, updated_at = NOW() WHERE id IN (${params}) AND reported_by = $2 AND org_id = $3`, [status, req.user?.id, req.user?.org_id, ...ids]);
    res.json({ updated: result.rowCount, message: `${result.rowCount} incident(s) updated to ${status}` });
  }
});

// ---------- Bulk Delete Actions ----------
router.post('/actions/bulk-delete', requirePermission('DeleteActions'), async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  if (isPrivilegedRole(req.user?.role)) {
    const params = ids.map((_: any, i: number) => `$${i + 2}`).join(',');
    const result = await pool.query(`DELETE FROM actions WHERE id IN (${params}) AND org_id = $1`, [req.user?.org_id, ...ids]);
    res.json({ deleted: result.rowCount, message: `${result.rowCount} action(s) deleted` });
  } else {
    const params = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    const result = await pool.query(`DELETE FROM actions WHERE id IN (${params}) AND (created_by = $1 OR assignee = $1) AND org_id = $2`, [req.user?.id, req.user?.org_id, ...ids]);
    res.json({ deleted: result.rowCount, message: `${result.rowCount} action(s) deleted` });
  }
});

// ---------- Bulk Complete Actions ----------
router.post('/actions/bulk-complete', requirePermission('EditActions'), async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  if (isPrivilegedRole(req.user?.role)) {
    const params = ids.map((_: any, i: number) => `$${i + 2}`).join(',');
    const result = await pool.query(`UPDATE actions SET status = 'Completed', completed_date = NOW() WHERE id IN (${params}) AND status != 'Completed' AND org_id = $1`, [req.user?.org_id, ...ids]);
    res.json({ updated: result.rowCount, message: `${result.rowCount} action(s) completed` });
  } else {
    const params = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    const result = await pool.query(`UPDATE actions SET status = 'Completed', completed_date = NOW() WHERE id IN (${params}) AND status != 'Completed' AND (created_by = $1 OR assignee = $1) AND org_id = $2`, [req.user?.id, req.user?.org_id, ...ids]);
    res.json({ updated: result.rowCount, message: `${result.rowCount} action(s) completed` });
  }
});

// ---------- Bulk Delete Observations ----------
router.post('/observations/bulk-delete', requirePermission('DeleteObservations'), async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per bulk operation' });
  }
  if (isPrivilegedRole(req.user?.role)) {
    const params = ids.map((_: any, i: number) => `$${i + 2}`).join(',');
    const result = await pool.query(`DELETE FROM observations WHERE id IN (${params}) AND org_id = $1`, [req.user?.org_id, ...ids]);
    res.json({ deleted: result.rowCount, message: `${result.rowCount} observation(s) deleted` });
  } else {
    const params = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    const result = await pool.query(`DELETE FROM observations WHERE id IN (${params}) AND created_by = $1 AND org_id = $2`, [req.user?.id, req.user?.org_id, ...ids]);
    res.json({ deleted: result.rowCount, message: `${result.rowCount} observation(s) deleted` });
  }
});

// ---------- Bulk Export (returns records for client-side CSV generation) ----------
router.post('/bulk-export', requirePermission('view_analytics'), async (req: AuthRequest, res: Response) => {
  const { entity, ids } = req.body;
  const allowedEntities = ['incidents', 'actions', 'observations', 'risk_assessments', 'permits'];
  if (!allowedEntities.includes(entity)) {
    return res.status(400).json({ error: 'Invalid entity type' });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 items per export' });
  }
  // Non-privileged users can only export their own records
  const ownerConfig = BULK_OWNER_COLUMNS[entity];
  if (!isPrivilegedRole(req.user?.role) && ownerConfig) {
    const idParams = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    const ownerClause = ownerConfig.altCol
      ? `(${ownerConfig.col} = $1 OR ${ownerConfig.altCol} = $1)`
      : `${ownerConfig.col} = $1`;
    const result = await pool.query(
      `SELECT * FROM ${entity} WHERE id IN (${idParams}) AND ${ownerClause} AND org_id = $2`,
      [req.user?.id, req.user?.org_id, ...ids]
    );
    res.json(result.rows);
  } else {
    const params = ids.map((_: any, i: number) => `$${i + 2}`).join(',');
    const result = await pool.query(`SELECT * FROM ${entity} WHERE id IN (${params}) AND org_id = $1`, [req.user?.org_id, ...ids]);
    res.json(result.rows);
  }
});

export default router;
