import express from 'express';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  getIncidentStats,
} from '../controllers/incidentController.js';
import { authenticateToken, authorizePermission } from '../middleware/auth.js';
import { validateIncident, validateUUID, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get incident statistics
router.get('/stats', getIncidentStats);

// CRUD operations
router.get('/', validatePagination, getIncidents);
router.get('/:id', validateUUID, getIncidentById);
router.post('/', authorizePermission('create_incident'), validateIncident, createIncident);
router.put('/:id', authorizePermission('manage_incidents'), validateUUID, updateIncident);
router.delete('/:id', authorizePermission('manage_incidents'), validateUUID, deleteIncident);

export default router;
