import express from 'express';
import {
  generateRepairPlan,
  applyRepairPlan,
  getPriorityAnalysis,
  recalculateAllPriorities,
} from '../controllers/optimizationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate 0/1 knapsack budget optimization plan (Admin & Inspector)
router.post('/plan', authenticate, authorize('admin', 'inspector'), generateRepairPlan);

// Apply repair plan: transition selected defects to SCHEDULED (Admin only)
router.post('/apply', authenticate, authorize('admin'), applyRepairPlan);

// Priority factor breakdown analytics for radar/bar charts (Admin & Inspector)
router.get('/priority-analysis', authenticate, authorize('admin', 'inspector'), getPriorityAnalysis);

// Recalculate priorities across defects (Admin only)
router.post('/recalculate-priorities', authenticate, authorize('admin'), recalculateAllPriorities);

export default router;
