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
import db from '../db.js';
import { AuthRequest, authenticate } from '../auth.js';
import { fetchWeatherAndAQI, clearWeatherCache } from '../services/weatherService.js';

const router = Router();
router.use(authenticate);

// ──────────────────────────────────────────
//  LIVE WEATHER + AQI
// ──────────────────────────────────────────

router.get('/weather', async (req: AuthRequest, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const data = await fetchWeatherAndAQI(lat, lng);

    // Merge latest noise reading from DB into the weather response
    const latestNoise = db.prepare(
      `SELECT value FROM environmental_readings WHERE reading_type = 'noise' ORDER BY created_at DESC LIMIT 1`
    ).get() as any;

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
router.get('/readings', (req: AuthRequest, res: Response) => {
  const { type, from, to, location, limit } = req.query;
  let sql = 'SELECT * FROM environmental_readings WHERE 1=1';
  const params: any[] = [];

  if (type) { sql += ' AND reading_type = ?'; params.push(type); }
  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to) { sql += ' AND created_at <= ?'; params.push(to); }
  if (location) { sql += ' AND location = ?'; params.push(location); }

  sql += ' ORDER BY created_at DESC';
  if (limit) { sql += ` LIMIT ${parseInt(limit as string, 10) || 100}`; }

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Latest reading per type
router.get('/readings/latest', (_req: AuthRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT er.* FROM environmental_readings er
    INNER JOIN (
      SELECT reading_type, MAX(created_at) as max_date
      FROM environmental_readings
      GROUP BY reading_type
    ) latest ON er.reading_type = latest.reading_type AND er.created_at = latest.max_date
    ORDER BY er.reading_type
  `).all();
  res.json(rows);
});

// Time-series for charts (returns values for a given type ordered chronologically)
router.get('/readings/history', (req: AuthRequest, res: Response) => {
  const { type, hours = '24', location } = req.query;
  if (!type) { res.status(400).json({ error: 'reading type is required (?type=noise)' }); return; }

  const hoursBack = parseInt(hours as string, 10) || 24;
  let sql = `SELECT id, value, unit, location, zone, source, created_at
    FROM environmental_readings
    WHERE reading_type = ? AND created_at >= datetime('now', ?)`;
  const params: any[] = [type, `-${hoursBack} hours`];
  if (location) { sql += ' AND location = ?'; params.push(location); }
  sql += ' ORDER BY created_at ASC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Log a new reading
router.post('/readings', (req: AuthRequest, res: Response) => {
  const b = req.body;
  const id = uuid();

  if (!b.reading_type || b.value == null) {
    res.status(400).json({ error: 'reading_type and value are required' });
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

  db.prepare(
    `INSERT INTO environmental_readings (id, reading_type, value, unit, location, zone, source, recorded_by, notes, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    b.reading_type,
    b.value,
    unit,
    b.location ?? 'Site Zone A',
    b.zone ?? null,
    b.source ?? 'manual',
    req.user?.id ?? null,
    b.notes ?? null,
    b.latitude ?? null,
    b.longitude ?? null,
  );

  const row = db.prepare('SELECT * FROM environmental_readings WHERE id = ?').get(id);
  res.status(201).json(row);
});

// ──────────────────────────────────────────
//  SITE LOCATIONS
// ──────────────────────────────────────────

router.get('/locations', (_req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM site_locations ORDER BY is_default DESC, name ASC').all();
  res.json(rows);
});

router.post('/locations', (req: AuthRequest, res: Response) => {
  const { name, latitude, longitude, is_default } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const id = uuid();

  // If setting as default, unset existing default
  if (is_default) {
    db.prepare('UPDATE site_locations SET is_default = 0').run();
  }

  db.prepare(
    'INSERT INTO site_locations (id, name, latitude, longitude, is_default) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, latitude ?? null, longitude ?? null, is_default ? 1 : 0);

  const row = db.prepare('SELECT * FROM site_locations WHERE id = ?').get(id);
  res.status(201).json(row);
});

export default router;
