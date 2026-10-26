import crypto from 'crypto';
import { User } from '../models/User.js';
import { RewardLedger } from '../models/RewardLedger.js';
import { Report } from '../models/Report.js';

/**
 * Standard Civic Point Values (Spec Section 12)
 */
export const REWARD_POINTS = {
  FIRST_REPORT_VERIFIED: 50,  // First valid report of new road defect
  QUALITY_PHOTO_EXIF: 20,     // Quality photo with matching EXIF GPS coordinates
  CORROBORATION_VERIFIED: 15, // Follow-up corroborating report on existing defect
  BADGE_BONUS: 25,            // Milestone achievement bonus
};

/**
 * Anti-Abuse Configuration Limits
 */
export const ANTI_ABUSE_CONFIG = {
  DAILY_POINTS_CAP: 250,        // Max points a single citizen can earn per 24 hours
  MAX_DAILY_VERIFICATIONS: 10,  // Max verified reports credited per day
};

/**
 * Badges Catalog
 */
export const BADGES_CATALOG = [
  {
    id: 'CIVIC_SCOUT',
    name: 'Civic Scout',
    description: 'Submitted your first officially verified road hazard report.',
    icon: 'Compass',
    criteria: '1+ verified reports',
  },
  {
    id: 'POTHOLE_HUNTER',
    name: 'Pothole Hunter',
    description: 'Helped locate and verify 3 or more structural potholes across municipal roads.',
    icon: 'Target',
    criteria: '3+ verified pothole reports',
  },
  {
    id: 'EAGLE_EYE',
    name: 'Eagle Eye',
    description: 'Submitted high-fidelity evidence photo with validated camera EXIF GPS metadata.',
    icon: 'Eye',
    criteria: '1+ reports with valid EXIF match',
  },
  {
    id: 'NEIGHBORHOOD_GUARDIAN',
    name: 'Neighborhood Guardian',
    description: 'Actively protected community corridors with 5 or more verified/corroborated reports.',
    icon: 'Shield',
    criteria: '5+ verified reports',
  },
  {
    id: 'COMMUNITY_LEGEND',
    name: 'Community Legend',
    description: 'Accumulated 150+ civic reward points through persistent, authentic civic stewardship.',
    icon: 'Crown',
    criteria: '150+ total civic points balance',
  },
];

/**
 * Simulated Rewards Store Catalog (Spec Section 12)
 * Strictly non-monetary civic perks with explicit demo disclaimer.
 */
export const SIMULATED_PERKS_CATALOG = [
  {
    id: 'PERK-TRANSIT-PASS',
    name: 'City Transit Day Pass Voucher',
    category: 'Public Transit',
    cost: 100,
    description: 'Full 1-day unlimited travel voucher across municipal bus and metro transit networks.',
    icon: 'Bus',
    isDemoOnly: true,
    disclaimer: 'DEMO ONLY • Simulated civic perk with no real cash or financial value.',
    partner: 'City Department of Transportation',
    validityDays: 30,
  },
  {
    id: 'PERK-PARKING-CREDIT',
    name: 'Municipal 2-Hour Parking Waiver',
    category: 'Parking',
    cost: 75,
    description: '2-hour parking fee exemption voucher at designated municipal surface parking lots.',
    icon: 'Car',
    isDemoOnly: true,
    disclaimer: 'DEMO ONLY • Simulated civic perk with no real cash or financial value.',
    partner: 'Municipal Urban Parking Authority',
    validityDays: 14,
  },
  {
    id: 'PERK-SPORTS-PASS',
    name: 'Civic Sports Complex Day Pass',
    category: 'Recreation',
    cost: 120,
    description: 'Full-day access pass for municipal swimming pool, indoor courts, and community gym.',
    icon: 'Activity',
    isDemoOnly: true,
    disclaimer: 'DEMO ONLY • Simulated civic perk with no real cash or financial value.',
    partner: 'Department of Parks & Recreation',
    validityDays: 60,
  },
  {
    id: 'PERK-TREE-DEDICATION',
    name: 'Urban Canopy Tree Planting Dedication',
    category: 'Environment',
    cost: 200,
    description: 'A native shade sapling planted along municipal transit corridors, registered in citizen name.',
    icon: 'Trees',
    isDemoOnly: true,
    disclaimer: 'DEMO ONLY • Simulated civic perk with no real cash or financial value.',
    partner: 'City Urban Greening Initiative',
    validityDays: 365,
  },
  {
    id: 'PERK-CAFE-VOUCHER',
    name: 'Central Library Cafe Beverage Voucher',
    category: 'Community',
    cost: 50,
    description: 'Complimentary specialty coffee or cold brew voucher at Central Municipal Library Cafe.',
    icon: 'Coffee',
    isDemoOnly: true,
    disclaimer: 'DEMO ONLY • Simulated civic perk with no real cash or financial value.',
    partner: 'Municipal Library Board',
    validityDays: 30,
  },
];

/**
 * Generate a cryptographically deterministic idempotency key
 * Format: hash(userId:reportIdOrTarget:actionType)
 */
