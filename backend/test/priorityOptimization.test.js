import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { seedDemoAccounts } from '../src/seed/seedDemoAccounts.js';
import { RoadIssue } from '../src/models/RoadIssue.js';
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
} from '../src/algorithms/priorityScoring.js';
import {
  optimizeRepairPlan,
  solve01KnapsackDP,
  bruteForceKnapsack,
  calculateModeledBenefit,
  getTrafficMultiplier,
} from '../src/algorithms/repairOptimization.js';

describe('Phase 5: Priority Scoring & 0/1 Knapsack Optimization Test Suite', () => {
  let adminToken = '';
  let citizenToken = '';
  let sampleIssueIds = [];

  before(async () => {
    await connectDB();
    await seedDemoAccounts();

    // Authenticate admin and citizen
    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@roadwise.ai', password: 'Admin@123' });
    adminToken = admRes.body.token;

    const citRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@roadwise.ai', password: 'Citizen@123' });
    citizenToken = citRes.body.token;

    // Seed ground-truth defects for optimization & priority testing
    const issuesToCreate = [
      {
        issueCode: 'ISSUE-TEST-OPT-1',
        title: 'Deep sinkhole on Grand Trunk Highway',
        primaryDamageType: 'manhole_collapse',
        severity: 'critical',
        roadClass: 'highway',
        location: { type: 'Point', coordinates: [77.209, 28.6139] },
        status: 'VERIFIED',
        estimatedCost: 15000,
        reportsCount: 12,
        priorityScore: 92,
        priorityLevel: 'CRITICAL',
        safetyOverride: true,
        safetyOverrideReason: 'Critical defect on highway corridor',
        accidentCounts: { nearbyCount: 1, suspectedCount: 1, documentedCount: 0, confirmedCount: 1, totalInjuries: 2 },
      },
      {
        issueCode: 'ISSUE-TEST-OPT-2',
        title: 'Severe longitudinal cracking on Outer Ring Arterial',
        primaryDamageType: 'severe_crack',
        severity: 'high',
        roadClass: 'arterial',
        location: { type: 'Point', coordinates: [77.21, 28.614] },
        status: 'VERIFIED',
        estimatedCost: 10000,
        reportsCount: 8,
        priorityScore: 78,
        priorityLevel: 'HIGH',
        safetyOverride: false,
        accidentCounts: { nearbyCount: 2, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
      },
      {
        issueCode: 'ISSUE-TEST-OPT-3',
        title: 'Medium pothole near metro station market',
        primaryDamageType: 'pothole',
        severity: 'medium',
        roadClass: 'collector',
        location: { type: 'Point', coordinates: [77.215, 28.618] },
        status: 'VERIFIED',
        estimatedCost: 6000,
        reportsCount: 15,
        priorityScore: 65,
        priorityLevel: 'MEDIUM',
        safetyOverride: false,
        accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
      },
      {
        issueCode: 'ISSUE-TEST-OPT-4',
        title: 'Minor raveling on residential lane',
        primaryDamageType: 'pothole',
        severity: 'low',
        roadClass: 'local',
        location: { type: 'Point', coordinates: [77.22, 28.62] },
        status: 'VERIFIED',
        estimatedCost: 4000,
        reportsCount: 2,
        priorityScore: 35,
        priorityLevel: 'LOW',
        safetyOverride: false,
        accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
      },
      {
        issueCode: 'ISSUE-TEST-OPT-5',
        title: 'Unverified report of curb depression',
        primaryDamageType: 'pothole',
        severity: 'medium',
        roadClass: 'local',
        location: { type: 'Point', coordinates: [77.225, 28.625] },
        status: 'REPORTED', // Not verified!
        estimatedCost: 5000,
        reportsCount: 1,
        priorityScore: 45,
        priorityLevel: 'MEDIUM',
        safetyOverride: false,
      },
    ];

    const created = await RoadIssue.insertMany(issuesToCreate);
    sampleIssueIds = created.map((i) => i._id.toString());
  });

  after(async () => {
    await closeDB();
  });

  // =========================================================================
  // SUB-SECTION (a): EXPLAINABLE PRIORITY SCORING TESTS
  // =========================================================================

  test('(a.1) Spec benchmark calibration verification: gives EXACTLY 73.75', () => {
    // Spec calibration values: S=75, T=75, A=70, C=68, E=80, W=90
    // Formula: 0.25*75 + 0.20*75 + 0.15*70 + 0.25*68 + 0.10*80 + 0.05*90
    // Calculation: 18.75 + 15.00 + 10.50 + 17.00 + 8.00 + 4.50 = 73.75
    const result = calculatePriorityScore({
      defectSeverityScore: 75,
      roadHierarchyScore: 75,
      accidentSafetyScore: 70,
      complaintDensityScore: 68,
      costEfficiencyScore: 80,
      weatherSeasonScore: 90,
      isCriticalDamageOnMajorRoad: false,
      hasConfirmedAccidents: false,
    });

    assert.strictEqual(result.score, 73.75, 'Spec benchmark MUST yield exactly 73.75');
    assert.strictEqual(result.priorityLevel, 'HIGH', 'Score 73.75 must map to HIGH priority tier (70-84)');
    assert.strictEqual(result.safetyOverride, false, 'No safety override when conditions are not met');
    assert.ok(result.factors.formulaBreakdown.includes('73.75'), 'Breakdown string must include final score');
  });

  test('(a.2) Zero accidents must NOT mean zero safety risk (base A = 10)', () => {
    // When an issue has zero accidents, computeAccidentSafetyScore must still return base risk >= 10
    const zeroAccidentRisk = computeAccidentSafetyScore({
      nearbyCount: 0,
      suspectedCount: 0,
      documentedCount: 0,
      confirmedCount: 0,
      totalInjuries: 0,
    });

    assert.strictEqual(zeroAccidentRisk, 10, 'Zero accidents must default to base safety risk A=10');
    assert.ok(zeroAccidentRisk > 0, 'Zero accidents must NOT mean zero safety risk');

    // Confirm that undefined / null accidentCounts also safely returns base safety risk 10
    assert.strictEqual(computeAccidentSafetyScore(null), 10);
    assert.strictEqual(computeAccidentSafetyScore(undefined), 10);
  });

  test('(a.3) Safety override triggers urgent inspection on critical defect on arterial/highway', () => {
    // Low scores across other factors, but critical defect on major road
    const result = calculatePriorityScore({
      defectSeverityScore: 30,
      roadHierarchyScore: 30,
      accidentSafetyScore: 10,
      complaintDensityScore: 10,
      costEfficiencyScore: 20,
      weatherSeasonScore: 20,
      isCriticalDamageOnMajorRoad: true,
      hasConfirmedAccidents: false,
    });

    assert.strictEqual(result.safetyOverride, true, 'Safety override must be true for critical defect on major corridor');
    assert.strictEqual(result.priorityLevel, 'CRITICAL', 'Safety override must escalate level to CRITICAL');
    assert.ok(result.score >= 90, 'Safety override must elevate priority score to at least 90');
    assert.ok(result.safetyOverrideReason.includes('Corridor Hazard Override'), 'Safety override reason must be set');
  });

  test('(a.4) Safety override triggers on confirmed accident attribution regardless of score', () => {
    const result = calculatePriorityScore({
      defectSeverityScore: 20,
      roadHierarchyScore: 20,
      accidentSafetyScore: 20,
      complaintDensityScore: 10,
      costEfficiencyScore: 10,
      weatherSeasonScore: 10,
      isCriticalDamageOnMajorRoad: false,
      hasConfirmedAccidents: true,
    });

    assert.strictEqual(result.safetyOverride, true, 'Safety override must be true for confirmed accidents');
    assert.strictEqual(result.priorityLevel, 'CRITICAL', 'Safety override must escalate level to CRITICAL');
    assert.ok(result.safetyOverrideReason.includes('Confirmed Accident Causation'), 'Safety override reason must cite accident');
  });

  test('(a.5) Configurable threshold mappings (Low, Medium, High, Critical)', () => {
    const customThresholds = { low: 30, medium: 45, high: 75, critical: 90 };

    // Test Low
    const low = calculatePriorityScore({
      defectSeverityScore: 20, roadHierarchyScore: 20, accidentSafetyScore: 20,
      complaintDensityScore: 20, costEfficiencyScore: 20, weatherSeasonScore: 20,
      thresholds: customThresholds,
    });
    assert.strictEqual(low.priorityLevel, 'LOW');

    // Test Medium (score = 50)
    const med = calculatePriorityScore({
      defectSeverityScore: 50, roadHierarchyScore: 50, accidentSafetyScore: 50,
      complaintDensityScore: 50, costEfficiencyScore: 50, weatherSeasonScore: 50,
      thresholds: customThresholds,
    });
    assert.strictEqual(med.priorityLevel, 'MEDIUM');

    // Test High (score = 82)
    const high = calculatePriorityScore({
      defectSeverityScore: 82, roadHierarchyScore: 82, accidentSafetyScore: 82,
      complaintDensityScore: 82, costEfficiencyScore: 82, weatherSeasonScore: 82,
      thresholds: customThresholds,
    });
    assert.strictEqual(high.priorityLevel, 'HIGH');

    // Test Critical (score = 92)
    const crit = calculatePriorityScore({
      defectSeverityScore: 92, roadHierarchyScore: 92, accidentSafetyScore: 92,
      complaintDensityScore: 92, costEfficiencyScore: 92, weatherSeasonScore: 92,
      thresholds: customThresholds,
    });
    assert.strictEqual(crit.priorityLevel, 'CRITICAL');
  });

  // =========================================================================
  // SUB-SECTION (b): 0/1 KNAPSACK OPTIMIZER TESTS
  // =========================================================================

  test('(b.1) Knapsack optimizer strictly respects budget constraint (sum(cost) <= budget)', () => {
    const candidatePool = [
      { id: '1', title: 'Defect 1', cost: 12000, benefit: 140, isMandatory: false },
      { id: '2', title: 'Defect 2', cost: 8000, benefit: 95, isMandatory: false },
      { id: '3', title: 'Defect 3', cost: 15000, benefit: 180, isMandatory: false },
      { id: '4', title: 'Defect 4', cost: 20000, benefit: 220, isMandatory: false },
      { id: '5', title: 'Defect 5', cost: 7000, benefit: 85, isMandatory: false },
    ];

    const budget = 25000;
    const solution = solve01KnapsackDP({ candidates: candidatePool, budget });

    assert.ok(solution.totalCost <= budget, `Total spend (${solution.totalCost}) must not exceed budget (${budget})`);
    assert.ok(solution.remainingBudget >= 0, 'Remaining budget must be >= 0');
    assert.ok(solution.selected.length > 0, 'At least one candidate must be selected');
  });

  test('(b.2) Knapsack optimizer output EXACTLY matches brute-force (2^N) check on small case', () => {
    // 8 items - 2^8 = 256 subsets
    const smallCase = [
      { id: 'item1', title: 'Corridor Crack', cost: 3500, benefit: 45, isMandatory: false },
      { id: 'item2', title: 'Highway Pothole', cost: 7000, benefit: 98, isMandatory: false },
      { id: 'item3', title: 'Manhole Collapse', cost: 5500, benefit: 80, isMandatory: false },
      { id: 'item4', title: 'Culvert Edge', cost: 4000, benefit: 50, isMandatory: false },
      { id: 'item5', title: 'Bridge Raveling', cost: 8200, benefit: 110, isMandatory: false },
      { id: 'item6', title: 'Crosswalk Rut', cost: 2500, benefit: 32, isMandatory: false },
      { id: 'item7', title: 'Intersection Sinkhole', cost: 9500, benefit: 135, isMandatory: false },
      { id: 'item8', title: 'Shoulder Erosion', cost: 6000, benefit: 75, isMandatory: false },
    ];

    const testBudget = 18000;

    const dpSolution = solve01KnapsackDP({ candidates: smallCase, budget: testBudget });
    const bfSolution = bruteForceKnapsack({ candidates: smallCase, budget: testBudget });

    assert.strictEqual(
      dpSolution.totalBenefit,
      bfSolution.totalBenefit,
      `DP benefit (${dpSolution.totalBenefit}) must equal brute-force benefit (${bfSolution.totalBenefit})`
    );
    assert.strictEqual(
      dpSolution.totalCost,
      bfSolution.totalCost,
      `DP cost (${dpSolution.totalCost}) must equal brute-force cost (${bfSolution.totalCost})`
    );

    // Verify both select the exact same item IDs
    const dpIds = dpSolution.selected.map((i) => i.id).sort();
    const bfIds = bfSolution.selected.map((i) => i.id).sort();
    assert.deepStrictEqual(dpIds, bfIds, 'DP and Brute-force must select identical set of defect IDs');
  });

  test('(b.3) Only verified defects are eligible; unverified/reported defects are excluded', () => {
    const mixedIssues = [
      { _id: 'v1', status: 'VERIFIED', estimatedCost: 5000, priorityScore: 80, roadClass: 'arterial' },
      { _id: 'v2', status: 'SCHEDULED', estimatedCost: 4000, priorityScore: 70, roadClass: 'collector' },
      { _id: 'u1', status: 'REPORTED', estimatedCost: 3000, priorityScore: 90, roadClass: 'highway' }, // ineligible!
      { _id: 'u2', status: 'DRAFT', estimatedCost: 2000, priorityScore: 85, roadClass: 'local' }, // ineligible!
    ];

    const plan = optimizeRepairPlan({ issues: mixedIssues, budget: 30000 });

    const selectedIds = plan.selectedIssues.map((i) => i._id);
    assert.ok(selectedIds.includes('v1'), 'Verified defect must be eligible');
    assert.ok(!selectedIds.includes('u1'), 'Reported defect must be excluded from selection');
    assert.ok(!selectedIds.includes('u2'), 'Draft defect must be excluded from selection');

    const deferredU1 = plan.unselectedIssues.find((i) => i._id === 'u1');
    assert.ok(deferredU1, 'Unverified defect must appear in unselected list');
    assert.ok(deferredU1.deferralReason.includes('Unverified'), 'Deferral reason must state unverified');
  });

  test('(b.4) Mandatory critical safety defects are forced into plan with x_i = 1', () => {
    const issues = [
      {
        _id: 'mandatory1',
        title: 'Dangerous Highway Crater',
        status: 'VERIFIED',
        estimatedCost: 12000,
        priorityScore: 95,
        roadClass: 'highway',
        safetyOverride: true, // Mandatory!
      },
      {
        _id: 'regular1',
        title: 'High priority defect',
        status: 'VERIFIED',
        estimatedCost: 8000,
        priorityScore: 85,
        roadClass: 'arterial',
        safetyOverride: false,
      },
    ];

    const plan = optimizeRepairPlan({ issues, budget: 15000 });

    assert.strictEqual(plan.mandatorySelectedCount, 1, 'Mandatory defect must be accounted for');
    const selectedIds = plan.selectedIssues.map((i) => i._id);
    assert.ok(selectedIds.includes('mandatory1'), 'Mandatory defect must be selected');
    assert.ok(plan.infeasible === false, 'Plan should be feasible when budget covers mandatory items');
  });

  test('(b.5) Infeasibility warning and deficit calculation when budget cannot cover mandatory safety defects', () => {
    const mandatoryIssues = [
      {
        _id: 'mand1',
        title: 'Highway Sinkhole',
        status: 'VERIFIED',
        estimatedCost: 25000,
        priorityScore: 98,
        roadClass: 'highway',
        safetyOverride: true,
      },
      {
        _id: 'mand2',
        title: 'Critical Arterial Failure',
        status: 'VERIFIED',
        estimatedCost: 15000,
        priorityScore: 95,
        roadClass: 'arterial',
        safetyOverride: true,
      },
    ];

    const tightBudget = 20000; // Mandatory total is 40,000 > 20,000
    const plan = optimizeRepairPlan({ issues: mandatoryIssues, budget: tightBudget });

    assert.strictEqual(plan.infeasible, true, 'Plan must be marked infeasible');
    assert.ok(plan.warning.includes('INSUFFICIENT BUDGET FOR CRITICAL SAFETY OVERRIDES'), 'Warning banner must be present');
    assert.strictEqual(plan.budgetDeficit, 20000, 'Deficit must equal mandatoryCost (40,000) - budget (20,000) = 20,000');
    assert.strictEqual(plan.emergencyProcedureRequired, true, 'Emergency procedure must be flagged');
  });

  test('(b.6) Documented formula is labeled "modeled benefit" and NEVER "lives saved"', () => {
    const issue = { priorityScore: 80, roadClass: 'highway' };
    const benefit = calculateModeledBenefit(issue);

    // Highway multiplier is 1.5 -> round(80 * 1.5) = 120
    assert.strictEqual(benefit, 120);

    const plan = optimizeRepairPlan({
      issues: [{ _id: 'i1', status: 'VERIFIED', estimatedCost: 5000, priorityScore: 80, roadClass: 'highway' }],
      budget: 10000,
    });

    assert.strictEqual(plan.benefitMetricName, 'modeled benefit', 'Metric MUST be labeled "modeled benefit"');
    assert.ok(plan.modelDocumentation.includes('Modeled Benefit'), 'Documentation must use modeled benefit');
    assert.ok(!JSON.stringify(plan).toLowerCase().includes('lives saved'), 'Must NEVER contain "lives saved"');
  });

  // =========================================================================
  // SUB-SECTION (c): COMPARISON AGAINST HEURISTIC BASELINES
  // =========================================================================

  test('(c.1) Comparison metrics against FCFS, Complaints, and Greedy heuristics', () => {
    const defectSuite = [
      { _id: 'd1', title: 'Defect 1', status: 'VERIFIED', estimatedCost: 10000, priorityScore: 90, reportsCount: 3, roadClass: 'arterial', createdAt: new Date('2026-01-01') },
      { _id: 'd2', title: 'Defect 2', status: 'VERIFIED', estimatedCost: 12000, priorityScore: 85, reportsCount: 25, roadClass: 'collector', createdAt: new Date('2026-01-02') },
      { _id: 'd3', title: 'Defect 3', status: 'VERIFIED', estimatedCost: 6000, priorityScore: 70, reportsCount: 15, roadClass: 'arterial', createdAt: new Date('2026-01-03') },
      { _id: 'd4', title: 'Defect 4', status: 'VERIFIED', estimatedCost: 4000, priorityScore: 60, reportsCount: 5, roadClass: 'local', createdAt: new Date('2026-01-04') },
      { _id: 'd5', title: 'Defect 5', status: 'VERIFIED', estimatedCost: 5000, priorityScore: 75, reportsCount: 2, roadClass: 'arterial', createdAt: new Date('2026-01-05') },
    ];

    const budget = 20000;
    const plan = optimizeRepairPlan({ issues: defectSuite, budget });

    const comparisons = plan.comparisons;
    assert.ok(comparisons.knapsack, 'Knapsack comparison must exist');
    assert.ok(comparisons.fcfs, 'FCFS comparison must exist');
    assert.ok(comparisons.complaints, 'Complaints comparison must exist');
    assert.ok(comparisons.greedy, 'Greedy comparison must exist');

    // Knapsack modeled benefit must be >= heuristic solutions
    assert.ok(
      comparisons.knapsack.totalBenefit >= comparisons.fcfs.totalBenefit,
      'Knapsack benefit must be >= FCFS'
    );
    assert.ok(
      comparisons.knapsack.totalBenefit >= comparisons.complaints.totalBenefit,
      'Knapsack benefit must be >= Complaints'
    );
    assert.ok(
      comparisons.knapsack.totalBenefit >= comparisons.greedy.totalBenefit,
      'Knapsack benefit must be >= Greedy priority'
    );

    // Verify all baseline costs strictly respect budget
    assert.ok(comparisons.knapsack.totalCost <= budget);
    assert.ok(comparisons.fcfs.totalCost <= budget);
    assert.ok(comparisons.complaints.totalCost <= budget);
    assert.ok(comparisons.greedy.totalCost <= budget);

    // Verify utilization calculation
    assert.ok(comparisons.knapsack.utilizationPercent <= 100);
    assert.ok(comparisons.knapsack.utilizationPercent >= 0);
  });

  // =========================================================================
  // SUB-SECTION (d): CONTROLLER & API INTEGRATION TESTS
  // =========================================================================

  test('(d.1) POST /api/optimization/plan generates repair plan with selected/unselected breakdown', async () => {
    const res = await request(app)
      .post('/api/optimization/plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ budget: 30000 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.plan, 'Plan object must be returned');
    assert.strictEqual(res.body.plan.budget, 30000);
    assert.ok(Array.isArray(res.body.plan.selectedIssues), 'selectedIssues must be an array');
    assert.ok(Array.isArray(res.body.plan.unselectedIssues), 'unselectedIssues must be an array');
    assert.ok(res.body.plan.comparisons.knapsack, 'Comparisons must include Knapsack');
  });

  test('(d.2) Dynamic recompute: changing budget produces different optimal spend and selected counts', async () => {
    const resSmall = await request(app)
      .post('/api/optimization/plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ budget: 15000 });

    const resLarge = await request(app)
      .post('/api/optimization/plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ budget: 50000 });

    assert.strictEqual(resSmall.status, 200);
    assert.strictEqual(resLarge.status, 200);

    const smallSelectedCount = resSmall.body.plan.selectedIssues.length;
    const largeSelectedCount = resLarge.body.plan.selectedIssues.length;

    assert.ok(
      largeSelectedCount >= smallSelectedCount,
      `Higher budget must repair equal or more defects (${largeSelectedCount} >= ${smallSelectedCount})`
    );
    assert.ok(
      resLarge.body.plan.totalSpend >= resSmall.body.plan.totalSpend,
      'Higher budget allows greater or equal total spend'
    );
  });

  test('(d.3) GET /api/optimization/priority-analysis returns factor averages and safety override queue', async () => {
    const res = await request(app)
      .get('/api/optimization/priority-analysis')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.factorAverages), 'factorAverages must be an array');
    assert.strictEqual(res.body.factorAverages.length, 6, 'Must contain all 6 factor averages');
    assert.ok(res.body.priorityDistribution, 'priorityDistribution object must exist');
    assert.ok(typeof res.body.safetyOverrideCount === 'number', 'safetyOverrideCount must be a number');
    assert.ok(Array.isArray(res.body.safetyOverrideIssues), 'safetyOverrideIssues must be an array');
  });

  test('(d.4) POST /api/optimization/recalculate-priorities audits and updates all issues', async () => {
    const res = await request(app)
      .post('/api/optimization/recalculate-priorities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.updatedCount >= 4, 'Must recalculate priorities for seeded defects');

    // Verify database record has humanReadableReasons and formulaBreakdown saved
    const updatedIssue = await RoadIssue.findOne({ issueCode: 'ISSUE-TEST-OPT-1' });
    assert.ok(updatedIssue.priorityFactors.formulaBreakdown, 'formulaBreakdown must be stored in DB');
    assert.ok(Array.isArray(updatedIssue.priorityFactors.humanReadableReasons), 'humanReadableReasons must be stored in DB');
    assert.ok(updatedIssue.priorityFactors.humanReadableReasons.length > 0, 'humanReadableReasons must have items');
  });

  test('(d.5) Citizen cannot access optimization planning (RBAC protected)', async () => {
    const res = await request(app)
      .post('/api/optimization/plan')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ budget: 30000 });

    assert.strictEqual(res.status, 403, 'Citizen must be forbidden from accessing admin optimization');
  });
});
