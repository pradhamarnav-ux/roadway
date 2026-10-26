import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getWalletOverview,
  getTransactionHistory,
  getLeaderboard,
  updatePreferences,
  getPerksCatalog,
  redeemPerk,
  awardVerificationPoints,
} from '../controllers/rewardController.js';

const router = express.Router();

// Civic Wallet overview & stats
router.get('/wallet', authenticate, getWalletOverview);

// Full append-only ledger transaction history
router.get('/history', authenticate, getTransactionHistory);

// Monthly top-100 leaderboard with privacy support
router.get('/leaderboard', authenticate, getLeaderboard);

// Update citizen privacy preferences (alias / opt-out)
router.patch('/preferences', authenticate, updatePreferences);

// Simulated perks catalog
router.get('/perks', authenticate, getPerksCatalog);

// Atomic perk redemption
router.post('/redeem', authenticate, redeemPerk);

// Verification decision reward hook (Admin / Inspector only)
router.post('/verify-award', authenticate, authorize('admin', 'inspector'), awardVerificationPoints);

export default router;