export function generateIdempotencyKey(userId, targetId, actionType) {
  const raw = `${String(userId)}:${String(targetId)}:${String(actionType)}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Check rolling 24-hour anti-abuse points cap
 */
export async function checkDailyAntiAbuseLimit(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLedgers = await RewardLedger.find({
    user: userId,
    pointsDelta: { $gt: 0 },
    createdAt: { $gte: since },
  }).lean();

  const pointsEarned24h = recentLedgers.reduce((acc, curr) => acc + curr.pointsDelta, 0);
  const remainingToday = Math.max(0, ANTI_ABUSE_CONFIG.DAILY_POINTS_CAP - pointsEarned24h);

  return {
    allowed: remainingToday > 0,
    pointsEarned24h,
    remainingToday,
    verificationsCount: recentLedgers.length,
  };
}

/**
 * Evaluate and unlock eligible citizen badges
 */
export async function evaluateAndAwardBadges(user) {
  if (!user || user.role !== 'citizen') return [];

  // Query user's verified reports
  const userReports = await Report.find({
    reporter: user._id,
    verificationStatus: { $in: ['INSPECTOR_VERIFIED', 'CORROBORATED'] },
  }).lean();

  const totalVerified = userReports.length;
  const potholesVerified = userReports.filter((r) => r.damageType === 'pothole').length;
  const exifMatches = userReports.filter((r) => r.evidenceBreakdown?.exifMatched || r.evidenceBreakdown?.exifLocationMatch).length;
  const currentPoints = user.pointsBalance || 0;

  const existingBadgeIds = new Set((user.badges || []).map((b) => b.id));
  const newlyAwardedBadges = [];

  for (const badgeDef of BADGES_CATALOG) {
    if (existingBadgeIds.has(badgeDef.id)) continue;

    let qualifies = false;
    if (badgeDef.id === 'CIVIC_SCOUT' && totalVerified >= 1) qualifies = true;
    if (badgeDef.id === 'POTHOLE_HUNTER' && potholesVerified >= 3) qualifies = true;
    if (badgeDef.id === 'EAGLE_EYE' && exifMatches >= 1) qualifies = true;
    if (badgeDef.id === 'NEIGHBORHOOD_GUARDIAN' && totalVerified >= 5) qualifies = true;
    if (badgeDef.id === 'COMMUNITY_LEGEND' && currentPoints >= 150) qualifies = true;

    if (qualifies) {
      newlyAwardedBadges.push({
        id: badgeDef.id,
        name: badgeDef.name,
        description: badgeDef.description,
        awardedAt: new Date(),
      });
    }
  }

  if (newlyAwardedBadges.length > 0) {
    if (!user.badges) user.badges = [];
    user.badges.push(...newlyAwardedBadges);
    await user.save();
  }

  return newlyAwardedBadges;
}

/**
 * Backend-only reward crediting after verified decisions.
 * Implements strict spec rules:
 * - Idempotency key per action (same event can NEVER pay twice)
 * - Zero points for duplicates
 * - Zero points for accidents
 * - Zero points for severity claims (point values are fixed)
 * - Anti-abuse rolling daily limit enforcement
 */
export async function awardReportVerificationPoints({ reportId, isFirstReport = true, manualNotes = '' }) {
  const report = await Report.findById(reportId).populate('reporter');
  if (!report) {
    return { success: false, error: 'Report not found' };
  }

  const user = report.reporter;
  if (!user || user.role !== 'citizen') {
    return { success: false, error: 'Points are only awarded to citizen accounts.' };
  }

  // RULE 1: Only verified reports qualify
  const isValidStatus = ['INSPECTOR_VERIFIED', 'CORROBORATED'].includes(report.verificationStatus);
  if (!isValidStatus) {
    return {
      success: false,
      error: `Points are only awarded upon official verification. Current status: ${report.verificationStatus}`,
      pointsAwarded: 0,
    };
  }

  // Check rolling 24h cap
  const abuseCheck = await checkDailyAntiAbuseLimit(user._id);
  if (!abuseCheck.allowed) {
    return {
      success: false,
      error: `Daily rewards limit reached (${ANTI_ABUSE_CONFIG.DAILY_POINTS_CAP} pts/24h). Anti-abuse throttle active.`,
      pointsAwarded: 0,
      abuseCheck,
    };
  }

  const awards = [];

  // Determine Primary Verification Action
  // RULE: Severity claims NEVER increase points (fixed values prevent severity inflation)
  const primaryAction = isFirstReport ? 'FIRST_REPORT_VERIFIED' : 'CORROBORATION_VERIFIED';
  let primaryPoints = isFirstReport ? REWARD_POINTS.FIRST_REPORT_VERIFIED : REWARD_POINTS.CORROBORATION_VERIFIED;

  // Cap points if near daily ceiling
  primaryPoints = Math.min(primaryPoints, abuseCheck.remainingToday);

  if (primaryPoints > 0) {
    const primaryIdempKey = generateIdempotencyKey(user._id, report._id, primaryAction);
    const existingEntry = await RewardLedger.findOne({ idempotencyKey: primaryIdempKey });

    if (!existingEntry) {
      awards.push({
        actionType: primaryAction,
        points: primaryPoints,
        idempotencyKey: primaryIdempKey,
        description: isFirstReport
          ? `Verified First Discovery: ${report.damageType.toUpperCase()} at ${report.manualAddress || 'Reported Location'}`
          : `Verified Corroboration: Additional evidence for existing defect at ${report.manualAddress || 'Reported Location'}`,
      });
    }
  }

  // Bonus: EXIF Location Match Quality Bonus (+20 pts)
  if (report.evidenceBreakdown?.exifMatched || report.evidenceBreakdown?.exifLocationMatch) {
    const exifAction = 'QUALITY_PHOTO_EXIF';
    const remainingAfterPrimary = abuseCheck.remainingToday - primaryPoints;
    const exifPoints = Math.min(REWARD_POINTS.QUALITY_PHOTO_EXIF, Math.max(0, remainingAfterPrimary));

    if (exifPoints > 0) {
      const exifIdempKey = generateIdempotencyKey(user._id, report._id, exifAction);
      const existingExif = await RewardLedger.findOne({ idempotencyKey: exifIdempKey });

      if (!existingExif) {
        awards.push({
          actionType: exifAction,
          points: exifPoints,
          idempotencyKey: exifIdempKey,
          description: `Quality Evidence Bonus: Verified camera EXIF GPS match for report ${report.reportId}`,
        });
      }
    }
  }

  if (awards.length === 0) {
    return {
      success: true,
      message: 'No new reward points eligible (already awarded or daily limit reached).',
      pointsAwarded: 0,
    };
  }

  // Execute append-only ledger additions and balance increment
  let totalAdded = 0;
  const ledgerEntries = [];

  for (const aw of awards) {
    // Atomic increment of user points
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { pointsBalance: aw.points } },
      { new: true }
    );

    const ledgerDoc = await RewardLedger.create({
      idempotencyKey: aw.idempotencyKey,
      user: user._id,
      report: report._id,
      actionType: aw.actionType,
      pointsDelta: aw.points,
      balanceAfter: updatedUser.pointsBalance,
      description: aw.description,
      isSynthetic: true,
    });

    totalAdded += aw.points;
    ledgerEntries.push(ledgerDoc);
  }

  // Check and unlock new badges for citizen
  const freshUser = await User.findById(user._id);
  const newBadges = await evaluateAndAwardBadges(freshUser);

  return {
    success: true,
    message: `Successfully awarded ${totalAdded} civic points for verified report ${report.reportId}.`,
    pointsAwarded: totalAdded,
    newBalance: freshUser.pointsBalance,
    ledgerEntries,
    newBadges,
  };
}

/**
 * Atomic perk redemption preventing negative balance and double-spending
 */
export async function redeemPerkAtomic({ userId, perkId }) {
  const perk = SIMULATED_PERKS_CATALOG.find((p) => p.id === perkId);
  if (!perk) {
    throw new Error(`Perk "${perkId}" not found in municipal catalog.`);
  }

  const cost = perk.cost;

  // ATOMIC ROW UPDATE: Deduct cost ONLY IF current balance >= cost.
  // This completely eliminates race conditions and strictly prevents negative balances.
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, pointsBalance: { $gte: cost } },
    { $inc: { pointsBalance: -cost } },
    { new: true }
  );

  if (!updatedUser) {
    const currentUser = await User.findById(userId);
    const currBal = currentUser ? currentUser.pointsBalance : 0;
    throw new Error(`Insufficient points balance: You have ${currBal} pts, but this perk requires ${cost} pts.`);
  }

  // Generate unique demo voucher code
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const dateSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const voucherCode = `RW-DEMO-${randomSuffix}-${dateSuffix}`;

  const idempotencyKey = `PERK_REDEMPTION:${userId}:${voucherCode}`;

  // Record in append-only reward ledger
  const ledgerDoc = await RewardLedger.create({
    idempotencyKey,
    user: userId,
    report: null,
    actionType: 'PERK_REDEMPTION',
    pointsDelta: -cost,
    balanceAfter: updatedUser.pointsBalance,
    description: `Redeemed: ${perk.name} [Voucher: ${voucherCode}] (${perk.disclaimer})`,
    isSynthetic: true,
  });

  return {
    success: true,
    message: `Successfully redeemed "${perk.name}" for ${cost} points.`,
    voucherCode,
    perk: {
      id: perk.id,
      name: perk.name,
      category: perk.category,
      cost: perk.cost,
      description: perk.description,
      partner: perk.partner,
      disclaimer: perk.disclaimer,
    },
    pointsDeducted: cost,
    balanceAfter: updatedUser.pointsBalance,
    ledgerId: ledgerDoc._id,
    expiresAt: new Date(Date.now() + perk.validityDays * 24 * 60 * 60 * 1000).toISOString(),
  };
}
