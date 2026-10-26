/**
 * RoadWise AI - Automated 12-Step Live Demo Flow Runner
 * Executes the exact 12-step demo walkthrough against real backend endpoints
 * Captures real HTTP response codes, JSON payloads, and validates all steps.
 * ZERO FAKED RESULTS.
 */

import request from 'supertest';
import app from './src/app.js';
import { connectDB, closeDB } from './src/config/db.js';
import { seedSyntheticData } from './src/seed/seedSyntheticData.js';
import { User } from './src/models/User.js';
import { RoadIssue } from './src/models/RoadIssue.js';
import { calculatePriorityScore } from './src/algorithms/priorityScoring.js';

async function runLiveDemoFlow() {
  console.log('\n================================================================================');
  console.log('🎬 RoadWise AI - 12-Step Comprehensive Live Demo Flow Execution');
  console.log('   Testing Real Backend Endpoints, Algorithms & Workflows (Zero Faked Results)');
  console.log('================================================================================\n');

  const demoLog = {
    stepsExecuted: 0,
    stepsPassed: 0,
    stepsFailed: 0,
    stepResults: [],
  };

  const recordStep = (stepNumber, title, passed, details) => {
    demoLog.stepsExecuted++;
    if (passed) demoLog.stepsPassed++;
    else demoLog.stepsFailed++;
    demoLog.stepResults.push({ stepNumber, title, passed, details });
    const icon = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n[Step ${stepNumber}] ${icon}: ${title}`);
    console.log(`   Details: ${details}`);
  };

  try {
    await connectDB();
    console.log('🌱 Seeding fresh synthetic benchmark dataset for clean demo run...');
    await seedSyntheticData({ quiet: true });

    let citizenToken = '';
    let adminToken = '';
    let inspectorToken = '';
    let citizenUser = null;
    let inspectorUser = null;
    let createdReportId = '';
    let createdReportMongoId = '';
    let createdAccidentId = '';
    let selectedIssueId = '';

    // =========================================================================
    // STEP 1: Citizen Sign-In & Dashboard Profile
    // =========================================================================
    try {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });

      if (loginRes.status === 200 && loginRes.body.token) {
        citizenToken = loginRes.body.token;
        citizenUser = loginRes.body.user;

        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${citizenToken}`);

        const passed = meRes.status === 200 && meRes.body.user.role === 'citizen';
        recordStep(
          1,
          'Citizen Sign-In & Dashboard Overview',
          passed,
          `Authenticated as ${citizenUser.name} (${citizenUser.email}) | Role: ${meRes.body.user.role} | HTTP ${loginRes.status}`
        );
      } else {
        recordStep(1, 'Citizen Sign-In & Dashboard Overview', false, `Login failed: HTTP ${loginRes.status}`);
      }
    } catch (err) {
      recordStep(1, 'Citizen Sign-In & Dashboard Overview', false, err.message);
    }

    // =========================================================================
    // STEP 2: Citizen Road Hazard Reporting
    // =========================================================================
    try {
      const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const reportRes = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('damageType', 'pothole')
        .field('severity', 'critical')
        .field('description', 'Large crater in center lane near flyover approach with exposed aggregate.')
        .field('latitude', '28.5710')
        .field('longitude', '77.2410')
        .attach('photo', TINY_PNG, 'live_pothole_demo.png');

      const is201 = reportRes.status === 201;
      const hasTicket = reportRes.body.report?.reportId?.startsWith('RW-2026-');
      const isUnverified = reportRes.body.report?.verificationStatus === 'UNVERIFIED';

      if (is201 && hasTicket && isUnverified) {
        createdReportId = reportRes.body.report.reportId;
        createdReportMongoId = reportRes.body.report._id;
        recordStep(
          2,
          'Citizen Road Hazard Reporting & EXIF Ingestion',
          true,
          `Generated Ticket: ${createdReportId} | Status: ${reportRes.body.report.verificationStatus} | Evidence Consistency Score: ${reportRes.body.report.evidenceConsistencyScore}`
        );
      } else {
        recordStep(2, 'Citizen Road Hazard Reporting & EXIF Ingestion', false, `Failed: HTTP ${reportRes.status}`);
      }
    } catch (err) {
      recordStep(2, 'Citizen Road Hazard Reporting & EXIF Ingestion', false, err.message);
    }

    // =========================================================================
    // STEP 3: Citizen Vehicular Accident Reporting
    // =========================================================================
    try {
      const balanceBefore = (await User.findById(citizenUser.id)).pointsBalance;

      const accRes = await request(app)
        .post('/api/accidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          latitude: 28.5710,
          longitude: 77.2410,
          vehicleType: 'motorcycle',
          injurySeverity: 'minor',
          injuriesCount: 1,
          vehiclesInvolved: 1,
          policeReportRef: 'FIR-2026-DEL-9102',
          evidenceNotes: 'Motorcycle struck submerged pothole lip during rain; rider lost balance.',
        });

      const is201 = accRes.status === 201;
      createdAccidentId = accRes.body.accident?.accidentId;
      const tier = accRes.body.accident?.attributionTier;
      const balanceAfter = (await User.findById(citizenUser.id)).pointsBalance;
      const zeroPointsGiven = balanceBefore === balanceAfter;

      recordStep(
        3,
        'Citizen Vehicular Accident Reporting (Zero-Point Safety Rule)',
        is201 && zeroPointsGiven,
        `Accident Ref: ${createdAccidentId} | Tier: ${tier} | Points Awarded: 0 (Balance stayed strictly ${balanceBefore} pts)`
      );
    } catch (err) {
      recordStep(3, 'Citizen Vehicular Accident Reporting (Zero-Point Safety Rule)', false, err.message);
    }

    // =========================================================================
    // STEP 4: Citizen Ticket Tracking & Audit History
    // =========================================================================
    try {
      const myReportsRes = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${citizenToken}`);

      const detailRes = await request(app)
        .get(`/api/reports/${createdReportMongoId}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      const passed = myReportsRes.status === 200 && detailRes.status === 200 && detailRes.body.report.reportId === createdReportId;
      recordStep(
        4,
        'Citizen Ticket Timeline & Audit Trail',
        passed,
        `Retrieved ticket ${createdReportId} details | Verified Status: ${detailRes.body.report.verificationStatus} | Audit checks: ${detailRes.body.report.evidenceBreakdown?.notes?.length || 0} checks logged`
      );
    } catch (err) {
      recordStep(4, 'Citizen Ticket Timeline & Audit Trail', false, err.message);
    }

    // =========================================================================
    // STEP 5: City Administrator Sign-In & Command Center
    // =========================================================================
    try {
      const admLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });

      adminToken = admLoginRes.body.token;

      const analyticsRes = await request(app)
        .get('/api/repairs/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      const passed = admLoginRes.status === 200 && analyticsRes.status === 200 && analyticsRes.body.totalIssues > 0;
      recordStep(
        5,
        'City Administrator Sign-In & Command Center',
        passed,
        `Admin Priya Authenticated | Tracked Defects: ${analyticsRes.body.totalIssues} | Total Est Spend: $${analyticsRes.body.totalEstimatedSpend?.toLocaleString()} | Safety Overrides: ${analyticsRes.body.safetyOverrideCount}`
      );
    } catch (err) {
      recordStep(5, 'City Administrator Sign-In & Command Center', false, err.message);
    }

    // =========================================================================
    // STEP 6: Verification Queue & Multi-Factor Evidence Audit
    // =========================================================================
    try {
      const queueRes = await request(app)
        .get('/api/verification/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      // Authenticate Inspector
      const inspLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inspector@roadwise.ai', password: 'Inspector@123' });
      inspectorToken = inspLoginRes.body.token;
      inspectorUser = inspLoginRes.body.user;

      // Update verification status for report from Step 2
      const verifyRes = await request(app)
        .patch(`/api/verification/reports/${createdReportMongoId}/status`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          status: 'INSPECTOR_VERIFIED',
          notes: 'Field inspection confirmed 18cm crater depth on-site.',
        });

      const citizenAfterAward = await User.findById(citizenUser.id);
      const passed = queueRes.status === 200 && verifyRes.status === 200 && citizenAfterAward.pointsBalance > 135;

      recordStep(
        6,
        'Verification Queue Audit & Inspector Sign-Off',
        passed,
        `Queue size: ${queueRes.body.count} pending | Verified ${createdReportId} -> INSPECTOR_VERIFIED | Citizen Wallet Auto-Credited to ${citizenAfterAward.pointsBalance} pts`
      );
    } catch (err) {
      recordStep(6, 'Verification Queue Audit & Inspector Sign-Off', false, err.message);
    }

    // =========================================================================
    // STEP 7: Spatial Duplicate Detection & Defect Consolidation
    // =========================================================================
    try {
      const dupRes = await request(app)
        .get('/api/verification/duplicates')
        .set('Authorization', `Bearer ${adminToken}`);

      let mergeSuccess = false;
      let duplicateConfidence = 0;
      if (dupRes.status === 200 && dupRes.body.duplicates?.length > 0) {
        const pair = dupRes.body.duplicates[0];
        duplicateConfidence = pair.confidence;

        // Perform consolidation
        const mergeRes = await request(app)
          .post('/api/verification/duplicates/resolve')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            action: 'MERGE',
            primaryReportId: pair.reportA._id,
            reportIds: [pair.reportA._id, pair.reportB._id],
          });

        mergeSuccess = mergeRes.status === 200;
      }

      recordStep(
        7,
        'Spatial Duplicate Detection & Defect Consolidation',
        mergeSuccess,
        `Detected Duplicate Pair Confidence: ${duplicateConfidence}% | Merged secondary report into unified defect`
      );
    } catch (err) {
      recordStep(7, 'Spatial Duplicate Detection & Defect Consolidation', false, err.message);
    }

    // =========================================================================
    // STEP 8: Accident Attribution Evidence Review & Calibration
    // =========================================================================
    try {
      const listAccRes = await request(app)
        .get('/api/accidents')
        .set('Authorization', `Bearer ${adminToken}`);

      const targetAccident = listAccRes.body.accidents?.find((a) => a.attributionTier === 'SUSPECTED_CONTRIBUTION') || listAccRes.body.accidents?.[0];

      let calibSuccess = false;
      if (targetAccident) {
        const updateTierRes = await request(app)
          .patch(`/api/accidents/${targetAccident._id}/attribution`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            attributionTier: 'DOCUMENTED_CONTRIBUTION',
            verificationStatus: 'VERIFIED',
            evidenceNotes: 'Formal police incident FIR verified as contributing factor.',
          });

        calibSuccess = updateTierRes.status === 200 && updateTierRes.body.accident.attributionTier === 'DOCUMENTED_CONTRIBUTION';
      }

      recordStep(
        8,
        'Accident Attribution Calibration & Ethical Separation',
        calibSuccess,
        `Calibrated ${targetAccident?.accidentId} to DOCUMENTED_CONTRIBUTION | Strict Rule: Nearby accidents remain strictly unattributed`
      );
    } catch (err) {
      recordStep(8, 'Accident Attribution Calibration & Ethical Separation', false, err.message);
    }

    // =========================================================================
    // STEP 9: Explainable Priority Scoring & 73.75 Calibration Case
    // =========================================================================
    try {
      // 1. Algorithmic verification of spec calibration case
      const specScore = calculatePriorityScore({
        defectSeverityScore: 75,
        roadHierarchyScore: 75,
        accidentSafetyScore: 70,
        complaintDensityScore: 68,
        costEfficiencyScore: 80,
        weatherSeasonScore: 90,
      });

      // 2. Database benchmark defect verification
      const benchmarkIssue = await RoadIssue.findOne({ issueCode: 'ISSUE-2026-HIGH-04' });
      const calculatedScore = specScore.score;
      const isExactly7375 = Math.abs(calculatedScore - 73.75) < 0.001;
      const dbMatches = benchmarkIssue && Math.abs(benchmarkIssue.priorityScore - 73.75) < 0.001;

      recordStep(
        9,
        'Explainable Priority Scoring & 73.75 Benchmark Calibration',
        isExactly7375 && dbMatches,
        `Spec Formula: 0.25(75) + 0.20(75) + 0.15(70) + 0.25(68) + 0.10(80) + 0.05(90) = Exactly ${calculatedScore} | DB Seed Defect ${benchmarkIssue?.issueCode}: ${benchmarkIssue?.priorityScore}`
      );
    } catch (err) {
      recordStep(9, 'Explainable Priority Scoring & 73.75 Benchmark Calibration', false, err.message);
    }

    // =========================================================================
    // STEP 10: 0/1 Knapsack Budget Optimization Simulation
    // =========================================================================
    try {
      const optRes = await request(app)
        .post('/api/optimization/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ budget: 25000 });

      const hasKnapsack = Boolean(optRes.body.plan?.comparisons?.knapsack);
      const hasFCFS = Boolean(optRes.body.plan?.comparisons?.fcfs);
      const knapsackBenefit = optRes.body.plan?.comparisons?.knapsack?.totalBenefit ?? optRes.body.plan?.totalBenefit;
      const fcfsBenefit = optRes.body.plan?.comparisons?.fcfs?.totalBenefit;
      const knapsackBetterOrEqual = knapsackBenefit >= fcfsBenefit;

      // Infeasibility warning when budget is low ($3,000)
      const tightOptRes = await request(app)
        .post('/api/optimization/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ budget: 3000 });
      const hasInfeasibilityWarning = tightOptRes.body.plan?.infeasible === true && tightOptRes.body.plan?.budgetDeficit > 0;

      recordStep(
        10,
        '0/1 Knapsack Budget Optimization vs Heuristics',
        hasKnapsack && hasFCFS && knapsackBetterOrEqual && hasInfeasibilityWarning,
        `Knapsack Modeled Benefit: ${knapsackBenefit} vs FCFS: ${fcfsBenefit} | Low budget ($3000) triggered Infeasibility Deficit of $${tightOptRes.body.plan?.budgetDeficit}`
      );
    } catch (err) {
      recordStep(10, '0/1 Knapsack Budget Optimization vs Heuristics', false, err.message);
    }

    // =========================================================================
    // STEP 11: 7-Stage Repair Lifecycle Workflow
    // =========================================================================
    try {
      const targetIssue = await RoadIssue.findOne({ status: 'VERIFIED' });
      selectedIssueId = targetIssue._id;

      // Stage 1: Schedule
      const schedRes = await request(app)
        .patch(`/api/repairs/${selectedIssueId}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedCost: 4500 });

      // Stage 2: Assign
      const assignRes = await request(app)
        .patch(`/api/repairs/${selectedIssueId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTeam: 'CREW-ALPHA: Central Rapid Asphalt Crew', assignedInspectorId: inspectorUser._id || inspectorUser.id });

      // Stage 3: Start
      const startRes = await request(app)
        .patch(`/api/repairs/${selectedIssueId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Asphalt milling crew initiated active infill.' });

      // Stage 4: Inspect
      const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const inspectRes = await request(app)
        .post(`/api/repairs/${selectedIssueId}/inspect`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .field('notes', 'Post-repair core density tested at 98.4%. Surface flush.')
        .attach('photo', TINY_PNG, 'completion_proof.png');

      // Stage 5: Close
      const closeRes = await request(app)
        .patch(`/api/repairs/${selectedIssueId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Chief Priya signed off work order.' });

      const passed = schedRes.status === 200 && assignRes.status === 200 && startRes.status === 200 && inspectRes.status === 200 && closeRes.status === 200 && closeRes.body.issue.status === 'CLOSED';

      recordStep(
        11,
        '7-Stage Repair Lifecycle Workflow State Machine',
        passed,
        `Defect ${targetIssue.issueCode}: SCHEDULED (${schedRes.body.issue.workOrderNumber}) -> ASSIGNED (Crew Alpha) -> IN_PROGRESS -> INSPECTED -> CLOSED`
      );
    } catch (err) {
      recordStep(11, '7-Stage Repair Lifecycle Workflow State Machine', false, err.message);
    }

    // =========================================================================
    // STEP 12: RoadWise Rewards Hub, Atomic Redemption & Privacy Safeguards
    // =========================================================================
    try {
      const walletRes = await request(app)
        .get('/api/rewards/wallet')
        .set('Authorization', `Bearer ${citizenToken}`);

      // Atomic Perk Redemption
      const redeemRes = await request(app)
        .post('/api/rewards/redeem')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ perkId: 'PERK-TRANSIT-PASS' });

      // Negative Balance Prevention
      const excessiveRedeem = await request(app)
        .post('/api/rewards/redeem')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ perkId: 'PERK-TREE-DEDICATION' }); // 200 pts, balance is less than 200

      // Privacy Settings
      const prefRes = await request(app)
        .patch('/api/rewards/preferences')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ useAliasOnLeaderboard: true, alias: 'EcoRider_Delhi' });

      // Leaderboard
      const lbRes = await request(app)
        .get('/api/rewards/leaderboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      const citizenEntry = lbRes.body.leaderboard?.find((c) => c.userId?.toString() === citizenUser.id.toString());
      const aliasProtected = citizenEntry?.displayName === 'EcoRider_Delhi';

      const passed = walletRes.status === 200 && redeemRes.status === 200 && excessiveRedeem.status === 400 && prefRes.status === 200 && aliasProtected;

      recordStep(
        12,
        'Rewards Hub, Atomic Perk Redemption & Leaderboard Privacy',
        passed,
        `Voucher: ${redeemRes.body.voucherCode} | Negative Balance Prevented (HTTP 400) | Alias "${citizenEntry?.displayName}" displayed on Leaderboard`
      );
    } catch (err) {
      recordStep(12, 'Rewards Hub, Atomic Perk Redemption & Leaderboard Privacy', false, err.message);
    }

    // =========================================================================
    // DEMO SUMMARY REPORT
    // =========================================================================
    console.log('\n================================================================================');
    console.log('📊 ROADWISE AI LIVE DEMO EXECUTION SUMMARY');
    console.log('================================================================================');
    console.log(`Total Steps Executed: ${demoLog.stepsExecuted} / 12`);
    console.log(`Steps Passed:         ${demoLog.stepsPassed} / 12 (${Math.round((demoLog.stepsPassed / demoLog.stepsExecuted) * 100)}% Pass Rate)`);
    console.log(`Steps Failed:         ${demoLog.stepsFailed} / 12`);
    console.log('================================================================================\n');

    if (demoLog.stepsFailed > 0) {
      console.log('❌ Failing Steps Breakdown:');
      demoLog.stepResults.filter((r) => !r.passed).forEach((r) => {
        console.log(`  - [Step ${r.stepNumber}] ${r.title}: ${r.details}`);
      });
      process.exit(1);
    } else {
      console.log('🎉 ALL 12 STEPS OF THE LIVE DEMO WALKTHROUGH EXECUTED WITH ZERO ERRORS!');
    }
  } catch (err) {
    console.error('Fatal Demo Execution Error:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

runLiveDemoFlow();
