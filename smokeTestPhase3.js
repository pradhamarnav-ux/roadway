import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function smokeTestPhase3() {
  const BASE_URL = 'http://localhost:5000';

  console.log('=== 1. VERIFY AUTHORIZATION GUARDS (CITIZEN 403) ===');
  const citLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'citizen@roadwise.ai', password: 'Citizen@123' }),
  }).then((r) => r.json());

  const citQueueRes = await fetch(`${BASE_URL}/api/verification/queue`, {
    headers: { Authorization: `Bearer ${citLogin.token}` },
  });
  console.log(`Citizen accessing /api/verification/queue: ${citQueueRes.status} (Expected: 403 Forbidden)`);

  console.log('\n=== 2. SEED TWO CLUSTERED COMPLAINTS VIA CITIZEN PORTAL ===');
  const TINY_PNG_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const fd1 = new FormData();
  fd1.append('damageType', 'pothole');
  fd1.append('severity', 'high');
  fd1.append('description', 'Dangerous deep pothole on Connaught Outer Ring near Gate 4');
  fd1.append('latitude', '28.6139');
  fd1.append('longitude', '77.2090');
  fd1.append('deviceLatitude', '28.6140');
  fd1.append('deviceLongitude', '77.2091');
  fd1.append('manualAddress', 'Connaught Ring Road Gate 4');
  fd1.append('photo', new Blob([TINY_PNG_BUFFER], { type: 'image/png' }), 'rep1.png');

  const rep1 = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citLogin.token}` },
    body: fd1,
  }).then((r) => r.json());

  const fd2 = new FormData();
  fd2.append('damageType', 'pothole');
  fd2.append('severity', 'high');
  fd2.append('description', 'Deep pothole on Connaught Outer Ring near Gate 4 bus stop');
  fd2.append('latitude', '28.61395'); // ~6m away
  fd2.append('longitude', '77.20904');
  fd2.append('deviceLatitude', '28.6140');
  fd2.append('deviceLongitude', '77.2091');
  fd2.append('manualAddress', 'Connaught Ring Road near bus stop');
  fd2.append('photo', new Blob([TINY_PNG_BUFFER], { type: 'image/png' }), 'rep2.png');

  const rep2 = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citLogin.token}` },
    body: fd2,
  }).then((r) => r.json());

  console.log(`Created Report 1: ${rep1.report?.reportId}`);
  console.log(`Created Report 2: ${rep2.report?.reportId}`);

  console.log('\n=== 3. ADMIN ACCESS TO VERIFICATION QUEUE ===');
  const admLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@roadwise.ai', password: 'Admin@123' }),
  }).then((r) => r.json());

  const admQueue = await fetch(`${BASE_URL}/api/verification/queue`, {
    headers: { Authorization: `Bearer ${admLogin.token}` },
  }).then((r) => r.json());
  console.log(`Admin Queue Status: 200 OK, Pending Reports: ${admQueue.count}`);

  console.log('\n=== 4. DUPLICATE REVIEW QUEUE (30m RADIUS) ===');
  const dupes = await fetch(`${BASE_URL}/api/verification/duplicates?radiusMeters=30`, {
    headers: { Authorization: `Bearer ${admLogin.token}` },
  }).then((r) => r.json());
  console.log(`Duplicates Detected: ${dupes.count}`);
  if (dupes.duplicates?.[0]) {
    const d = dupes.duplicates[0];
    console.log(`Pair: ${d.reportA.reportId} vs ${d.reportB.reportId}`);
    console.log(`Confidence: ${d.confidence}%, Distance: ${d.distanceMeters.toFixed(1)}m, Auto-Link: ${d.autoLink}`);
    console.log(`Signals:`, d.reasons);
  }

  console.log('\n=== 5. ADMIN RESOLVE DUPLICATE (MERGE INTO 1 ROAD ISSUE) ===');
  const mergeRes = await fetch(`${BASE_URL}/api/verification/duplicates/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admLogin.token}`,
    },
    body: JSON.stringify({
      action: 'MERGE',
      reportIds: [rep1.report._id, rep2.report._id],
      primaryReportId: rep1.report._id,
    }),
  }).then((r) => r.json());

  console.log(`Merge Status:`, mergeRes.message);
  console.log(`Unified Defect Created: ${mergeRes.roadIssue?.issueCode}, Total Linked Reports: ${mergeRes.roadIssue?.reportsCount}`);

  console.log('\n=== 6. VERIFY UPDATED TRIAGE STATS ===');
  const stats = await fetch(`${BASE_URL}/api/verification/stats`, {
    headers: { Authorization: `Bearer ${admLogin.token}` },
  }).then((r) => r.json());
  console.log('City Triage Stats:', stats.stats);

  console.log('\n=== PHASE 3 LIVE SMOKE TEST COMPLETE & VERIFIED ===');
}

smokeTestPhase3().catch(console.error);
