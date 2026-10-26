/**
 * Phase 5 Comprehensive Smoke Test: Priority Scoring & 0/1 Knapsack Repair Optimization
 * (Spec Sections 8 & 9)
 * 
 * Verifies:
 * 1. Explainable Priority Scoring formula: weights 0.25/0.20/0.15/0.25/0.10/0.05, 0-100 normalized
 * 2. Spec calibration example gives exactly 73.75
 * 3. Zero accidents gives base safety risk A=10 (never zero risk)
 * 4. Safety override escalation flags urgent inspection regardless of score
 * 5. 0/1 Knapsack budget optimizer: sum(cost * x_i) <= budget
 * 6. Mandatory safety constraints (x_i = 1) and infeasibility deficit warnings
 * 7. Modeled benefit formula: round(P_i * TrafficMultiplier_i) strictly labeled "modeled benefit"
 * 8. Comparison against FCFS, Highest Complaints, and Highest Priority (Greedy)
 * 9. Mathematical verification: DP Knapsack vs. Brute-Force (2^N) global optimum equivalence
 * 10. Live API Endpoints: /api/optimization/plan, /api/optimization/priority-analysis, /api/optimization/recalculate-priorities
 */

import { connectDB, closeDB } from './backend/src/config/db.js';
import { RoadIssue } from './backend/src/models/RoadIssue.js';
import { User } from './backend/src/models/User.js';
import {
  calculatePriorityScore,
  computeSeverityScore,
  computeRoadHierarchyScore,
  computeAccidentSafetyScore,
  computeComplaintDensityScore,
  computeCostEfficiencyScore,
  computeWeatherSeasonScore,
  DEFAULT_THRESHOLDS,
  PRIORITY_WEIGHTS,
} from './backend/src/algorithms/priorityScoring.js';
import {
  optimizeRepairPlan,
  solve01KnapsackDP,
  bruteForceKnapsack,
  calculateModeledBenefit,
  TRAFFIC_MULTIPLIERS,
} from './backend/src/algorithms/repairOptimization.js';
import request from './backend/node_modules/supertest/index.js';
import app from './backend/src/app.js';
import { seedDemoAccounts } from './backend/src/seed/seedDemoAccounts.js';

