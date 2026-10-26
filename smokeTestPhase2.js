import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function smokeTestPhase2() {
  const BASE_URL = 'http://localhost:5000';

  console.log('=== 1. AUTHENTICATE AS CITIZEN ===');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'citizen@roadwise.ai', password: 'Citizen@123' }),
  });
  const loginData = await loginRes.json();
  console.log(`Citizen Logged In: ${loginData.user.name} (${loginData.user.role})`);
  const token = loginData.token;

  console.log('\n=== 2. SUBMIT ROAD DAMAGE COMPLAINT (MULTIPART PHOTO UPLOAD) ===');
  // Create a minimal 1x1 test image
  const testImgPath = path.join(__dirname, 'smoke_sample.png');
  const TINY_PNG_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(testImgPath, TINY_PNG_BUFFER);

  const formData = new FormData();
  formData.append('damageType', 'pothole');
  formData.append('severity', 'high');
  formData.append('description', 'Severe 6cm deep pothole in outer lane causing vehicle swerving.');
  formData.append('latitude', '28.6139');
  formData.append('longitude', '77.2090');
  formData.append('deviceLatitude', '28.6140');
  formData.append('deviceLongitude', '77.2091');
  formData.append('deviceAccuracyMeters', '15');
  formData.append('manualAddress', 'Connaught Circus, Near Metro Gate 4');
  
  const blob = new Blob([TINY_PNG_BUFFER], { type: 'image/png' });
  formData.append('photo', blob, 'sample_pothole.png');

  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const reportData = await reportRes.json();
  console.log(`POST /api/reports Status: ${reportRes.status}`);
  console.log('Created Report Result:', {
    reportId: reportData.report?.reportId,
    damageType: reportData.report?.damageType,
    severity: reportData.report?.severity,
    verificationStatus: reportData.report?.verificationStatus,
    coordinates: reportData.report?.rawLocation?.coordinates,
    evidenceScore: reportData.report?.evidenceConsistencyScore,
    photoUrl: reportData.report?.photoUrl,
  });

  const createdId = reportData.report?.reportId;

  console.log('\n=== 3. FETCH CITIZEN MY REPORTS ===');
  const myReportsRes = await fetch(`${BASE_URL}/api/reports/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const myReportsData = await myReportsRes.json();
  console.log(`GET /api/reports/my Status: ${myReportsRes.status}, Total Reports: ${myReportsData.count}`);
  console.log(`First Report Ticket: ${myReportsData.reports?.[0]?.reportId}`);

  console.log(`\n=== 4. FETCH SINGLE REPORT DETAILS BY TICKET ID (${createdId}) ===`);
  const detailRes = await fetch(`${BASE_URL}/api/reports/${createdId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detailData = await detailRes.json();
  console.log(`GET /api/reports/${createdId} Status: ${detailRes.status}`);
  console.log('Report Detail Summary:', {
    id: detailData.report?.reportId,
    reporter: detailData.report?.reporter?.name,
    status: detailData.report?.verificationStatus,
    score: detailData.report?.evidenceConsistencyScore,
    notes: detailData.report?.evidenceBreakdown?.notes,
  });

  // Clean up smoke sample image
  if (fs.existsSync(testImgPath)) {
    fs.unlinkSync(testImgPath);
  }
}

smokeTestPhase2().catch(console.error);
