import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('Admin'));

// (No backup endpoints; PostgreSQL backups should be handled externally)

export default router;
