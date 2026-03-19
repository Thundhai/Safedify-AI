/**
 * Environmental Routes — /api/environmental
 *
 * Endpoints:
 *   GET  /weather          — live weather + AQI from OpenWeatherMap (or fallback)
 *   GET  /readings         — list all environmental readings (manual + sensor)
 *   GET  /readings/latest  — latest reading per type (noise, dust, gas, etc.)
 *   POST /readings         — log a new environmental reading (manual or IoT)
 *   GET  /readings/history — time-series for a specific reading type
 *   GET  /locations        — list configured site locations
 *   POST /locations        — add a site location
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import pool from '../postgres';
import { AuthRequest, authenticate } from '../auth.js';
import { fetchWeatherAndAQI, clearWeatherCache } from '../services/weatherService.js';
import { validate, validateQuery, ValidationSchema, sanitizeString } from '../middleware/inputValidation.js';

const router = Router();
router.use(authenticate);

// Validation schemas
const weatherQuerySchema: ValidationSchema = {
  lat: { type: 'number', required: false, min: -90, max: 90 },
  lng: { type: 'number', required: false, min: -180, max: 180 },
};

const readingsQuerySchema: ValidationSchema = {
  type: { type: 'string', required: false, maxLength: 50 },
  from: { type: 'date', required: false },
  to: { type: 'date', required: false },
  location: { type: 'string', required: false, maxLength: 200 },
  limit: { type: 'number', required: false, min: 1, max: 1000 },
};

const historyQuerySchema: ValidationSchema = {
  type: { type: 'string', required: true, maxLength: 50 },
  hours: { type: 'number', required: false, min: 1, max: 8760 }, // Max 1 year
  location: { type: 'string', required: false, maxLength: 200 },
};

const ALLOWED_READING_TYPES = ['noise', 'dust', 'gas_h2s', 'gas_co', 'gas_o2', 'gas_lel', 'temperature', 'humidity', 'vibration', 'light', 'radiation'];

const readingSchema: ValidationSchema = {
  reading_type: { type: 'string', required: true, maxLength: 50, enum: ALLOWED_READING_TYPES },
  value: { type: 'number', required: true, min: -1000, max: 100000 },
  unit: { type: 'string', required: false, maxLength: 20 },
  location: { type: 'string', required: false, maxLength: 200, trim: true },
  zone: { type: 'string', required: false, maxLength: 100, trim: true },
  source: { type: 'string', required: false, maxLength: 50, enum: ['manual', 'sensor', 'iot', 'calibration'] },
  notes: { type: 'string', required: false, maxLength: 2000, trim: true },
  latitude: { type: 'number', required: false, min: -90, max: 90 },
  longitude: { type: 'number', required: false, min: -180, max: 180 },
};

const locationSchema: ValidationSchema = {
  name: { type: 'string', required: true, maxLength: 200, trim: true },
  latitude: { type: 'number', required: false, min: -90, max: 90 },
  longitude: { type: 'number', required: false, min: -180, max: 180 },
  is_default: { type: 'boolean', required: false },
};

// ──────────────────────────────────────────
//  LIVE WEATHER + AQI
// ──────────────────────────────────────────

router.get('/weather', validateQuery(weatherQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    
    // Validate coordinates are within bounds
    if (lat !== undefined && (lat < -90 || lat > 90)) {
      res.status(400).json({ error: 'Invalid latitude. Must be between -90 and 90.' });
      return;
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
      res.status(400).json({ error: 'Invalid longitude. Must be between -180 and 180.' });
      return;
    }
    
    const data = await fetchWeatherAndAQI(lat, lng);

    // Merge latest noise reading from DB into the weather response
    const latestNoiseResult = await pool.query(
      `SELECT value FROM environmental_readings WHERE reading_type = 'noise' AND org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user?.org_id]
    );
    const latestNoise = latestNoiseResult.rows[0];

    const merged = {
      ...data,
      noiseLevel: latestNoise?.value ?? null,
      noiseSource: latestNoise ? 'recorded' : 'none',
    };

    res.json(merged);
  } catch (err: any) {
    console.error('[Environmental] Weather fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Force clear weather cache (e.g., after changing location)
router.post('/weather/refresh', (_req: AuthRequest, res: Response) => {
  clearWeatherCache();
  res.json({ ok: true, message: 'Weather cache cleared' });
});

// ──────────────────────────────────────────
//  ENVIRONMENTAL READINGS (Manual + IoT)
// ──────────────────────────────────────────

// List all readings (newest first), with optional type & date filters
router.get('/readings', validateQuery(readingsQuerySchema), async (req: AuthRequest, res: Response) => {
  const { type, from, to, location, limit } = req.query;
  let sql = 'SELECT * FROM environmental_readings WHERE org_id = $1';
  const params: any[] = [req.user?.org_id];

  // Sanitize and validate query parameters
  if (type) { 
    const sanitizedType = sanitizeString(type as string, { stripHtml: true, maxLength: 50 });
    sql += ' AND reading_type = $' + (params.length + 1); 
    params.push(sanitizedType); 
  }
  if (from) { sql += ' AND created_at >= $' + (params.length + 1); params.push(from); }
  if (to) { sql += ' AND created_at <= $' + (params.length + 1); params.push(to); }
  if (location) { 
    const sanitizedLocation = sanitizeString(location as string, { stripHtml: true, maxLength: 200 });
    sql += ' AND location = $' + (params.length + 1); 
    params.push(sanitizedLocation); 
  }

  sql += ' ORDER BY created_at DESC';
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit as string, 10) || 100));
  sql += ` LIMIT $${params.length + 1}`;
  params.push(parsedLimit);

  const result = await pool.query(sql, params);
  res.json(result.rows);
});

// Latest reading per type
router.get('/readings/latest', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT er.* FROM environmental_readings er
    INNER JOIN (
      SELECT reading_type, MAX(created_at) as max_date
      FROM environmental_readings
      WHERE org_id = $1
      GROUP BY reading_type
    ) latest ON er.reading_type = latest.reading_type AND er.created_at = latest.max_date
    WHERE er.org_id = $1
    ORDER BY er.reading_type
  `, [req.user?.org_id]);
  res.json(result.rows);
});

// Time-series for charts (returns values for a given type ordered chronologically)
router.get('/readings/history', validateQuery(historyQuerySchema), async (req: AuthRequest, res: Response) => {
  const { type, hours = '24', location } = req.query;
  if (!type) { res.status(400).json({ error: 'reading type is required (?type=noise)' }); return; }
  
  // Sanitize and validate query parameters
  const sanitizedType = sanitizeString(type as string, { stripHtml: true, maxLength: 50 });
  if (!ALLOWED_READING_TYPES.includes(sanitizedType)) {
    res.status(400).json({ error: 'Invalid reading type' });
    return;
  }

  const hoursBack = Math.min(8760, Math.max(1, parseInt(hours as string, 10) || 24)); // Max 1 year
  const params: any[] = [sanitizedType];
  let paramIndex = 2;
  
  let sql = `SELECT id, value, unit, location, zone, source, created_at
    FROM environmental_readings
    WHERE reading_type = $1 AND org_id = $${paramIndex} AND created_at >= NOW() - INTERVAL '1 hour' * $${paramIndex + 1}`;
  params.push(req.user?.org_id);
  paramIndex++;
  params.push(hoursBack);
  paramIndex++;
  
  if (location) { 
    const sanitizedLocation = sanitizeString(location as string, { stripHtml: true, maxLength: 200 });
    sql += ` AND location = $${paramIndex}`; 
    params.push(sanitizedLocation);
  }
  sql += ' ORDER BY created_at ASC';

  const result = await pool.query(sql, params);
  res.json(result.rows);
});

// Log a new reading
router.post('/readings', validate(readingSchema), async (req: AuthRequest, res: Response) => {
  const b = req.body;
  const id = uuid();

  if (!b.reading_type || b.value == null) {
    res.status(400).json({ error: 'reading_type and value are required' });
    return;
  }
  
  // Validate reading_type against allowlist
  if (!ALLOWED_READING_TYPES.includes(b.reading_type)) {
    res.status(400).json({ error: 'Invalid reading_type' });
    return;
  }

  // Determine unit based on reading_type if not provided
  const units: Record<string, string> = {
    noise: 'dB',
    dust: 'mg/m³',
    gas_h2s: 'ppm',
    gas_co: 'ppm',
    gas_o2: '%',
    gas_lel: '%LEL',
    temperature: '°C',
    humidity: '%',
    vibration: 'mm/s',
    light: 'lux',
    radiation: 'μSv/h',
  };

  const unit = b.unit || units[b.reading_type] || '';

  // Sanitize string inputs
  const sanitizedLocation = b.location ? sanitizeString(b.location, { stripHtml: true, maxLength: 200 }) : 'Site Zone A';
  const sanitizedZone = b.zone ? sanitizeString(b.zone, { stripHtml: true, maxLength: 100 }) : null;
  const sanitizedSource = b.source && ['manual', 'sensor', 'iot', 'calibration'].includes(b.source) ? b.source : 'manual';
  const sanitizedNotes = b.notes ? sanitizeString(b.notes, { stripHtml: true, maxLength: 2000 }) : null;

  await pool.query(
    `INSERT INTO environmental_readings (id, reading_type, value, unit, location, zone, source, recorded_by, notes, latitude, longitude, org_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      b.reading_type,
      b.value,
      unit,
      sanitizedLocation,
      sanitizedZone,
      sanitizedSource,
      req.user?.id ?? null,
      sanitizedNotes,
      b.latitude ?? null,
      b.longitude ?? null,
      req.user?.org_id,
    ]
  );

  const result = await pool.query('SELECT * FROM environmental_readings WHERE id = $1', [id]);
  res.status(201).json(result.rows[0]);
});

// ──────────────────────────────────────────
//  SITE LOCATIONS
// ──────────────────────────────────────────

router.get('/locations', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM site_locations WHERE org_id = $1 ORDER BY is_default DESC, name ASC', [req.user?.org_id]);
  res.json(result.rows);
});

router.post('/locations', validate(locationSchema), async (req: AuthRequest, res: Response) => {
  const { name, latitude, longitude, is_default } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const id = uuid();
  
  // Sanitize the name
  const sanitizedName = sanitizeString(name, { stripHtml: true, maxLength: 200 }).trim();
  if (!sanitizedName) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  // If setting as default, only unset within this org
  if (is_default) {
    await pool.query('UPDATE site_locations SET is_default = 0 WHERE org_id = $1', [req.user?.org_id]);
  }

  await pool.query(
    'INSERT INTO site_locations (id, name, latitude, longitude, is_default, org_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, sanitizedName, latitude ?? null, longitude ?? null, is_default ? 1 : 0, req.user?.org_id]
  );

  const result = await pool.query('SELECT * FROM site_locations WHERE id = $1', [id]);
  res.status(201).json(result.rows[0]);
});

export default router;