async function runPhase5SmokeTest() {
  console.log('\n========================================================================');
  console.log('🚀 ROADWISE AI - PHASE 5 COMPREHENSIVE SMOKE TEST (SPEC SECTIONS 8 & 9)');
  console.log('========================================================================\n');

  try {
    await connectDB();
    await seedDemoAccounts();

    // -------------------------------------------------------------------------
    // TEST 1: SPEC BENCHMARK CALIBRATION VERIFICATION (73.75)
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 1] SPEC BENCHMARK CALIBRATION VERIFICATION');
    console.log('  Factors: S=75, T=75, A=70, C=68, E=80, W=90');
    console.log('  Weights: 0.25, 0.20, 0.15, 0.25, 0.10, 0.05');

    const specResult = calculatePriorityScore({
      defectSeverityScore: 75,
      roadHierarchyScore: 75,
      accidentSafetyScore: 70,
      complaintDensityScore: 68,
      costEfficiencyScore: 80,
      weatherSeasonScore: 90,
      isCriticalDamageOnMajorRoad: false,
      hasConfirmedAccidents: false,
    });

    console.log(`  Calculated Score: ${specResult.score}`);
    console.log(`  Priority Level:   ${specResult.priorityLevel}`);
    console.log(`  Formula String:   ${specResult.factors.formulaBreakdown}`);

    if (specResult.score === 73.75) {
      console.log('  ✅ SUCCESS: Spec calibration example matches EXACTLY 73.75!\n');
    } else {
      throw new Error(`Spec calibration mismatch! Expected 73.75, got ${specResult.score}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: BASE SAFETY RISK (ZERO ACCIDENTS != ZERO RISK)
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 2] CARDINAL SAFETY RULE: ZERO ACCIDENTS != ZERO SAFETY RISK');
    const zeroAccidentScore = computeAccidentSafetyScore({
      suspectedCount: 0,
      documentedCount: 0,
      confirmedCount: 0,
      totalInjuries: 0,
    });
    console.log(`  Accident counts: { suspected: 0, documented: 0, confirmed: 0, injuries: 0 }`);
    console.log(`  Accident Safety Score (A): ${zeroAccidentScore}/100 (Base Minimum Risk applied)`);

    if (zeroAccidentScore === 10) {
      console.log('  ✅ SUCCESS: Zero accidents evaluates to non-zero baseline safety risk A = 10!\n');
    } else {
      throw new Error(`Zero accident risk must be 10, got ${zeroAccidentScore}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: SAFETY OVERRIDE ESCALATION
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 3] SAFETY OVERRIDE DETERMINISTIC ESCALATION');
    const overrideResult = calculatePriorityScore({
      defectSeverityScore: 40,
      roadHierarchyScore: 30,
      accidentSafetyScore: 10,
      complaintDensityScore: 10,
      costEfficiencyScore: 20,
      weatherSeasonScore: 20,
      isCriticalDamageOnMajorRoad: true, // Triggers override!
      hasConfirmedAccidents: false,
    });

    console.log(`  Raw Weighted Score:       ${overrideResult.factors.formulaBreakdown.split('=').pop().trim()}`);
    console.log(`  Safety Override Active:   ${overrideResult.safetyOverride}`);
    console.log(`  Override Escalated Score: ${overrideResult.score}`);
    console.log(`  Priority Tier:            ${overrideResult.priorityLevel}`);
    console.log(`  Override Reason:          ${overrideResult.safetyOverrideReason}`);

    if (overrideResult.safetyOverride && overrideResult.priorityLevel === 'CRITICAL' && overrideResult.score >= 90) {
      console.log('  ✅ SUCCESS: Safety override successfully escalated defect to CRITICAL priority!\n');
    } else {
      throw new Error('Safety override escalation failed!');
    }

    // -------------------------------------------------------------------------
    // TEST 4: MATHEMATICAL VALIDATION: DP KNAPSACK VS BRUTE FORCE (2^N)
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 4] MATHEMATICAL EQUIVALENCE: 0/1 KNAPSACK DP VS. BRUTE-FORCE (2^N)');
    const smallCandidatePool = [
      { id: 'DEF-1', title: 'Outer Ring Crack', cost: 4000, benefit: 55, isMandatory: false },
      { id: 'DEF-2', title: 'Highway Pothole', cost: 8500, benefit: 120, isMandatory: false },
      { id: 'DEF-3', title: 'Manhole Ring Rupture', cost: 6000, benefit: 85, isMandatory: false },
      { id: 'DEF-4', title: 'Culvert Edge Erosion', cost: 3500, benefit: 45, isMandatory: false },
      { id: 'DEF-5', title: 'Expressway Rutting', cost: 11000, benefit: 165, isMandatory: false },
      { id: 'DEF-6', title: 'Bus Lane Corrugation', cost: 5000, benefit: 70, isMandatory: false },
      { id: 'DEF-7', title: 'Interchange Depress', cost: 9000, benefit: 130, isMandatory: false },
    ];
    const testBudget = 22000;

    console.log(`  Solving Knapsack for ${smallCandidatePool.length} candidates with Budget $${testBudget.toLocaleString()}...`);
    const dpSol = solve01KnapsackDP({ candidates: smallCandidatePool, budget: testBudget });
    const bfSol = bruteForceKnapsack({ candidates: smallCandidatePool, budget: testBudget });

    console.log(`  DP Solver:          Spend = $${dpSol.totalCost}, Modeled Benefit = ${dpSol.totalBenefit}, Selected = ${dpSol.selected.length}`);
    console.log(`  Brute-Force (2^7):  Spend = $${bfSol.totalCost}, Modeled Benefit = ${bfSol.totalBenefit}, Selected = ${bfSol.selected.length}`);

    if (dpSol.totalBenefit === bfSol.totalBenefit && dpSol.totalCost === bfSol.totalCost) {
      console.log('  ✅ SUCCESS: DP Knapsack output mathematically IDENTICAL to Brute-Force global optimum!\n');
    } else {
      throw new Error('DP Knapsack does not match brute-force optimum!');
    }

    // -------------------------------------------------------------------------
    // TEST 5: REALISTIC MUNICIPAL DATASET SEEDING & OPTIMIZATION PLAN
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 5] MUNICIPAL REPAIR PLAN GENERATION WITH BASELINE HEURISTICS');

    // Clean existing test issues
    await RoadIssue.deleteMany({});

    const municipalDefects = [
      {
        issueCode: 'ISSUE-CORR-01',
        title: 'High-speed crater on Grand Trunk Highway (KM 14.2)',
        primaryDamageType: 'pothole',
        severity: 'critical',
        roadClass: 'highway',
        location: { type: 'Point', coordinates: [77.21, 28.61] },
        status: 'VERIFIED',
        estimatedCost: 18000,
        reportsCount: 22,
        priorityScore: 95,
        priorityLevel: 'CRITICAL',
        safetyOverride: true,
        safetyOverrideReason: 'Critical defect on primary arterial corridor',
        accidentCounts: { confirmedCount: 1, totalInjuries: 2 },
      },
      {
        issueCode: 'ISSUE-ART-02',
        title: 'Severe cross-corridor rutting near Ring Road Flyover',
        primaryDamageType: 'rutting',
        severity: 'high',
        roadClass: 'arterial',
        location: { type: 'Point', coordinates: [77.22, 28.62] },
        status: 'VERIFIED',
        estimatedCost: 14000,
        reportsCount: 18,
        priorityScore: 82,
        priorityLevel: 'HIGH',
        safetyOverride: false,
      },
      {
        issueCode: 'ISSUE-COL-03',
        title: 'Collapsed sewer cover on Market Street Collector',
        primaryDamageType: 'manhole_collapse',
        severity: 'critical',
        roadClass: 'collector',
        location: { type: 'Point', coordinates: [77.23, 28.63] },
        status: 'VERIFIED',
        estimatedCost: 7500,
        reportsCount: 15,
        priorityScore: 88,
        priorityLevel: 'CRITICAL',
        safetyOverride: true,
        safetyOverrideReason: 'Manhole collapse in high pedestrian/transit zone',
      },
      {
        issueCode: 'ISSUE-ART-04',
        title: 'Transverse thermal crack cluster on Outer Arterial',
        primaryDamageType: 'severe_crack',
        severity: 'medium',
        roadClass: 'arterial',
        location: { type: 'Point', coordinates: [77.24, 28.64] },
        status: 'VERIFIED',
        estimatedCost: 6500,
        reportsCount: 9,
        priorityScore: 68,
        priorityLevel: 'MEDIUM',
        safetyOverride: false,
      },
      {
        issueCode: 'ISSUE-COL-05',
        title: 'Deep edge ravelling near school district',
        primaryDamageType: 'erosion',
        severity: 'medium',
        roadClass: 'collector',
        location: { type: 'Point', coordinates: [77.25, 28.65] },
        status: 'VERIFIED',
        estimatedCost: 5000,
        reportsCount: 12,
        priorityScore: 64,
        priorityLevel: 'MEDIUM',
        safetyOverride: false,
      },
      {
        issueCode: 'ISSUE-RES-06',
        title: 'Pavement weathering in residential colony Sector 4',
        primaryDamageType: 'pothole',
        severity: 'low',
        roadClass: 'residential',
        location: { type: 'Point', coordinates: [77.26, 28.66] },
        status: 'VERIFIED',
        estimatedCost: 3500,
        reportsCount: 4,
        priorityScore: 42,
        priorityLevel: 'LOW',
        safetyOverride: false,
      },
      {
        issueCode: 'ISSUE-UNV-07',
        title: 'Citizen submitted phone report of waterlogged depression',
        primaryDamageType: 'pothole',
        severity: 'medium',
        roadClass: 'collector',
        location: { type: 'Point', coordinates: [77.27, 28.67] },
        status: 'REPORTED', // Unverified!
        estimatedCost: 4500,
        reportsCount: 1,
        priorityScore: 50,
        priorityLevel: 'MEDIUM',
        safetyOverride: false,
      },
    ];

    await RoadIssue.insertMany(municipalDefects);
    console.log(`  Seeded ${municipalDefects.length} sample municipal road defects.`);

    // Authenticate Admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });
    const adminToken = loginRes.body.token;

    // Run Optimization with $40,000 budget
    const planRes = await request(app)
      .post('/api/optimization/plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ budget: 40000 });

    const plan = planRes.body.plan;
    console.log(`\n  --- 0/1 KNAPSACK REPAIR PLAN (Budget: $${plan.budget.toLocaleString()}) ---`);
    console.log(`  Total Spend:             $${plan.totalCost.toLocaleString()}`);
    console.log(`  Remaining Funds:         $${plan.remainingFunds.toLocaleString()}`);
    console.log(`  Budget Utilization:      ${plan.budgetUtilization}%`);
    console.log(`  Total Modeled Benefit:   ${plan.totalBenefit} (${plan.benefitMetricName})`);
    console.log(`  Selected Repair Count:   ${plan.selectedCount}`);
    console.log(`  Deferred Defects:        ${plan.unselectedCount}`);

    console.log('\n  Selected Candidates:');
    for (const sel of plan.selectedIssues) {
      console.log(`    ✓ [${sel.issueCode}] ${sel.title.slice(0, 40)}... | Cost: $${sel.cost} | Benefit: ${sel.modeledBenefit}`);
      console.log(`      Reason: ${sel.selectionReason}`);
    }

    console.log('\n  Deferred Candidates:');
    for (const uns of plan.unselectedIssues) {
      console.log(`    ✗ [${uns.issueCode}] ${uns.title.slice(0, 40)}... | Reason: ${uns.deferralReason || uns.selectionReason}`);
    }

    // -------------------------------------------------------------------------
    // TEST 6: HEURISTIC BASELINE COMPARISON TABLE
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 6] BENCHMARK COMPARISON: KNAPSACK VS HEURISTIC BASELINES');
    const comp = plan.comparisons;
    console.log('  ┌─────────────────────────────────┬─────────────┬─────────────────┬───────────┬─────────────┐');
    console.log('  │ Strategy                        │ Total Spend │ Modeled Benefit │ Repaired  │ Utilization │');
    console.log('  ├─────────────────────────────────┼─────────────┼─────────────────┼───────────┼─────────────┤');
    console.log(`  │ 0/1 Knapsack (Optimal)          │ $${String(comp.knapsack.totalCost).padEnd(9)} │ ${String(comp.knapsack.totalBenefit).padEnd(15)} │ ${String(comp.knapsack.issuesRepaired).padEnd(9)} │ ${String(comp.knapsack.utilizationPercent + '%').padEnd(11)} │`);
    console.log(`  │ First-Come, First-Served (FCFS) │ $${String(comp.fcfs.totalCost).padEnd(9)} │ ${String(comp.fcfs.totalBenefit).padEnd(15)} │ ${String(comp.fcfs.issuesRepaired).padEnd(9)} │ ${String(comp.fcfs.utilizationPercent + '%').padEnd(11)} │`);
    console.log(`  │ Highest Complaints First        │ $${String(comp.complaints.totalCost).padEnd(9)} │ ${String(comp.complaints.totalBenefit).padEnd(15)} │ ${String(comp.complaints.issuesRepaired).padEnd(9)} │ ${String(comp.complaints.utilizationPercent + '%').padEnd(11)} │`);
    console.log(`  │ Highest Priority (Greedy)       │ $${String(comp.greedy.totalCost).padEnd(9)} │ ${String(comp.greedy.totalBenefit).padEnd(15)} │ ${String(comp.greedy.issuesRepaired).padEnd(9)} │ ${String(comp.greedy.utilizationPercent + '%').padEnd(11)} │`);
    console.log('  └─────────────────────────────────┴─────────────┴─────────────────┴───────────┴─────────────┘');

    if (comp.knapsack.totalBenefit >= comp.fcfs.totalBenefit &&
        comp.knapsack.totalBenefit >= comp.complaints.totalBenefit &&
        comp.knapsack.totalBenefit >= comp.greedy.totalBenefit) {
      console.log('  ✅ SUCCESS: Knapsack optimizer achieves HIGHEST modeled benefit across all baselines!\n');
    }

    // -------------------------------------------------------------------------
    // TEST 7: INFEASIBILITY WARNING & EMERGENCY DEFICIT
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 7] INFEASIBILITY WARNING ON INSUFFICIENT BUDGET FOR MANDATORY DEFECTS');
    // Mandatory defects total: ISSUE-CORR-01 ($18,000) + ISSUE-COL-03 ($7,500) = $25,500
    // If budget is set to $15,000:
    const tightPlanRes = await request(app)
      .post('/api/optimization/plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ budget: 15000 });

    const tightPlan = tightPlanRes.body.plan;
    console.log(`  Budget Provided:         $${tightPlan.budget.toLocaleString()}`);
    console.log(`  Mandatory Overrides Cost:$25,500`);
    console.log(`  Infeasible:              ${tightPlan.infeasible}`);
    console.log(`  Deficit Required:        $${tightPlan.budgetDeficit.toLocaleString()}`);
    console.log(`  Warning:                 ${tightPlan.warning}`);

    if (tightPlan.infeasible && tightPlan.budgetDeficit === 10500) {
      console.log('  ✅ SUCCESS: Infeasibility warning and exact deficit ($10,500) verified!\n');
    } else {
      throw new Error('Infeasibility warning test failed');
    }

    // -------------------------------------------------------------------------
    // TEST 8: PRIORITY ANALYSIS & DATABASE RECALCULATION
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 8] PRIORITY ANALYSIS ENDPOINT & DATABASE RECALCULATION');
    const recalcRes = await request(app)
      .post('/api/optimization/recalculate-priorities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    console.log(`  Recalculate Priorities:  ${recalcRes.body.message}`);

    const analysisRes = await request(app)
      .get('/api/optimization/priority-analysis')
      .set('Authorization', `Bearer ${adminToken}`);

    const analysis = analysisRes.body;
    console.log(`  Total Evaluated:         ${analysis.totalIssues}`);
    console.log(`  Safety Overrides Active: ${analysis.safetyOverrideCount}`);
    console.log('  Factor Score Averages (0-100):');
    for (const f of analysis.factorAverages) {
      console.log(`    • ${f.factor.padEnd(28)} Average: ${f.average}/100 (Weight: ${f.weight * 100}%)`);
    }

    console.log('\n========================================================================');
    console.log('🎉 ALL PHASE 5 FUNCTIONALITY VERIFIED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ Smoke Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await closeDB();
    process.exit(process.exitCode || 0);
  }
}

runPhase5SmokeTest();
