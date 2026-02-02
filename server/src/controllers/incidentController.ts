import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all incidents
export const getIncidents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const severity = req.query.severity as string;

    let queryText = `
      SELECT i.*, u.name as reporter_name
      FROM incidents i
      LEFT JOIN users u ON i.reporter_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND i.status = $${paramCount}`;
      params.push(status);
    }

    if (severity) {
      paramCount++;
      queryText += ` AND i.severity = $${paramCount}`;
      params.push(severity);
    }

    queryText += ` ORDER BY i.date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM incidents WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (severity) {
      countParamCount++;
      countQuery += ` AND severity = $${countParamCount}`;
      countParams.push(severity);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      incidents: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

// Get incident by ID
export const getIncidentById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT i.*, u.name as reporter_name
       FROM incidents i
       LEFT JOIN users u ON i.reporter_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(200).json({ incident: result.rows[0] });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

// Create incident
export const createIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const { description, date, location, type, severity, images, aiClassification } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await query(
      `INSERT INTO incidents (description, date, location, type, severity, images, reporter_id, ai_classification, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        description,
        date,
        location,
        type,
        severity,
        JSON.stringify(images || []),
        req.user.id,
        JSON.stringify(aiClassification || null),
        'Open',
      ]
    );

    res.status(201).json({
      message: 'Incident created successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
};

// Update incident
export const updateIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { description, date, location, type, severity, status, images, investigation } = req.body;

  try {
    const result = await query(
      `UPDATE incidents
       SET description = COALESCE($1, description),
           date = COALESCE($2, date),
           location = COALESCE($3, location),
           type = COALESCE($4, type),
           severity = COALESCE($5, severity),
           status = COALESCE($6, status),
           images = COALESCE($7, images),
           investigation = COALESCE($8, investigation)
       WHERE id = $9
       RETURNING *`,
      [
        description,
        date,
        location,
        type,
        severity,
        status,
        images ? JSON.stringify(images) : null,
        investigation ? JSON.stringify(investigation) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(200).json({
      message: 'Incident updated successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
};

// Delete incident
export const deleteIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM incidents WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(200).json({ message: 'Incident deleted successfully' });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ error: 'Failed to delete incident' });
  }
};

// Get incident statistics
export const getIncidentStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'Investigating' THEN 1 END) as investigating,
        COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed,
        COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'High' THEN 1 END) as high,
        COUNT(CASE WHEN severity = 'Medium' THEN 1 END) as medium,
        COUNT(CASE WHEN severity = 'Low' THEN 1 END) as low
      FROM incidents
    `);

    res.status(200).json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Get incident stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
