import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', (req, res) => {
  res.json({
    success: true,
    message: 'Public endpoint accessible without authentication.',
  });
});

router.get('/protected', authenticate, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.name}, you are authenticated as '${req.user.role}'.`,
    user: req.user,
  });
});

router.get('/citizen-only', authenticate, authorize('citizen'), (req, res) => {
  res.json({
    success: true,
    message: 'Citizen portal accessed successfully.',
    userRole: req.user.role,
  });
});

router.get('/inspector-only', authenticate, authorize('inspector'), (req, res) => {
  res.json({
    success: true,
    message: 'Inspector field console accessed successfully.',
    userRole: req.user.role,
  });
});

router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin municipal command center accessed successfully.',
    userRole: req.user.role,
  });
});

export default router;
