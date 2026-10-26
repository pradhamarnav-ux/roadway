import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { calculatePriorityScore } from '../src/algorithms/priorityScoring.js';
import { calculateHaversineDistance } from '../src/algorithms/locationVerification.js';

describe('Phase 1 Integration & Unit Test Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let inspectorToken = '';

  before(async () => {
    await connectDB();
    await seedDemoAccounts();
  });

  after(async () => {
    await closeDB();
  });

  test('GET /api/health should return 200 OK', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'OK');
  });

  test('POST /api/auth/login with valid Citizen credentials succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'citizen');
    citizenToken = res.body.token;
  });

  test('POST /api/auth/login with valid Admin credentials succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'admin');
    adminToken = res.body.token;
  });

  test('POST /api/auth/login with valid Inspector credentials succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inspector@roadwise.ai', password: 'Inspector@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'inspector');
    inspectorToken = res.body.token;
  });

  test('POST /api/auth/login with invalid password fails with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'WrongPassword' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/auth/me returns profile for authenticated citizen', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, 'citizen@roadwise.ai');
    assert.strictEqual(res.body.user.role, 'citizen');
  });

  test('GET /api/test/protected without token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/test/protected');
    assert.strictEqual(res.status, 401);
  });

  test('RBAC: Citizen trying to access /api/test/admin-only is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/test/admin-only')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.currentRole, 'citizen');
    assert.ok(res.body.error.includes('Forbidden'));
  });

  test('RBAC: Admin successfully accesses /api/test/admin-only with 200 OK', async () => {
    const res = await request(app)
      .get('/api/test/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.userRole, 'admin');
  });

  test('RBAC: Inspector successfully accesses /api/test/inspector-only with 200 OK', async () => {
    const res = await request(app)
      .get('/api/test/inspector-only')
      .set('Authorization', `Bearer ${inspectorToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.userRole, 'inspector');
  });

  test('Unit Test: Priority Scoring Spec benchmark produces exactly 73.75', () => {
    // Spec calibration: S=75 (0.25), T=75 (0.20), A=70 (0.15), C=68 (0.25), E=80 (0.10), W=90 (0.05)
    // 18.75 + 15.00 + 10.50 + 17.00 + 8.00 + 4.50 = 73.75
    const result = calculatePriorityScore({
      defectSeverityScore: 75,
      roadHierarchyScore: 75,
      accidentSafetyScore: 70,
      complaintDensityScore: 68,
      costEfficiencyScore: 80,
      weatherSeasonScore: 90,
    });

    assert.strictEqual(result.score, 73.75);
    assert.strictEqual(result.priorityLevel, 'HIGH');
  });

  test('Unit Test: Haversine distance between two known points is accurate', () => {
    // Distance between New Delhi Connaught Place (28.6315, 77.2167) and India Gate (28.6129, 77.2295) is ~2.4km
    const dist = calculateHaversineDistance(28.6315, 77.2167, 28.6129, 77.2295);
    assert.ok(dist >= 2300 && dist <= 2600, `Expected ~2400m, got ${dist}`);
  });
});
