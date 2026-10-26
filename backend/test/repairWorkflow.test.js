import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { RoadIssue } from '../src/models/RoadIssue.js';
import { Report } from '../src/models/Report.js';
import { User } from '../src/models/User.js';

describe('Phase 6: Admin Dashboard, City Map & Repair Lifecycle Workflow Test Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let inspectorToken = '';
  let citizenUser = null;
  let inspectorUser = null;

  let testIssueId = '';
  let testReportId = '';
  let testIssueCode = '';

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Authenticate all three roles
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
    inspectorUser = await User.findOne({ email: 'inspector@roadwise.ai' });

    // Seed test ground-truth RoadIssue
    const issue = await RoadIssue.create({
      issueCode: 'ISSUE-2026-MAPPH6',
      title: 'Structural Pothole on Ring Road Bypass',
      description: 'Severe 12cm deep pothole causing vehicle swerving near Sector 4.',
      primaryDamageType: 'pothole',
      severity: 'high',
      roadClass: 'arterial',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] }, // GeoJSON: [lng, lat]
      status: 'VERIFIED',
      verificationStatus: 'CORROBORATED',
      priorityScore: 82.5,
      priorityLevel: 'HIGH',
      estimatedCost: 3200,
      safetyOverride: false,
      accidentCounts: {
        nearbyCount: 2,
        suspectedCount: 1,
        documentedCount: 0,
        confirmedCount: 0,
        totalInjuries: 1,
      },
      priorityFactors: {
        formulaBreakdown: '0.25*(75) + 0.20*(90) + 0.15*(35) + 0.25*(100) + 0.10*(80) + 0.05*(85)',
        humanReadableReasons: ['High arterial traffic volume', 'Citizen corroboration cluster'],
      },
    });
    testIssueId = issue._id.toString();
    testIssueCode = issue.issueCode;

    // Seed linked citizen complaint
    const report = await Report.create({
      reportId: 'REP-2026-CITPH6',
      reporter: citizenUser._id,
      damageType: 'pothole',
      severity: 'high',
      description: 'Rim damaged after hitting pothole at night',
      photoUrl: '/uploads/sample_pothole.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2092, 28.6141] },
      manualAddress: 'Ring Road Bypass, Pillar 104',
      verificationStatus: 'CORROBORATED',
      roadIssue: issue._id,
    });
    testReportId = report._id.toString();

    // Also seed an unlinked UNVERIFIED complaint to test hollow dashed markers
    await Report.create({
      reportId: 'REP-2026-UNLINKED',
      reporter: citizenUser._id,
      damageType: 'severe_crack',
      severity: 'low',
      description: 'Hairline alligator cracks near curb',
      photoUrl: '/uploads/sample_crack.jpg',
      rawLocation: { type: 'Point', coordinates: [77.2200, 28.6250] },
      manualAddress: 'Residential Lane 4',
      verificationStatus: 'UNVERIFIED',
      roadIssue: null,
    });
  });

  after(async () => {
    await closeDB();
  });

  /* -------------------------------------------------------------------------- */
  /* (1) Interactive City Map: Marker Styling & Multi-Filter Queries            */
  /* -------------------------------------------------------------------------- */
  describe('(1) Interactive City GIS Map (Spec Section 10)', () => {
    test('GET /api/repairs/map-defects: Returns properly formatted Leaflet markers with transformed [lat, lng]', async () => {
      const res = await request(app)
        .get('/api/repairs/map-defects')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.markers.length >= 2, 'Should include both road issues and unlinked reports');

      // Verify coordinate transformation: GeoJSON [77.2090, 28.6139] -> Leaflet [28.6139, 77.2090]
      const issueMarker = res.body.markers.find((m) => m._id === testIssueId);
      assert.ok(issueMarker, 'Test RoadIssue marker should be present');
      assert.strictEqual(issueMarker.markerType, 'ROAD_ISSUE');
      assert.strictEqual(issueMarker.coordinates[0], 28.6139, 'Latitude must be element 0');
      assert.strictEqual(issueMarker.coordinates[1], 77.2090, 'Longitude must be element 1');
      assert.strictEqual(issueMarker.priorityLevel, 'HIGH');
      assert.strictEqual(issueMarker.priorityScore, 82.5);
      assert.strictEqual(issueMarker.damageType, 'pothole');
      assert.strictEqual(issueMarker.roadClass, 'arterial');
      assert.strictEqual(issueMarker.estimatedCost, 3200);
      assert.strictEqual(issueMarker.accidentCounts.suspectedCount, 1);
    });

    test('GET /api/repairs/map-defects: Unverified raw citizen complaint appears as UNVERIFIED_REPORT marker', async () => {
      const res = await request(app)
        .get('/api/repairs/map-defects')
        .set('Authorization', `Bearer ${inspectorToken}`);

      assert.strictEqual(res.status, 200);
      const unverified = res.body.markers.find((m) => m.markerType === 'UNVERIFIED_REPORT');
      assert.ok(unverified, 'Unverified report marker must be present');
      assert.strictEqual(unverified.verificationStatus, 'UNVERIFIED');
      assert.strictEqual(unverified.coordinates[0], 28.6250);
      assert.strictEqual(unverified.coordinates[1], 77.2200);
    });

    test('GET /api/repairs/map-defects: Filter by priority returns only matching items', async () => {
      const res = await request(app)
        .get('/api/repairs/map-defects?priority=HIGH')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      for (const m of res.body.markers) {
        if (m.markerType === 'ROAD_ISSUE') {
          assert.strictEqual(m.priorityLevel, 'HIGH');
        }
      }
    });

    test('GET /api/repairs/map-defects: Filter by damageType filters accurately', async () => {
      const res = await request(app)
        .get('/api/repairs/map-defects?damageType=severe_crack')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      for (const m of res.body.markers) {
        assert.strictEqual(m.damageType, 'severe_crack');
      }
    });

    test('GET /api/repairs/map-defects: Search query matches issueCode and title', async () => {
      const res = await request(app)
        .get(`/api/repairs/map-defects?search=${encodeURIComponent('MAPPH6')}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.markers.length >= 1);
      assert.strictEqual(res.body.markers[0].issueCode, testIssueCode);
    });

    test('GET /api/repairs/map-defects: Unauthenticated request is rejected (401)', async () => {
      const res = await request(app).get('/api/repairs/map-defects');
      assert.strictEqual(res.status, 401);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (2) 7-Stage Repair Workflow: REPORTED to CLOSED State Transitions          */
  /* -------------------------------------------------------------------------- */
  describe('(2) 7-Stage Repair Workflow State Machine (Spec Section 11)', () => {
    test('RBAC: Citizen cannot approve or schedule repair plan (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/schedule`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ estimatedCost: 3500 });

      assert.strictEqual(res.status, 403);
    });

    test('RBAC: Inspector cannot approve or schedule repair plan (403 Forbidden, Admin only)', async () => {
      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/schedule`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ estimatedCost: 3500 });

      assert.strictEqual(res.status, 403);
    });

    test('Admin: PATCH /api/repairs/:id/schedule transitions status to SCHEDULED and generates Work Order', async () => {
      const scheduledDate = new Date(Date.now() + 2 * 86400000).toISOString();
      const completionDate = new Date(Date.now() + 8 * 86400000).toISOString();

      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scheduledDate,
          estimatedCompletionDate: completionDate,
          estimatedCost: 3500,
          notes: 'Approved during municipal pavement allocation cycle.',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.issue.status, 'SCHEDULED');
      assert.ok(res.body.issue.workOrderNumber.startsWith('WO-2026-'));
      assert.strictEqual(res.body.issue.estimatedCost, 3500);

      // Verify lifecycleHistory audit trail entry
      const latestHistory = res.body.issue.lifecycleHistory.slice(-1)[0];
      assert.strictEqual(latestHistory.status, 'SCHEDULED');
      assert.strictEqual(latestHistory.changedByRole, 'admin');
    });

    test('Admin: PATCH /api/repairs/:id/assign dispatches defect to municipal repair crew', async () => {
      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedTeam: 'CREW-ALPHA: Central Rapid Asphalt Crew',
          assignedInspectorId: inspectorUser._id,
          estimatedCompletionDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          notes: 'Dispatched with hot-mix asphalt infill truck.',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.issue.status, 'ASSIGNED');
      assert.ok(res.body.issue.assignedTeam.includes('CREW-ALPHA'));
      assert.strictEqual(res.body.issue.assignedInspector.toString(), inspectorUser._id.toString());
    });

    test('Crew/Inspector: PATCH /api/repairs/:id/start transitions status to IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/start`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ notes: 'Milling equipment arrived on-site. Lane 2 partially diverted.' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.issue.status, 'IN_PROGRESS');
    });

    test('RBAC: Citizen cannot submit completion inspection evidence (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/repairs/${testIssueId}/inspect`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ notes: 'Looks done' });

      assert.strictEqual(res.status, 403);
    });

    test('Inspector: POST /api/repairs/:id/inspect uploads completion photo and transitions to INSPECTED', async () => {
      // Create a temporary mock image file for multipart upload
      const tmpFilePath = path.join(process.cwd(), 'test', 'temp_completion.jpg');
      fs.writeFileSync(tmpFilePath, 'mock_image_binary_data_roadwise_phase6');

      const res = await request(app)
        .post(`/api/repairs/${testIssueId}/inspect`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .field('notes', 'Field inspection complete. Pavement depth measured at 12cm. Surface even.')
        .field('passed', 'true')
        .attach('photo', tmpFilePath);

      // Clean up temp file
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.issue.status, 'INSPECTED');
      assert.ok(res.body.issue.completionEvidence.photoUrl.includes('/uploads/'));
      assert.ok(res.body.issue.completionEvidence.notes.includes('Field inspection complete'));
      assert.strictEqual(res.body.issue.completionEvidence.inspector.toString(), inspectorUser._id.toString());
    });

    test('RBAC: Inspector cannot close work order (403 Forbidden, Admin only)', async () => {
      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/close`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ notes: 'Closing work order' });

      assert.strictEqual(res.status, 403);
    });

    test('Admin: PATCH /api/repairs/:id/close transitions status to CLOSED and verifies linked complaints', async () => {
      const res = await request(app)
        .patch(`/api/repairs/${testIssueId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Final municipal audit approved. Pavement asset sign-off complete.' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.issue.status, 'CLOSED');
      assert.ok(res.body.issue.completedDate);

      // Verify that linked citizen reports were updated to INSPECTOR_VERIFIED
      const updatedReport = await Report.findById(testReportId);
      assert.strictEqual(updatedReport.verificationStatus, 'INSPECTOR_VERIFIED');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (3) Field Inspector Views & Assigned Tasks                                 */
  /* -------------------------------------------------------------------------- */
  describe('(3) Field Inspector Console & Task Assignment', () => {
    test('Inspector: GET /api/repairs/inspector/tasks returns assigned and pending inspections', async () => {
      const res = await request(app)
        .get('/api/repairs/inspector/tasks')
        .set('Authorization', `Bearer ${inspectorToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.tasks));
    });

    test('Citizen: GET /api/repairs/inspector/tasks is rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/repairs/inspector/tasks')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 403);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (4) Citizen Complaint Tracking: Live 7-Stage Status & Work Orders           */
  /* -------------------------------------------------------------------------- */
  describe('(4) Citizen Complaint Tracking', () => {
    test('Citizen: GET /api/reports/my populates linked roadIssue with live repair status and workOrder', async () => {
      const res = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const citizenRep = res.body.reports.find((r) => r._id === testReportId);
      assert.ok(citizenRep, 'Citizen report must be returned');
      assert.ok(citizenRep.roadIssue, 'roadIssue should be populated');
      assert.strictEqual(citizenRep.roadIssue.status, 'CLOSED');
      assert.ok(citizenRep.roadIssue.workOrderNumber.startsWith('WO-2026-'));
      assert.ok(citizenRep.roadIssue.assignedTeam.includes('CREW-ALPHA'));
    });
  });

  /* -------------------------------------------------------------------------- */
  /* (5) Command Center Analytics Overview                                      */
  /* -------------------------------------------------------------------------- */
  describe('(5) Analytics Charts & Metrics Overview (Spec Section 11)', () => {
    test('Admin/Inspector: GET /api/repairs/analytics/overview returns KPI distributions and spend metrics', async () => {
      const res = await request(app)
        .get('/api/repairs/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.statusCounts);
      assert.ok(res.body.priorityCounts);
      assert.ok(res.body.roadClassCounts);
      assert.ok(res.body.availableCrews.length >= 4);
      assert.strictEqual(typeof res.body.totalEstimatedSpend, 'number');
      assert.strictEqual(typeof res.body.closedRepairs, 'number');
    });

    test('Citizen: GET /api/repairs/analytics/overview is rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/repairs/analytics/overview')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 403);
    });
  });
});
