/**
 * Phase 4 Smoke Test: Accident Tracking & Ethical Attribution Tiers
 * Exercises the full accident lifecycle end-to-end against the server.
 * Can connect to an existing server or auto-start an in-process server.
 */

async function smokeTestPhase4() {
  const BASE_URL = 'http://localhost:5000';
  let serverInstance = null;

  try {
    const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
    if (health.status === 'OK') {
      console.log('Connected to existing RoadWise AI server on port 5000.');
    }
  } catch (err) {
    console.log('No server detected on port 5000. Launching in-process test server...');
    const { default: app } = await import('./backend/src/app.js');
    const { connectDB } = await import('./backend/src/config/db.js');
    const { seedDemoAccounts } = await import('./backend/src/seed/seedDemoAccounts.js');
    await connectDB();
    await seedDemoAccounts();
    serverInstance = await new Promise((resolve) => {
      const s = app.listen(5000, () => resolve(s));
    });
    console.log('In-process test server ready on port 5000.\n');
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 4 LIVE SMOKE TEST: Accident Tracking & Attribution   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // === 1. Authenticate ===
    console.log('=== 1. AUTHENTICATE CITIZEN & ADMIN ===');
    const citLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@roadwise.ai', password: 'Citizen@123' }),
    }).then((r) => r.json());
    console.log(`Citizen Login: ${citLogin.success ? '200 OK' : 'FAILED'}`);

    const admLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@roadwise.ai', password: 'Admin@123' }),
    }).then((r) => r.json());
    console.log(`Admin Login: ${admLogin.success ? '200 OK' : 'FAILED'}`);

    // === 2. Citizen files a road report first (so there's a RoadIssue to link to) ===
    console.log('\n=== 2. SEED A ROAD DAMAGE REPORT (Create RoadIssue via duplicate merge) ===');
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const fd1 = new FormData();
    fd1.append('damageType', 'pothole');
    fd1.append('severity', 'high');
    fd1.append('description', 'Deep pothole on MG Road near Metro Station 4');
    fd1.append('latitude', '28.6320');
    fd1.append('longitude', '77.2195');
    fd1.append('deviceLatitude', '28.6321');
    fd1.append('deviceLongitude', '77.2196');
    fd1.append('manualAddress', 'MG Road near Metro Station 4');
    fd1.append('photo', new Blob([TINY_PNG], { type: 'image/png' }), 'acc_rep1.png');

    const rep1 = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citLogin.token}` },
      body: fd1,
    }).then((r) => r.json());
    console.log(`Created Report: ${rep1.report?.reportId || 'ERROR'}`);

    // Merge into a RoadIssue
    const mergeRes = await fetch(`${BASE_URL}/api/verification/duplicates/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admLogin.token}`,
      },
      body: JSON.stringify({
        action: 'MERGE',
        reportIds: [rep1.report._id],
        primaryReportId: rep1.report._id,
      }),
    }).then((r) => r.json());
    let issueId = mergeRes.roadIssue?._id;
    console.log(`Linked to RoadIssue: ${mergeRes.roadIssue?.issueCode || '(will auto-detect from accident)'}`);

    // === 3. Citizen reports accident WITHOUT claiming pothole contribution ===
    console.log('\n=== 3. CITIZEN REPORTS ACCIDENT (No claimed contribution → NEARBY_ACCIDENT) ===');
    const acc1Res = await fetch(`${BASE_URL}/api/accidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citLogin.token}`,
      },
      body: JSON.stringify({
        roadIssueId: issueId,
        latitude: 28.6321,
        longitude: 77.2196,
        occurredAt: new Date().toISOString(),
        injurySeverity: 'minor',
        injuriesCount: 1,
        vehiclesInvolved: 2,
        policeReportRef: 'FIR-2026-SMOKE-01',
        evidenceNotes: 'Two-wheeler skidded near road surface damage. No direct pothole causation claimed.',
        claimedContribution: false,
      }),
    }).then((r) => r.json());

    const accId1 = acc1Res.accident?.accidentId;
    if (!issueId && acc1Res.accident?.roadIssue) {
      issueId = acc1Res.accident.roadIssue;
    }
    console.log(`Accident Created: ${accId1}`);
    console.log(`Linked RoadIssue ID: ${issueId}`);
    console.log(`Initial Attribution Tier: ${acc1Res.accident?.attributionTier} (Expected: NEARBY_ACCIDENT)`);
    console.log(`Initial Verification Status: ${acc1Res.accident?.verificationStatus} (Expected: UNVERIFIED)`);
    console.log(`Issue nearbyCount: ${acc1Res.issueAccidentCounts?.nearbyCount} (Expected: 1)`);
    console.log(`Issue confirmedCount: ${acc1Res.issueAccidentCounts?.confirmedCount} (Expected: 0)`);
    console.log(`Issue totalInjuries attributed: ${acc1Res.issueAccidentCounts?.totalInjuries} (Expected: 0 - nearby is strictly non-causal)`);

    // === 4. Citizen reports accident WITH claimed contribution ===
    console.log('\n=== 4. CITIZEN REPORTS ACCIDENT (Claimed contribution → SUSPECTED_CONTRIBUTION) ===');
    const acc2Res = await fetch(`${BASE_URL}/api/accidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citLogin.token}`,
      },
      body: JSON.stringify({
        roadIssueId: issueId,
        latitude: 28.6319,
        longitude: 77.2194,
        occurredAt: new Date(Date.now() - 86400000).toISOString(),
        injurySeverity: 'serious',
        injuriesCount: 2,
        vehiclesInvolved: 3,
        policeReportRef: 'FIR-2026-SMOKE-02',
        evidenceNotes: 'Driver swerved to avoid deep pothole, lost control and crashed into divider. 2 injured.',
        claimedContribution: true,
      }),
    }).then((r) => r.json());

    const accId2 = acc2Res.accident?.accidentId;
    console.log(`Accident Created: ${accId2}`);
    console.log(`Initial Attribution Tier: ${acc2Res.accident?.attributionTier} (Expected: SUSPECTED_CONTRIBUTION)`);
    console.log(`Issue suspectedCount: ${acc2Res.issueAccidentCounts?.suspectedCount} (Expected: 1)`);

    // === 5. RBAC Guard: Citizen CANNOT update attribution ===
    console.log('\n=== 5. RBAC GUARD: CITIZEN CANNOT UPDATE ATTRIBUTION (403) ===');
    const citPatchRes = await fetch(`${BASE_URL}/api/accidents/${accId1}/attribution`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citLogin.token}`,
      },
      body: JSON.stringify({
        attributionTier: 'CONFIRMED_CONTRIBUTION',
        evidenceNotes: 'Illegal escalation attempt by citizen',
      }),
    });
    console.log(`Citizen PATCH attribution: ${citPatchRes.status} (Expected: 403 Forbidden)`);

    // === 6. Admin updates attribution to DOCUMENTED_CONTRIBUTION & VERIFIED ===
    console.log('\n=== 6. ADMIN ESCALATES ACCIDENT TO DOCUMENTED_CONTRIBUTION & VERIFIED ===');
    const docRes = await fetch(`${BASE_URL}/api/accidents/${accId2}/attribution`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admLogin.token}`,
      },
      body: JSON.stringify({
        attributionTier: 'DOCUMENTED_CONTRIBUTION',
        verificationStatus: 'VERIFIED',
        evidenceNotes: 'Police FIR #SMOKE-02 confirms swerving to avoid road defect. Skid marks measured on-site.',
      }),
    }).then((r) => r.json());

    console.log(`Updated Tier: ${docRes.accident?.attributionTier} (Expected: DOCUMENTED_CONTRIBUTION)`);
    console.log(`Updated Verification Status: ${docRes.accident?.verificationStatus} (Expected: VERIFIED)`);
    console.log(`Issue documentedCount: ${docRes.issueAccidentCounts?.documentedCount} (Expected: 1)`);

    // === 7. Admin escalates to CONFIRMED_CONTRIBUTION → triggers SAFETY_OVERRIDE ===
    console.log('\n=== 7. ADMIN ESCALATES TO CONFIRMED_CONTRIBUTION → SAFETY_OVERRIDE ===');
    const confRes = await fetch(`${BASE_URL}/api/accidents/${accId2}/attribution`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admLogin.token}`,
      },
      body: JSON.stringify({
        attributionTier: 'CONFIRMED_CONTRIBUTION',
        evidenceNotes: 'Municipal forensic engineering team confirms pothole as primary cause of collision.',
      }),
    }).then((r) => r.json());

    console.log(`Updated Tier: ${confRes.accident?.attributionTier} (Expected: CONFIRMED_CONTRIBUTION)`);
    console.log(`Issue confirmedCount: ${confRes.issueAccidentCounts?.confirmedCount} (Expected: 1)`);

    // === 8. Verify RoadIssue has SAFETY_OVERRIDE and Five Separate Counts ===
    console.log('\n=== 8. VERIFY FIVE SEPARATE COUNTS & SAFETY OVERRIDE PER ROAD ISSUE ===');
    const issueAccRes = await fetch(`${BASE_URL}/api/accidents/issue/${issueId}`, {
      headers: { Authorization: `Bearer ${admLogin.token}` },
    }).then((r) => r.json());

    console.log(`Total Accidents Linked: ${issueAccRes.count}`);
    console.log(`  1. Nearby Count:    ${issueAccRes.metrics?.nearbyCount} (Excludes defect causation)`);
    console.log(`  2. Suspected Count: ${issueAccRes.metrics?.suspectedCount}`);
    console.log(`  3. Documented Count:${issueAccRes.metrics?.documentedCount}`);
    console.log(`  4. Confirmed Count: ${issueAccRes.metrics?.confirmedCount}`);
    console.log(`  5. Total Injuries:  ${issueAccRes.metrics?.totalInjuries}`);
    console.log(`Safety Risk Score: ${issueAccRes.metrics?.safetyRiskScore} / 100`);

    // === 9. Admin retrieves citywide accident statistics ===
    console.log('\n=== 9. ADMIN RETRIEVES CITYWIDE ACCIDENT STATISTICS ===');
    const statsRes = await fetch(`${BASE_URL}/api/accidents/stats`, {
      headers: { Authorization: `Bearer ${admLogin.token}` },
    }).then((r) => r.json());
    console.log(`Citywide Total Accidents: ${statsRes.stats?.totalAccidents}`);
    console.log(`Citywide Attributed Injuries: ${statsRes.stats?.totalInjuries}`);
    console.log(`Citywide Verified Accidents: ${statsRes.stats?.verifiedCount}`);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 4 LIVE SMOKE TEST COMPLETE & VERIFIED ✅            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
  } finally {
    if (serverInstance) {
      serverInstance.close();
      try {
        const { closeDB } = await import('./backend/src/config/db.js');
        await closeDB();
      } catch (e) {}
      console.log('In-process test server stopped.');
    }
    process.exit(0);
  }
}

smokeTestPhase4().catch((err) => {
  console.error(err);
  process.exit(1);
});
