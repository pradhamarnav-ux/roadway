import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';
import {
  getMapDefects,
  getRepairs,
  getRepairById,
  scheduleRepair,
  assignRepairTeam,
  startRepair,
  submitInspectionEvidence,
  closeRepair,
  getInspectorTasks,
  getRepairAnalytics,
} from '../controllers/repairController.js';

const router = express.Router();

// GIS map defects endpoint (public/authenticated for citizen, inspector, admin)
router.get('/map-defects', authenticate, getMapDefects);

// Analytics overview
router.get('/analytics/overview', authenticate, authorize('admin', 'inspector'), getRepairAnalytics);

// Inspector tasks view
router.get('/inspector/tasks', authenticate, authorize('admin', 'inspector'), getInspectorTasks);

// List all repairs
router.get('/', authenticate, getRepairs);

// Get single repair detail
router.get('/:id', authenticate, getRepairById);

// Admin workflow transitions
router.patch('/:id/schedule', authenticate, authorize('admin'), scheduleRepair);
router.patch('/:id/assign', authenticate, authorize('admin'), assignRepairTeam);
router.patch('/:id/start', authenticate, authorize('admin', 'inspector'), startRepair);
router.post('/:id/inspect', authenticate, authorize('admin', 'inspector'), uploadPhoto.single('photo'), submitInspectionEvidence);
router.patch('/:id/close', authenticate, authorize('admin'), closeRepair);

export default router;
