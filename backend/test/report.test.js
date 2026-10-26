import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal 1x1 PNG binary buffer for safe upload testing
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

describe('Phase 2: Road Damage Reporting Test Suite', () => {
  let citizenToken = '';
  let testPngPath = '';
  let createdReportId = '';

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Login as citizen to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });
    citizenToken = loginRes.body.token;

    // Create a temporary valid PNG image file for multipart testing
    testPngPath = path.join(__dirname, 'test_sample.png');
    fs.writeFileSync(testPngPath, TINY_PNG_BUFFER);
  });

  after(async () => {
    if (fs.existsSync(testPngPath)) {
      fs.unlinkSync(testPngPath);
    }
    await closeDB();
  });

  test('Valid complaint creation with photo, device GPS and manual map coordinates', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('damageType', 'pothole')
      .field('severity', 'high')
      .field('description', 'Deep 8cm pothole causing two-wheelers to swerve abruptly near bus stop.')
      .field('latitude', '28.6139')
      .field('longitude', '77.2090')
      .field('deviceLatitude', '28.6140')
      .field('deviceLongitude', '77.2091')
      .field('deviceAccuracyMeters', '12')
      .field('manualAddress', 'Near Connaught Place Outer Ring')
      .attach('photo', testPngPath);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.report);
    assert.match(res.body.report.reportId, /^RW-2026-[A-F0-9]{6}$/);
    assert.strictEqual(res.body.report.verificationStatus, 'UNVERIFIED');
    assert.strictEqual(res.body.report.damageType, 'pothole');
    assert.strictEqual(res.body.report.severity, 'high');
    assert.strictEqual(res.body.report.rawLocation.coordinates[0], 77.2090); // Longitude
    assert.strictEqual(res.body.report.rawLocation.coordinates[1], 28.6139); // Latitude
    assert.ok(res.body.report.evidenceConsistencyScore >= 0);

    createdReportId = res.body.report.reportId;
  });

  test('Missing GPS permission path: complaint creation succeeds with only manual map pin', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('damageType', 'severe_crack')
      .field('severity', 'medium')
      .field('description', 'Long alligator crack along the asphalt joint with no device GPS provided.')
      .field('latitude', '28.6250')
      .field('longitude', '77.2150')
      .field('manualAddress', 'Barakhamba Road junction')
      .attach('photo', testPngPath);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.report.deviceCoordinates, null);
    assert.strictEqual(res.body.report.verificationStatus, 'UNVERIFIED');
    assert.strictEqual(res.body.report.rawLocation.coordinates[1], 28.6250);
  });

  test('Complaint creation fails if photo is omitted', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('damageType', 'pothole')
      .field('severity', 'low')
      .field('description', 'Pothole without required evidence photo')
      .field('latitude', '28.6139')
      .field('longitude', '77.2090');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('photo'));
  });

  test('GET /api/reports/my returns the list of citizen reports', async () => {
    const res = await request(app)
      .get('/api/reports/my')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.reports));
    assert.ok(res.body.reports.length >= 2);
    assert.ok(res.body.reports.some((r) => r.reportId === createdReportId));
  });

  test('GET /api/reports/:id retrieves single report details by ticket ID', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.report.reportId, createdReportId);
    assert.ok(res.body.report.photoUrl);
    assert.ok(res.body.report.reporter);
  });
});
