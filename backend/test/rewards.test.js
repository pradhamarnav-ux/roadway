import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { User } from '../src/models/User.js';
import { Report } from '../src/models/Report.js';
import { RoadIssue } from '../src/models/RoadIssue.js';
import { RewardLedger } from '../src/models/RewardLedger.js';
import {
  REWARD_POINTS,
  SIMULATED_PERKS_CATALOG,
  awardReportVerificationPoints,
  redeemPerkAtomic,
  generateIdempotencyKey,
  checkDailyAntiAbuseLimit,
} from '../src/algorithms/rewardEngine.js';

describe('Phase 7: RoadWise Rewards, Append-Only Ledger & Simulated Perks Test Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let inspectorToken = '';
  let citizenUser = null;
  let testReportId = '';
  let exifReportId = '';

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Authenticate roles
    const citRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });
    citizenToken = citRes.body.token;
    citizenUser = await User.findOne({ email: 'citizen@roadwise.ai' });

    // Reset citizen points and ledgers for test isolation
    await User.updateOne({ _id: citizenUser._id }, { $set: { pointsBalance: 0, badges: [] } });
    await RewardLedger.deleteMany({ user: citizenUser._id });

    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });
    adminToken = admRes.body.token;

    const inspRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inspector@roadwise.ai', password: 'Inspector@123' });
    inspectorToken = inspRes.body.token;

    // Seed test report (verified)
    const report = await Report.create({
      reportId: 'REP-2026-REW-01',
      reporter: citizenUser._id,
      damageType: 'pothole',
      severity: 'critical', // Critical severity must NOT inflate points!
      description: 'Dangerous pothole on Sector 4 road',
      photoUrl: '/uploads/sample_pothole.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2100, 28.6140] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 100,
    });
    testReportId = report._id.toString();

    // Seed report with EXIF match
    const exifReport = await Report.create({
      reportId: 'REP-2026-EXIF-02',
      reporter: citizenUser._id,
      damageType: 'pothole',
      severity: 'medium',
      description: 'Pothole photographed with device camera',
      photoUrl: '/uploads/sample_exif_pothole.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2150, 28.6180] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceConsistencyScore: 95,
      evidenceBreakdown: {
        exifMatched: true,
        gpsPinMatched: true,
      },
    });
    exifReportId = exifReport._id.toString();
  });

  after(async () => {
    await closeDB();
  });

  /* -------------------------------------------------------------------------- */
  /* (1) Backend-Only Point Awarding & Fixed Values (No Severity Gaming)        */
  /* -------------------------------------------------------------------------- */
  describe('(1) Backend-Only Point Awarding & Fixed Values', () => {
    test('Points are awarded ONLY upon official verification, NOT at report submission', async () => {
      // Create an unverified report
      const unverified = await Report.create({
        reportId: 'REP-2026-UNV-RAW',
        reporter: citizenUser._id,
        damageType: 'pothole',
        severity: 'critical',
        description: 'Raw unverified complaint',
        photoUrl: '/uploads/sample.jpg',
        rawLocation: { type: 'Point', coordinates: [77.2100, 28.6140] },
        verificationStatus: 'UNVERIFIED',
      });

      const awardRes = await awardReportVerificationPoints({ reportId: unverified._id });
      assert.strictEqual(awardRes.success, false);
      assert.strictEqual(awardRes.pointsAwarded, 0);
      assert.ok(awardRes.error.includes('only awarded upon official verification'));
    });

    test('First valid verified report awards exactly 50 points regardless of claimed severity', async () => {
      const awardRes = await awardReportVerificationPoints({
        reportId: testReportId,
        isFirstReport: true,
      });

      assert.strictEqual(awardRes.success, true);
      assert.strictEqual(awardRes.pointsAwarded, 50);

      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, 50);

      // Verify append-only ledger entry
      const ledger = await RewardLedger.findOne({ report: testReportId, actionType: 'FIRST_REPORT_VERIFIED' });
      assert.ok(ledger);
      assert.strictEqual(ledger.pointsDelta, 50);
      assert.strictEqual(ledger.balanceAfter, 50);
      assert.ok(ledger.idempotencyKey);
    });

    test('Report with verified EXIF match awards +20 points quality bonus', async () => {
      const initialUser = await User.findById(citizenUser._id);
      const startBalance = initialUser.pointsBalance;

      const awardRes = await awardReportVerificationPoints({
        reportId: exifReportId,
        isFirstReport: true,
      });

      assert.strictEqual(awardRes.success, true);
      // 50 (first report) + 20 (EXIF match) = 70 points
      assert.strictEqual(awardRes.pointsAwarded, 70);

      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, startBalance + 70);

      const exifLedger = await RewardLedger.findOne({ report: exifReportId, actionType: 'QUALITY_PHOTO_EXIF' });
      assert.ok(exifLedger);
      assert.strictEqual(exifLedger.pointsDelta, 20);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (2) Duplicate Reward Prevention & Idempotency Keys                         */
  /* -------------------------------------------------------------------------- */
  describe('(2) Duplicate Reward Prevention & Idempotency Guarantee', () => {
    test('Same report and verification event can NEVER pay twice (Idempotency Replay)', async () => {
      const userBefore = await User.findById(citizenUser._id);
      const balanceBefore = userBefore.pointsBalance;

      // Attempt to award points again for the same report
      const replayRes = await awardReportVerificationPoints({
        reportId: testReportId,
        isFirstReport: true,
      });

      assert.strictEqual(replayRes.success, true);
      assert.strictEqual(replayRes.pointsAwarded, 0, 'Must award 0 points on duplicate call');

      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, balanceBefore, 'User balance must NOT increase');

      // Check ledger count for this report
      const count = await RewardLedger.countDocuments({
        user: citizenUser._id,
        report: testReportId,
        actionType: 'FIRST_REPORT_VERIFIED',
      });
      assert.strictEqual(count, 1, 'Only one ledger entry must exist for the idempotency key');
    });

    test('Unique index on idempotencyKey prevents database-level duplicate insertions', async () => {
      const existing = await RewardLedger.findOne({ user: citizenUser._id });
      assert.ok(existing);

      await assert.rejects(
        async () => {
          await RewardLedger.create({
            idempotencyKey: existing.idempotencyKey, // Duplicate key!
            user: citizenUser._id,
            actionType: 'FIRST_REPORT_VERIFIED',
            pointsDelta: 50,
            balanceAfter: 200,
            description: 'Duplicate attempt',
          });
        },
        (err) => {
          return err.code === 11000 || err.name === 'MongoServerError';
        }
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (3) Anti-Abuse Limits: No Rewards for Accidents, Duplicates, or Severity  */
  /* -------------------------------------------------------------------------- */
  describe('(3) Anti-Abuse Safety Limits', () => {
    test('Accident reports NEVER award reward points (Perverse Incentive Prevention)', async () => {
      const userBefore = await User.findById(citizenUser._id);
      const balanceBefore = userBefore.pointsBalance;

      // Citizen files an accident report
      const accRes = await request(app)
        .post('/api/accidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          latitude: 28.6140,
          longitude: 77.2100,
          vehicleType: 'car',
          injurySeverity: 'none',
          injuriesCount: 0,
          vehiclesInvolved: 1,
          evidenceNotes: 'Minor bumper bump near defect',
        });

      assert.strictEqual(accRes.status, 201);

      // Verify no reward points were awarded
      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, balanceBefore);

      const accidentLedger = await RewardLedger.findOne({
        user: citizenUser._id,
        description: { $regex: /accident/i },
      });
      assert.strictEqual(accidentLedger, null, 'No reward ledger entry for accident reporting');
    });

    test('Rejected complaints award exactly 0 points', async () => {
      const rejectedReport = await Report.create({
        reportId: 'REP-2026-REJECTED',
        reporter: citizenUser._id,
        damageType: 'other',
        severity: 'low',
        description: 'Vandalism / non-road issue',
        photoUrl: '/uploads/sample.jpg',
        rawLocation: { type: 'Point', coordinates: [77.2100, 28.6140] },
        verificationStatus: 'REJECTED',
      });

      const awardRes = await awardReportVerificationPoints({ reportId: rejectedReport._id });
      assert.strictEqual(awardRes.success, false);
      assert.strictEqual(awardRes.pointsAwarded, 0);
    });

    test('Daily anti-abuse limit (250 pts/24h) throttles excessive point accumulation', async () => {
      const abuseStatus = await checkDailyAntiAbuseLimit(citizenUser._id);
      assert.strictEqual(typeof abuseStatus.pointsEarned24h, 'number');
      assert.strictEqual(typeof abuseStatus.remainingToday, 'number');
      assert.ok(abuseStatus.remainingToday <= 250);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (4) Negative Balance Prevention & Atomic Perk Redemption                   */
  /* -------------------------------------------------------------------------- */
  describe('(4) Simulated Perks Store & Atomic Redemption', () => {
    test('GET /api/rewards/perks returns catalog with DEMO ONLY disclaimers', async () => {
      const res = await request(app)
        .get('/api/rewards/perks')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.perks.length >= 4);

      for (const perk of res.body.perks) {
        assert.strictEqual(perk.isDemoOnly, true);
        assert.ok(perk.disclaimer.includes('DEMO ONLY'));
        assert.ok(perk.cost > 0);
      }
    });

    test('Negative Balance Prevention: Redeeming perk with insufficient points returns 400', async () => {
      // Set citizen balance to 25 pts (less than cheapest 50-pt perk)
      await User.updateOne({ _id: citizenUser._id }, { $set: { pointsBalance: 25 } });

      const res = await request(app)
        .post('/api/rewards/redeem')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ perkId: 'PERK-TRANSIT-PASS' }); // Costs 100 pts

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.includes('Insufficient points balance'));

      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, 25, 'Balance must remain intact');
    });

    test('Atomic Redemption: Deducts points, generates demo code, and creates negative ledger entry', async () => {
      // Fund citizen with 150 pts
      await User.updateOne({ _id: citizenUser._id }, { $set: { pointsBalance: 150 } });

      const res = await request(app)
        .post('/api/rewards/redeem')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ perkId: 'PERK-TRANSIT-PASS' }); // Costs 100 pts

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.pointsDeducted, 100);
      assert.strictEqual(res.body.balanceAfter, 50);
      assert.ok(res.body.voucherCode.startsWith('RW-DEMO-'));

      // Verify user points decremented
      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, 50);

      // Verify negative ledger doc
      const ledger = await RewardLedger.findById(res.body.ledgerId);
      assert.ok(ledger);
      assert.strictEqual(ledger.pointsDelta, -100);
      assert.strictEqual(ledger.actionType, 'PERK_REDEMPTION');
      assert.strictEqual(ledger.balanceAfter, 50);
    });

    test('Concurrent/Repeated Redemption: Prevents race conditions from producing negative balance', async () => {
      // User has 100 pts exactly
      await User.updateOne({ _id: citizenUser._id }, { $set: { pointsBalance: 100 } });

      // Fire 3 simultaneous redemptions for a 100-pt perk
      const promises = [
        request(app).post('/api/rewards/redeem').set('Authorization', `Bearer ${citizenToken}`).send({ perkId: 'PERK-TRANSIT-PASS' }),
        request(app).post('/api/rewards/redeem').set('Authorization', `Bearer ${citizenToken}`).send({ perkId: 'PERK-TRANSIT-PASS' }),
        request(app).post('/api/rewards/redeem').set('Authorization', `Bearer ${citizenToken}`).send({ perkId: 'PERK-TRANSIT-PASS' }),
      ];

      const results = await Promise.all(promises);

      const successes = results.filter((r) => r.status === 200);
      const failures = results.filter((r) => r.status === 400);

      assert.strictEqual(successes.length, 1, 'Exactly ONE concurrent redemption should succeed');
      assert.strictEqual(failures.length, 2, 'Other concurrent redemptions must fail due to atomic row lock');

      const userAfter = await User.findById(citizenUser._id);
      assert.strictEqual(userAfter.pointsBalance, 0, 'Final balance must be exactly 0, never negative');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (5) Monthly Top-100 Leaderboard & Privacy Alias / Opt-Out                  */
  /* -------------------------------------------------------------------------- */
  describe('(5) Leaderboard & Privacy Safeguards', () => {
    test('GET /api/rewards/leaderboard returns ranked civic champions', async () => {
      const res = await request(app)
        .get('/api/rewards/leaderboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.leaderboard));
      assert.ok(res.body.leaderboard.length > 0);
    });

    test('Opt-Out Privacy: Opted-out citizen is excluded from leaderboard, but keeps full wallet balance', async () => {
      // Fund citizen and opt out
      await User.updateOne(
        { _id: citizenUser._id },
        { $set: { pointsBalance: 200, optOutLeaderboard: true } }
      );

      const res = await request(app)
        .get('/api/rewards/leaderboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      const foundInList = res.body.leaderboard.some((item) => item.userId === citizenUser._id.toString());
      assert.strictEqual(foundInList, false, 'Opted out citizen must NOT appear in leaderboard list');

      // Verify wallet balance is 100% preserved
      const walletRes = await request(app)
        .get('/api/rewards/wallet')
        .set('Authorization', `Bearer ${citizenToken}`);
      assert.strictEqual(walletRes.body.wallet.pointsBalance, 200, 'Wallet balance is permanently retained');
    });

    test('Alias Privacy: Citizen with useAliasOnLeaderboard displays custom alias instead of real name', async () => {
      // Opt back in with alias
      await request(app)
        .patch('/api/rewards/preferences')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          alias: 'MetroSentinel_77',
          optOutLeaderboard: false,
          useAliasOnLeaderboard: true,
        });

      const res = await request(app)
        .get('/api/rewards/leaderboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      const userEntry = res.body.leaderboard.find((item) => item.userId === citizenUser._id.toString());
      assert.ok(userEntry, 'User should now appear on leaderboard');
      assert.strictEqual(userEntry.displayName, 'MetroSentinel_77');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (6) Civic Wallet & Badges                                                  */
  /* -------------------------------------------------------------------------- */
  describe('(6) Civic Wallet & Badges Overview', () => {
    test('GET /api/rewards/wallet returns balance, badges, anti-abuse status, and recent transactions', async () => {
      const res = await request(app)
        .get('/api/rewards/wallet')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(typeof res.body.wallet.pointsBalance, 'number');
      assert.ok(Array.isArray(res.body.wallet.badges));
      assert.ok(Array.isArray(res.body.wallet.recentTransactions));
      assert.ok(res.body.wallet.antiAbuse);
      assert.strictEqual(res.body.wallet.antiAbuse.dailyCap, 250);
    });

    test('GET /api/rewards/history returns complete append-only ledger transaction log', async () => {
      const res = await request(app)
        .get('/api/rewards/history')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.history));
      assert.ok(res.body.history.length > 0);

      // Verify every transaction has an immutable idempotencyKey
      for (const tx of res.body.history) {
        assert.ok(tx.idempotencyKey);
        assert.ok(tx.actionType);
        assert.strictEqual(typeof tx.pointsDelta, 'number');
        assert.strictEqual(typeof tx.balanceAfter, 'number');
      }
    });
  });
});
