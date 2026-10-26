import express from 'express';
import {
  createReport,
  getMyReports,
  getReportById,
  getAllReports,
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';

const router = express.Router();

// Citizen report submission with safe photo upload
router.post('/', authenticate, uploadPhoto.single('photo'), createReport);

// Citizen reports list
router.get('/my', authenticate, getMyReports);

// Admin & Inspector access to all reports
router.get('/', authenticate, authorize('admin', 'inspector'), getAllReports);

// Get single report detail
router.get('/:id', authenticate, getReportById);

export default router;
