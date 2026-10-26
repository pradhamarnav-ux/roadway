import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { Report } from '../src/models/Report.js';
import { RoadIssue } from '../src/models/RoadIssue.js';
import { calculateDuplicateConfidence } from '../src/algorithms/duplicateDetection.js';
import { evaluateLocationEvidence } from '../src/algorithms/locationVerification.js';

describe('Phase 3: Location Verification & Duplicate Detection Test Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let inspectorToken = '';
  let reportAId = '';
  let reportBId = '';

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Authenticate all 3 roles
    const citRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });
    citizenToken = citRes.body.token;

    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });
    adminToken = admRes.body.token;

    const insRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inspector@roadwise.ai', password: 'Inspector@123' });
    inspectorToken = insRes.body.token;

    // Seed two duplicate reports near same defect (~10 meters apart)
    const repA = await Report.create({
      reportId: 'RW-2026-DUP001',
      reporter: citRes.body.user.id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Dangerous deep pothole on Connaught Outer Ring near Gate 4',
      photoUrl: '/uploads/sample1.png',
      rawLocation: { type: 'Point', coordinates: [77.2090, 28.6139] },
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 65,
    });
    reportAId = repA._id.toString();

    const repB = await Report.create({
      reportId: 'RW-2026-DUP002',
      reporter: citRes.body.user.id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Deep pothole on Connaught Outer Ring near Gate 4 bus stop',
      photoUrl: '/uploads/sample2.png',
      rawLocation: { type: 'Point', coordinates: [77.20905, 28.61394] }, // ~6m away
      verificationStatus: 'UNVERIFIED',
      evidenceConsistencyScore: 70,
    });
    reportBId = repB._id.toString();
  });

  after(async () => {
    await closeDB();
  });

  test('Algorithm: Duplicates near the same defect produce high confidence (>= 80%)', () => {
    const analysis = calculateDuplicateConfidence(
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

    assert.ok(analysis.confidence >= 80, `Expected confidence >= 80, got ${analysis.confidence}`);
    assert.strictEqual(analysis.isDuplicate, true);
    assert.strictEqual(analysis.autoLink, true);
    assert.ok(analysis.distanceMeters < 20);
  });

  test('Algorithm: Two separate potholes inside radius with differing descriptions score below auto-link', () => {
    const analysis = calculateDuplicateConfidence(
      {
        coordinates: [77.2090, 28.6139],
        damageType: 'pothole',
        description: 'Pothole on the left fast lane near bridge pillar 12',
        createdAt: new Date(),
      },
      {
        coordinates: [77.2092, 28.6141], // ~27m away
        damageType: 'severe_crack', // differing damage type
        description: 'Surface cracking along right sidewalk curb near fruit stall',
        createdAt: new Date(),
      },
      30
    );

    assert.ok(analysis.confidence < 80, `Expected confidence < 80, got ${analysis.confidence}`);
    assert.strictEqual(analysis.autoLink, false);
  });

  test('Algorithm: Conflicting location evidence (device GPS > 200m away) flags LOCATION_MISMATCH', () => {
    const result = evaluateLocationEvidence({
      claimedCoords: { latitude: 28.6139, longitude: 77.2090 },
      deviceCoords: { latitude: 28.6190, longitude: 77.2150 }, // ~800m away
      exifCoords: null,
      independentReportsCount: 0,
    });

    assert.strictEqual(result.status, 'LOCATION_MISMATCH');
    assert.ok(result.score < 40, `Expected score < 40, got ${result.score}`);
    assert.ok(result.breakdown.devicePinDeltaMeters > 200);
  });

  test('Authorization: Citizen accessing /api/verification/queue is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/verification/queue')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Forbidden'));
  });

  test('Authorization & API: Admin successfully views verification queue with 200 OK', async () => {
    const res = await request(app)
      .get('/api/verification/queue')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.reports.length >= 2);
  });

  test('API: Inspector updates report status to INSPECTOR_VERIFIED with 100 consistency score', async () => {
    const res = await request(app)
      .patch(`/api/verification/reports/${reportAId}/status`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({
        status: 'INSPECTOR_VERIFIED',
        notes: 'Field visit confirmed 7.5cm depth. Dispatched emergency asphalt cold mix.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.report.verificationStatus, 'INSPECTOR_VERIFIED');
    assert.strictEqual(res.body.report.evidenceConsistencyScore, 100);
    assert.ok(res.body.report.evidenceBreakdown.notes.length > 0);
  });

  test('API: Admin merges duplicate pair into a unified RoadIssue', async () => {
    const res = await request(app)
      .post('/api/verification/duplicates/resolve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'MERGE',
        reportIds: [reportAId, reportBId],
        primaryReportId: reportAId,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.roadIssue);
    assert.strictEqual(res.body.roadIssue.reportsCount, 2);
    assert.strictEqual(res.body.roadIssue.status, 'VERIFIED');

    // Confirm reports now link to this issue
    const updatedRepB = await Report.findById(reportBId);
    assert.strictEqual(updatedRepB.roadIssue.toString(), res.body.roadIssue._id.toString());
    assert.strictEqual(updatedRepB.verificationStatus, 'CORROBORATED');
  });

  test('API: Admin retrieves city triage stats showing updated duplicate and report counts', async () => {
    const res = await request(app)
      .get('/api/verification/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats.totalReports >= 2);
    assert.ok(res.body.stats.uniqueIssues >= 1);
  });
});
