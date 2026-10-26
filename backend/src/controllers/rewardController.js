import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { RewardLedger } from '../models/RewardLedger.js';
import {
  REWARD_POINTS,
  SIMULATED_PERKS_CATALOG,
  BADGES_CATALOG,
  checkDailyAntiAbuseLimit,
  awardReportVerificationPoints,
  redeemPerkAtomic,
  evaluateAndAwardBadges,
} from '../algorithms/rewardEngine.js';

/**
 * @desc    Get user's civic wallet overview, balance, badges, and quick stats
 * @route   GET /api/rewards/wallet
 * @access  Private (Citizen, Inspector, Admin)
 */
export const getWalletOverview = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Refresh badges based on current history
    const freshBadges = await evaluateAndAwardBadges(user);

    // Fetch user's ledger entries
    const ledger = await RewardLedger.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Compute all-time stats
    const allLedgers = await RewardLedger.find({ user: user._id }).lean();
    let totalEarned = 0;
    let totalRedeemed = 0;

    for (const item of allLedgers) {
      if (item.pointsDelta > 0) totalEarned += item.pointsDelta;
      if (item.pointsDelta < 0) totalRedeemed += Math.abs(item.pointsDelta);
    }

    const verifiedReportsCount = await Report.countDocuments({
      reporter: user._id,
      verificationStatus: { $in: ['INSPECTOR_VERIFIED', 'CORROBORATED'] },
    });

    const antiAbuseStatus = await checkDailyAntiAbuseLimit(user._id);

    return res.json({
      success: true,
      wallet: {
        pointsBalance: user.pointsBalance || 0,
        totalEarned,
        totalRedeemed,
        verifiedReportsCount,
        alias: user.alias,
        optOutLeaderboard: Boolean(user.optOutLeaderboard),
        useAliasOnLeaderboard: Boolean(user.useAliasOnLeaderboard),
        badges: user.badges || [],
        antiAbuse: {
          pointsEarned24h: antiAbuseStatus.pointsEarned24h,
          remainingToday: antiAbuseStatus.remainingToday,
          dailyCap: 250,
        },
        recentTransactions: ledger,
      },
    });
  } catch (error) {
    console.error('Error fetching civic wallet:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve civic wallet.',
      details: error.message,
    });
  }
};

/**
 * @desc    Get full append-only transaction history
 * @route   GET /api/rewards/history
 * @access  Private
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const history = await RewardLedger.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction history.',
    });
  }
};

/**
 * @desc    Get Monthly Top-100 Leaderboard with privacy alias / opt-out
 * @route   GET /api/rewards/leaderboard
 * @access  Private / Authenticated
 */
export const getLeaderboard = async (req, res) => {
  try {
    // Exclude users who have opted out of the public leaderboard
    const citizens = await User.find({
      role: 'citizen',
      optOutLeaderboard: false,
    })
      .select('name alias optOutLeaderboard useAliasOnLeaderboard pointsBalance badges createdAt')
      .sort({ pointsBalance: -1, createdAt: 1 })
      .limit(100)
      .lean();

    const leaderboard = citizens.map((citizen, index) => {
      const displayName = citizen.useAliasOnLeaderboard
        ? citizen.alias
        : citizen.name || citizen.alias;

      return {
        rank: index + 1,
        userId: citizen._id,
        displayName,
        alias: citizen.alias,
        pointsBalance: citizen.pointsBalance || 0,
        badgesCount: citizen.badges ? citizen.badges.length : 0,
        badges: citizen.badges || [],
        isCurrentUser: citizen._id.toString() === req.user._id.toString(),
      };
    });

    // Also check current user's personal rank if opted in
    const currentUser = await User.findById(req.user._id).select('pointsBalance optOutLeaderboard alias useAliasOnLeaderboard');
    let userRank = null;
    if (currentUser && !currentUser.optOutLeaderboard) {
      const higherCount = await User.countDocuments({
        role: 'citizen',
        optOutLeaderboard: false,
        pointsBalance: { $gt: currentUser.pointsBalance || 0 },
      });
      userRank = higherCount + 1;
    }

    return res.json({
      success: true,
      leaderboard,
      userRank,
      currentUserOptedOut: Boolean(currentUser?.optOutLeaderboard),
      totalChampions: citizens.length,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve civic leaderboard.',
    });
  }
};

/**
 * @desc    Update citizen rewards & leaderboard privacy preferences
 * @route   PATCH /api/rewards/preferences
 * @access  Private (Citizen)
 */
export const updatePreferences = async (req, res) => {
  try {
    const { alias, optOutLeaderboard, useAliasOnLeaderboard } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (alias !== undefined && typeof alias === 'string' && alias.trim().length > 0) {
      user.alias = alias.trim().slice(0, 30);
    }
    if (optOutLeaderboard !== undefined) {
      user.optOutLeaderboard = Boolean(optOutLeaderboard);
    }
    if (useAliasOnLeaderboard !== undefined) {
      user.useAliasOnLeaderboard = Boolean(useAliasOnLeaderboard);
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Civic preferences updated successfully.',
      preferences: {
        alias: user.alias,
        optOutLeaderboard: user.optOutLeaderboard,
        useAliasOnLeaderboard: user.useAliasOnLeaderboard,
      },
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update preferences.',
    });
  }
};

/**
 * @desc    Get simulated perks catalog with demo disclaimers
 * @route   GET /api/rewards/perks
 * @access  Private
 */
export const getPerksCatalog = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('pointsBalance');

    return res.json({
      success: true,
      userBalance: user?.pointsBalance || 0,
      perks: SIMULATED_PERKS_CATALOG,
      badgesCatalog: BADGES_CATALOG,
      disclaimer: 'DEMO ONLY • All vouchers and perks are simulated municipal demo items with no cash, commercial or financial value.',
    });
  } catch (error) {
    console.error('Error fetching perks catalog:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve perks catalog.',
    });
  }
};

/**
 * @desc    Atomic redemption of a simulated municipal perk
 * @route   POST /api/rewards/redeem
 * @access  Private (Citizen)
 */
export const redeemPerk = async (req, res) => {
  try {
    const { perkId } = req.body;

    if (!perkId) {
      return res.status(400).json({
        success: false,
        error: 'Please specify the perkId to redeem.',
      });
    }

    const result = await redeemPerkAtomic({
      userId: req.user._id,
      perkId,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error redeeming perk:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to redeem simulated perk.',
    });
  }
};

/**
 * @desc    Award verification points (Admin / Inspector verification trigger)
 * @route   POST /api/rewards/verify-award
 * @access  Private (Admin / Inspector)
 */
export const awardVerificationPoints = async (req, res) => {
  try {
    const { reportId, isFirstReport = true } = req.body;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide reportId.',
      });
    }

    const result = await awardReportVerificationPoints({
      reportId,
      isFirstReport,
    });

    return res.json(result);
  } catch (error) {
    console.error('Error awarding verification points:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process verification reward.',
      details: error.message,
    });
  }
};
