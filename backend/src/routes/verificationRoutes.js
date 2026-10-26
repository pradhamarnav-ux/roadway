import express from 'express';
import {
  getVerificationQueue,
  updateVerificationStatus,
  getDuplicateReviewQueue,
  resolveDuplicate,
  getTriageStats,
} from '../controllers/verificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Triage summary metrics
router.get('/stats', authenticate, authorize('admin', 'inspector'), getTriageStats);

// Verification queue & single update
router.get('/queue', authenticate, authorize('admin', 'inspector'), getVerificationQueue);
router.patch('/reports/:id/status', authenticate, authorize('admin', 'inspector'), updateVerificationStatus);

// Duplicate review & resolution
router.get('/duplicates', authenticate, authorize('admin', 'inspector'), getDuplicateReviewQueue);
router.post('/duplicates/resolve', authenticate, authorize('admin'), resolveDuplicate);

export default router;
