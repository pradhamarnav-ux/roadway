import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { RoadIssue } from '../src/models/RoadIssue.js';
import { Accident } from '../src/models/Accident.js';
import {
  aggregateAccidentMetrics,
  ATTRIBUTION_TIERS,
  ACCIDENT_VERIFICATION_STATUSES,
} from '../src/algorithms/accidentAnalysis.js';

describe('Phase 4: Accident Tracking & Attribution Test Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let testIssueId = '';
  let createdAccidentId = '';
  let rejectedAccidentId = '';

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Authenticate roles
    const citRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });
    citizenToken = citRes.body.token;

    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });
    adminToken = admRes.body.token;

    // Create a ground-truth RoadIssue for testing accidents
    const issue = await RoadIssue.create({
      issueCode: 'ISSUE-2026-TESTACC',
      title: 'Pothole cluster on Outer Ring Road',
      primaryDamageType: 'pothole',
      severity: 'high',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      status: 'VERIFIED',
      accidentCounts: {
        nearbyCount: 0,
        suspectedCount: 0,
        documentedCount: 0,
        confirmedCount: 0,
        totalInjuries: 0,
      },
    });
    testIssueId = issue._id.toString();
  });

  after(async () => {
    await closeDB();
  });

  test('Unit Test: Nearby accident is NEVER counted as pothole-caused', () => {
    const accidents = [
      {
        attributionTier: ATTRIBUTION_TIERS.NEARBY_ACCIDENT,
        injuriesCount: 2,
      },
    ];

    const metrics = aggregateAccidentMetrics(accidents);
    assert.strictEqual(metrics.nearbyCount, 1);
    assert.strictEqual(metrics.suspectedCount, 0);
    assert.strictEqual(metrics.documentedCount, 0);
    assert.strictEqual(metrics.confirmedCount, 0);
    // Nearby accidents do not add to total injuries caused by the pothole
    assert.strictEqual(metrics.totalInjuries, 0);
    // Safety risk score stays at base 10
    assert.strictEqual(metrics.safetyRiskScore, 10);
  });

  test('Unit Test: REJECTED accidents are completely excluded from defect attribution', () => {
    const accidents = [
      {
        attributionTier: ATTRIBUTION_TIERS.CONFIRMED_CONTRIBUTION,
        verificationStatus: ACCIDENT_VERIFICATION_STATUSES.REJECTED,
        injuriesCount: 3,
      },
      {
        attributionTier: ATTRIBUTION_TIERS.DOCUMENTED_CONTRIBUTION,
        verificationStatus: ACCIDENT_VERIFICATION_STATUSES.VERIFIED,
        injuriesCount: 1,
      },
    ];

    const metrics = aggregateAccidentMetrics(accidents);
    // The rejected confirmed collision must not be counted
    assert.strictEqual(metrics.confirmedCount, 0);
    assert.strictEqual(metrics.documentedCount, 1);
    assert.strictEqual(metrics.totalInjuries, 1);
  });

  test('POST /api/accidents: Citizen reports nearby accident (defaults to NEARBY_ACCIDENT & UNVERIFIED)', async () => {
    const res = await request(app)
      .post('/api/accidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        roadIssueId: testIssueId,
        latitude: 28.6139,
        longitude: 77.2090,
        occurredAt: new Date().toISOString(),
        injurySeverity: 'none',
        injuriesCount: 0,
        vehiclesInvolved: 2,
        policeReportRef: 'FIR-2026-9021',
        evidenceNotes: 'Two cars collided at intersection near defect.',
        claimedContribution: false,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.accident.attributionTier, 'NEARBY_ACCIDENT');
    assert.strictEqual(res.body.accident.verificationStatus, 'UNVERIFIED');
    assert.strictEqual(res.body.issueAccidentCounts.nearbyCount, 1);
    assert.strictEqual(res.body.issueAccidentCounts.documentedCount, 0);

    // Minimal Personal Data: Ensure no driver license or victim PII is present
    assert.strictEqual(res.body.accident.driverLicense, undefined);
    assert.strictEqual(res.body.accident.victimNames, undefined);

    createdAccidentId = res.body.accident.accidentId;
  });

  test('POST /api/accidents with evidence photo upload (multipart/form-data)', async () => {
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/accidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('roadIssueId', testIssueId)
      .field('latitude', 28.6140)
      .field('longitude', 77.2091)
      .field('injurySeverity', 'minor')
      .field('injuriesCount', 1)
      .field('vehiclesInvolved', 1)
      .field('claimedContribution', 'true')
      .field('evidenceNotes', 'Motorcyclist slipped on loose asphalt edge failure.')
      .attach('photo', TINY_PNG, 'accident_scene.png');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.accident.attributionTier, 'SUSPECTED_CONTRIBUTION');
    assert.ok(res.body.accident.photoUrl);
    assert.ok(res.body.accident.photoUrl.startsWith('/uploads/'));
    assert.strictEqual(res.body.accident.evidenceFiles.length, 1);

    rejectedAccidentId = res.body.accident.accidentId;
  });

  test('Authorization: Citizen cannot update accident attribution (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/accidents/${createdAccidentId}/attribution`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        attributionTier: 'CONFIRMED_CONTRIBUTION',
        evidenceNotes: 'Illegal escalation attempt',
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Forbidden'));
  });

  test('PATCH /api/accidents/:id/attribution: Invalid tier returns 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/accidents/${createdAccidentId}/attribution`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        attributionTier: 'INVALID_TIER',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('PATCH /api/accidents/:id/attribution: Admin reviews evidence and updates to DOCUMENTED_CONTRIBUTION & VERIFIED', async () => {
    const res = await request(app)
      .patch(`/api/accidents/${createdAccidentId}/attribution`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        attributionTier: 'DOCUMENTED_CONTRIBUTION',
        verificationStatus: 'VERIFIED',
        evidenceNotes: 'Police FIR and skid mark measurements confirm driver lost control trying to avoid pothole.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.accident.attributionTier, 'DOCUMENTED_CONTRIBUTION');
    assert.strictEqual(res.body.accident.verificationStatus, 'VERIFIED');
    assert.strictEqual(res.body.issueAccidentCounts.documentedCount, 1);
    assert.strictEqual(res.body.issueAccidentCounts.nearbyCount, 0);

    // Verify linked RoadIssue reflects the documented attribution
    const updatedIssue = await RoadIssue.findById(testIssueId);
    assert.strictEqual(updatedIssue.accidentCounts.documentedCount, 1);
    assert.strictEqual(updatedIssue.accidentCounts.nearbyCount, 0);
  });

  test('PATCH /api/accidents/:id/attribution: Admin escalates to CONFIRMED triggers SAFETY_OVERRIDE', async () => {
    const res = await request(app)
      .patch(`/api/accidents/${createdAccidentId}/attribution`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        attributionTier: 'CONFIRMED_CONTRIBUTION',
        evidenceNotes: 'Municipal traffic engineering team forensic inspection officially confirms defect causation.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.accident.attributionTier, 'CONFIRMED_CONTRIBUTION');

    const updatedIssue = await RoadIssue.findById(testIssueId);
    assert.strictEqual(updatedIssue.accidentCounts.confirmedCount, 1);
    assert.strictEqual(updatedIssue.safetyOverride, true);
    assert.strictEqual(updatedIssue.priorityLevel, 'CRITICAL');
  });

  test('PATCH /api/accidents/:id/attribution: Admin rejects false report (status: REJECTED)', async () => {
    const res = await request(app)
      .patch(`/api/accidents/${rejectedAccidentId}/attribution`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: 'REJECTED',
        evidenceNotes: 'CCTV footage confirms collision happened 3 miles away and was tagged fraudulently.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.accident.verificationStatus, 'REJECTED');

    // The rejected suspected accident must no longer count towards suspectedCount
    const updatedIssue = await RoadIssue.findById(testIssueId);
    assert.strictEqual(updatedIssue.accidentCounts.suspectedCount, 0);
  });

  test('GET /api/accidents: Admin retrieves all accidents with minimal PII protection', async () => {
    const res = await request(app)
      .get('/api/accidents')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.count >= 2);

    // Ensure minimal PII: reporter object should only expose safe fields (name, alias)
    const sample = res.body.accidents[0];
    if (sample.reportedBy) {
      assert.strictEqual(sample.reportedBy.password, undefined);
    }
  });

  test('GET /api/accidents/issue/:issueId returns grouped five counts and records', async () => {
    const res = await request(app)
      .get(`/api/accidents/issue/${testIssueId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.metrics);
    // Five separate counts verified
    assert.strictEqual(typeof res.body.metrics.nearbyCount, 'number');
    assert.strictEqual(typeof res.body.metrics.suspectedCount, 'number');
    assert.strictEqual(typeof res.body.metrics.documentedCount, 'number');
    assert.strictEqual(typeof res.body.metrics.confirmedCount, 'number');
    assert.strictEqual(typeof res.body.metrics.totalInjuries, 'number');
    assert.strictEqual(res.body.metrics.confirmedCount, 1);
  });

  test('GET /api/accidents/stats: Returns citywide accident aggregation', async () => {
    const res = await request(app)
      .get('/api/accidents/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats);
    assert.ok(res.body.stats.totalAccidents >= 2);
    assert.strictEqual(typeof res.body.stats.nearbyCount, 'number');
    assert.strictEqual(typeof res.body.stats.suspectedCount, 'number');
    assert.strictEqual(typeof res.body.stats.documentedCount, 'number');
    assert.strictEqual(typeof res.body.stats.confirmedCount, 'number');
    assert.strictEqual(typeof res.body.stats.totalInjuries, 'number');
  });
});
