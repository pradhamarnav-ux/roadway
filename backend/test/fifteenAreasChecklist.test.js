import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { User } from '../src/models/User.js';
import { RoadIssue } from '../src/models/RoadIssue.js';
import { Report } from '../src/models/Report.js';
import { Accident } from '../src/models/Accident.js';
import { RewardLedger } from '../src/models/RewardLedger.js';
import { calculatePriorityScore } from '../src/algorithms/priorityScoring.js';
import { optimizeRepairPlan } from '../src/algorithms/repairOptimization.js';
import { calculateHaversineDistance, evaluateLocationEvidence } from '../src/algorithms/locationVerification.js';
import { calculateDuplicateConfidence } from '../src/algorithms/duplicateDetection.js';
import { aggregateAccidentMetrics, ATTRIBUTION_TIERS } from '../src/algorithms/accidentAnalysis.js';
import { awardReportVerificationPoints, redeemPerkAtomic, generateIdempotencyKey } from '../src/algorithms/rewardEngine.js';

describe('Phase 8: Master 15-Area Requirements Verification Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let inspectorToken = '';
  let citizenUser = null;
  let testIssue = null;
  let testReport = null;

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Authenticate demo roles
    const citRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });
    citizenToken = citRes.body.token;
    citizenUser = await User.findOne({ email: 'citizen@roadwise.ai' });

    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });
    adminToken = admRes.body.token;

    const inspRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inspector@roadwise.ai', password: 'Inspector@123' });
    inspectorToken = inspRes.body.token;

    // Create baseline test defect
    testIssue = await RoadIssue.create({
      issueCode: 'ISSUE-2026-CHECKLIST',
      title: 'Verification Road Hazard Defect',
      primaryDamageType: 'pothole',
      severity: 'high',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2200, 28.6200] },
      status: 'VERIFIED',
      estimatedCost: 2500,
    });

    testReport = await Report.create({
      reportId: 'REP-2026-CHECKLIST',
      reporter: citizenUser._id,
      roadIssue: testIssue._id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Checklist verification report',
      photoUrl: '/uploads/sample.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2200, 28.6200] },
      verificationStatus: 'INSPECTOR_VERIFIED',
      evidenceBreakdown: { exifMatched: true, gpsPinMatched: true },
    });
  });

  after(async () => {
    await closeDB();
  });

  // Area 1: JWT Authentication & RBAC
  test('[Area 1] JWT Authentication & Role-Based Access Control', async () => {
    const unauthRes = await request(app).get('/api/auth/me');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be 401');

    const citMe = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${citizenToken}`);
    assert.strictEqual(citMe.status, 200);
    assert.strictEqual(citMe.body.user.role, 'citizen');

    const forbiddenAdmin = await request(app)
      .get('/api/verification/queue')
      .set('Authorization', `Bearer ${citizenToken}`);
    assert.strictEqual(forbiddenAdmin.status, 403, 'Citizen accessing admin route must receive 403 Forbidden');
  });

  // Area 2: Citizen Road Damage Reporting
  test('[Area 2] Citizen Damage Reporting Ingestion & Ticket Generation', async () => {
    const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('damageType', 'pothole')
      .field('severity', 'high')
      .field('description', 'Pothole on service lane')
      .field('latitude', '28.6205')
      .field('longitude', '77.2205')
      .attach('photo', TINY_PNG, 'report.png');

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.report.reportId.startsWith('RW-2026-'));
    assert.strictEqual(res.body.report.verificationStatus, 'UNVERIFIED');
  });

  // Area 3: Photo Evidence & EXIF Extraction
  test('[Area 3] Photo Evidence Validation & EXIF Metadata Handling', async () => {
    // Missing photo validation failure
    const failRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('damageType', 'pothole')
      .field('latitude', '28.6200')
      .field('longitude', '77.2200');
    assert.strictEqual(failRes.status, 400);
    assert.ok(failRes.body.error.includes('photo'));
  });

  // Area 4: Multi-Factor Location Verification
  test('[Area 4] Multi-Factor Location Verification & Consistency Scoring', () => {
    const result = evaluateLocationEvidence({
      claimedCoords: { latitude: 28.6200, longitude: 77.2200 },
      deviceCoords: { latitude: 28.6201, longitude: 77.2201 },
      exifCoords: { latitude: 28.6201, longitude: 77.2201 },
      independentReportsCount: 2,
    });
    assert.ok(result.score >= 80, 'Matched location evidence must score >= 80%');
    assert.strictEqual(result.status, 'CORROBORATED');

    // Extreme delta
    const mismatch = evaluateLocationEvidence({
      claimedCoords: { latitude: 28.6200, longitude: 77.2200 },
      deviceCoords: { latitude: 28.6300, longitude: 77.2300 }, // >1km away
    });
    assert.strictEqual(mismatch.status, 'LOCATION_MISMATCH');
  });

  // Area 5: Spatial Duplicate Detection
  test('[Area 5] Spatial Duplicate Detection & Confidence Scoring', () => {
    const dupCheck = calculateDuplicateConfidence(
      {
        coordinates: [77.2090, 28.6139],
        damageType: 'pothole',
        description: 'Dangerous deep pothole on Connaught Outer Ring near Gate 4',
        createdAt: new Date(),
      },
      {
        coordinates: [77.20905, 28.61394], // ~6m away
        damageType: 'pothole',
        description: 'Deep pothole on Connaught Outer Ring near Gate 4 bus stop',
        createdAt: new Date(),
      },
      30
    );
    assert.ok(dupCheck.confidence >= 80, `Nearby matching defect must have >= 80% confidence, got ${dupCheck.confidence}`);
    assert.strictEqual(dupCheck.autoLink, true);
  });

  // Area 6: Defect Consolidation & Issue Grouping
  test('[Area 6] Defect Consolidation Linking Multiple Reports to RoadIssue', async () => {
    assert.ok(testReport.roadIssue);
    const count = await Report.countDocuments({ roadIssue: testIssue._id });
    assert.ok(count >= 1);
  });

  // Area 7: Vehicular Accident Attribution Tiers
  test('[Area 7] Vehicular Accident 4 Attribution Tiers Hierarchy', () => {
    assert.ok(ATTRIBUTION_TIERS.NEARBY_ACCIDENT);
    assert.ok(ATTRIBUTION_TIERS.SUSPECTED_CONTRIBUTION);
    assert.ok(ATTRIBUTION_TIERS.DOCUMENTED_CONTRIBUTION);
    assert.ok(ATTRIBUTION_TIERS.CONFIRMED_CONTRIBUTION);
  });

  // Area 8: Ethical Attribution Constraint (Zero Pothole Causation)
  test('[Area 8] Nearby Accident Is NEVER Counted As Pothole-Caused', () => {
    const accidents = [
      { attributionTier: ATTRIBUTION_TIERS.NEARBY_ACCIDENT, injuriesCount: 2 },
    ];
    const metrics = aggregateAccidentMetrics(accidents);
    assert.strictEqual(metrics.nearbyCount, 1);
    assert.strictEqual(metrics.totalInjuries, 0, 'Nearby accident injuries must NOT be attributed to defect');
    assert.strictEqual(metrics.safetyRiskScore, 10, 'Safety risk must stay at baseline 10');
  });

  // Area 9: Admin Accident Evidence Review & Minimal PII
  test('[Area 9] Admin Accident Review & Minimal PII Protection', async () => {
    const acc = await Accident.create({
      accidentId: 'ACC-CHECKLIST-01',
      roadIssue: testIssue._id,
      location: { type: 'Point', coordinates: [77.2200, 28.6200] },
      attributionTier: 'SUSPECTED_CONTRIBUTION',
      verificationStatus: 'UNDER_REVIEW',
      injurySeverity: 'minor',
      injuriesCount: 1,
    });

    const updateRes = await request(app)
      .patch(`/api/accidents/${acc.accidentId}/attribution`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ attributionTier: 'DOCUMENTED_CONTRIBUTION', verificationStatus: 'VERIFIED' });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.accident.attributionTier, 'DOCUMENTED_CONTRIBUTION');
    assert.strictEqual(updateRes.body.accident.driverLicense, undefined, 'Must not expose PII');
  });

  // Area 10: Explainable Priority Scoring & 73.75 Calibration Benchmark
  test('[Area 10] Priority Scoring Algorithm Gives EXACTLY 73.75 for Spec Benchmark Case', () => {
    const result = calculatePriorityScore({
      defectSeverityScore: 75,
      roadHierarchyScore: 75,
      accidentSafetyScore: 70,
      complaintDensityScore: 68,
      costEfficiencyScore: 80,
      weatherSeasonScore: 90,
      isCriticalDamageOnMajorRoad: false,
      hasConfirmedAccidents: false,
    });
    assert.strictEqual(
      result.score,
      73.75,
      `Spec benchmark case must equal exactly 73.75, got ${result.score}`
    );
    assert.strictEqual(result.priorityLevel, 'HIGH');
  });

  // Area 11: Safety Escalation Override
  test('[Area 11] Safety Override Flagged on Critical Defect Regardless of Score', () => {
    const result = calculatePriorityScore({
      defectSeverityScore: 30,
      roadHierarchyScore: 30,
      accidentSafetyScore: 10,
      complaintDensityScore: 10,
      costEfficiencyScore: 20,
      weatherSeasonScore: 20,
      isCriticalDamageOnMajorRoad: true,
      hasConfirmedAccidents: false,
    });
    assert.strictEqual(result.safetyOverride, true, 'Critical defect on major corridor must trigger safety override');
    assert.strictEqual(result.priorityLevel, 'CRITICAL');
  });

  // Area 12: 0/1 Knapsack Budget Optimization vs Heuristics
  test('[Area 12] 0/1 Knapsack Optimizer Maximizes Benefit vs Heuristics', () => {
    const issues = [
      { _id: 'I1', title: 'Issue 1', priorityScore: 90, roadClass: 'highway', estimatedCost: 3000, safetyOverride: true, status: 'VERIFIED' },
      { _id: 'I2', title: 'Issue 2', priorityScore: 80, roadClass: 'arterial', estimatedCost: 2000, safetyOverride: false, status: 'VERIFIED' },
      { _id: 'I3', title: 'Issue 3', priorityScore: 70, roadClass: 'collector', estimatedCost: 2000, safetyOverride: false, status: 'VERIFIED' },
      { _id: 'I4', title: 'Issue 4', priorityScore: 40, roadClass: 'local', estimatedCost: 1000, safetyOverride: false, status: 'VERIFIED' },
    ];
    const plan = optimizeRepairPlan({ issues, budget: 5000 });
    assert.ok(plan.comparisons);
    assert.ok(plan.comparisons.knapsack);
    assert.ok(plan.comparisons.fcfs);
    assert.ok(plan.comparisons.knapsack.totalBenefit >= plan.comparisons.fcfs.totalBenefit);
    assert.strictEqual(plan.selectedIssues.some((i) => i._id === 'I1'), true, 'Mandatory safety issue must be selected');
  });

  // Area 13: Interactive City GIS Map & Marker API
  test('[Area 13] City GIS Map Defects API with Spatial & Filter Dimensions', async () => {
    const mapRes = await request(app)
      .get('/api/repairs/map-defects')
      .set('Authorization', `Bearer ${citizenToken}`);
    assert.strictEqual(mapRes.status, 200);
    assert.ok(Array.isArray(mapRes.body.markers));
    assert.ok(mapRes.body.markers.length > 0);
  });

  // Area 14: 7-Stage Repair Lifecycle State Machine
  test('[Area 14] 7-Stage Repair Workflow State Machine Transitions', async () => {
    const schedRes = await request(app)
      .patch(`/api/repairs/${testIssue._id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estimatedCost: 3200 });
    assert.strictEqual(schedRes.status, 200);
    assert.strictEqual(schedRes.body.issue.status, 'SCHEDULED');
    assert.ok(schedRes.body.issue.workOrderNumber);

    const assignRes = await request(app)
      .patch(`/api/repairs/${testIssue._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTeam: 'CREW-ALPHA: Central Rapid Asphalt Crew' });
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.body.issue.status, 'ASSIGNED');
  });

  // Area 15: RoadWise Civic Rewards & Append-Only Ledger
  test('[Area 15] RoadWise Civic Rewards, Idempotency & Simulated Perks Store', async () => {
    // Backend-only awarding on verified report
    const awardRes = await awardReportVerificationPoints({ reportId: testReport._id, isFirstReport: true });
    assert.strictEqual(awardRes.success, true);
    assert.strictEqual(awardRes.pointsAwarded, 70); // 50 first report + 20 EXIF

    // Idempotency guarantee (0 duplicate payout)
    const replayRes = await awardReportVerificationPoints({ reportId: testReport._id, isFirstReport: true });
    assert.strictEqual(replayRes.pointsAwarded, 0);

    // Negative balance prevention
    await assert.rejects(
      async () => {
        await redeemPerkAtomic({ userId: citizenUser._id, perkId: 'PERK-TREE-DEDICATION' }); // 200 pts, user has ~70
      },
      (err) => err.message.includes('Insufficient points balance')
    );
  });
});
