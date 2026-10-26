import express from 'express';
import {
  createAccident,
  getAllAccidents,
  getAccidentsByIssue,
  updateAccidentAttribution,
  getAccidentStats,
} from '../controllers/accidentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';

const router = express.Router();

// Optional upload middleware supporting both multipart file uploads and JSON
const optionalUpload = (req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return uploadPhoto.single('photo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  }
  next();
};

// Report an accident (Citizen / Officer / Any authenticated user)
router.post('/', authenticate, optionalUpload, createAccident);

// Citywide accident statistics for command center
router.get('/stats', authenticate, authorize('admin', 'inspector'), getAccidentStats);

// Admin / Inspector review list
router.get('/', authenticate, authorize('admin', 'inspector'), getAllAccidents);

// Get accidents for an issue
router.get('/issue/:issueId', authenticate, getAccidentsByIssue);

// Admin updates attribution tier and/or verification status
router.patch('/:id/attribution', authenticate, authorize('admin'), updateAccidentAttribution);
router.patch('/:id/status', authenticate, authorize('admin'), updateAccidentAttribution);

export default router;
