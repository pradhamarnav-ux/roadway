/**
 * Repair Plan Budget Optimization Module (Spec Section 9)
 * 
 * Formulated as a 0/1 Knapsack Optimization Problem:
 * Maximize: Sum(ModeledBenefit_i * x_i)
 * Subject to: Sum(Cost_i * x_i) <= Budget
 * Where: x_i in {0, 1}
 * 
 * Modeled Benefit Formula:
 * ModeledBenefit_i = Math.round(PriorityScore_i * TrafficMultiplier_i)
 * 
 * Traffic Multipliers:
 * - Highway / Transit Corridor: 1.50
 * - Arterial Road:              1.25
 * - Collector Road:             1.10
 * - Residential Street:         1.00
 * 
 * Ethical Constraint & Metric Labelling:
 * Modeled benefit is strictly labeled as "modeled benefit" (or "Modeled Priority Benefit"),
 * and NEVER misrepresented as "lives saved".
 * 
 * Mandatory Constraints:
 * 1. Only VERIFIED road issues are eligible for municipal budget repair scheduling.
 * 2. Critical-safety defects (safetyOverride == true or confirmed accident) are MANDATORY (x_i = 1).
 * 3. If mandatory defects exceed the budget, an Infeasibility Warning is returned with
 *    the emergency deficit required.
 */

export const TRAFFIC_MULTIPLIERS = {
  highway: 1.50,
  arterial: 1.25,
  collector: 1.10,
  residential: 1.00,
  local: 1.00,
};

export function getTrafficMultiplier(roadClass = 'collector') {
  return TRAFFIC_MULTIPLIERS[roadClass?.toLowerCase()] || 1.00;
}

/**
 * Computes modeled benefit for a road defect
 * Formula: round(priorityScore * trafficMultiplier)
 */
export function calculateModeledBenefit(scoreOrIssue = 50, roadClass = 'collector') {
  if (typeof scoreOrIssue === 'object' && scoreOrIssue !== null) {
    const score = Number(scoreOrIssue.priorityScore) || 50;
    const rClass = scoreOrIssue.roadClass || roadClass || 'collector';
    const multiplier = TRAFFIC_MULTIPLIERS[rClass.toLowerCase()] || 1.00;
    return Math.round(score * multiplier);
  }
  const score = Number(scoreOrIssue) || 50;
  const multiplier = TRAFFIC_MULTIPLIERS[(roadClass || 'collector').toLowerCase()] || 1.00;
  return Math.round(score * multiplier);
}

/**
 * Exact 0/1 Knapsack Optimizer with Mandatory Safety Overrides
 * 
 * @param {Object} params
 * @param {Array<Object>} params.issues - List of road issues
 * @param {number} params.budget - Total available municipal budget in USD
 * @returns {Object} Optimized repair plan, metrics, and heuristic comparisons
 */
export function optimizeRepairPlan({ issues = [], budget = 50000 }) {
  const numericBudget = Math.max(0, Number(budget) || 0);

  // 1. Eligibility Check: ONLY verified defects are eligible for repair budget scheduling
  const eligibleIssues = [];
  const ineligibleIssues = [];

  for (const issue of issues) {
    const status = (issue.status || '').toUpperCase();
    if (status === 'VERIFIED' || status === 'SCHEDULED') {
      eligibleIssues.push(issue);
    } else {
      ineligibleIssues.push({
        ...issue,
        _id: issue._id ? issue._id.toString() : issue.issueCode,
        deferralReason: `Deferred (Unverified Defect): Defect status is ${issue.status || 'UNVERIFIED'}. Only verified defects are eligible for municipal repair budget scheduling.`,
        selectionReason: `Deferred (Unverified Defect): Defect status is ${issue.status || 'UNVERIFIED'}. Only verified defects are eligible for municipal repair budget scheduling.`,
      });
    }
  }

  const mandatoryIssues = [];
  const optionalIssues = [];

  for (const item of eligibleIssues) {
    const cost = Math.max(100, Math.round(Number(item.estimatedCost) || 1500));
    const trafficMultiplier = TRAFFIC_MULTIPLIERS[item.roadClass?.toLowerCase()] || 1.00;
    const priorityScore = Number(item.priorityScore) || 50;
    const modeledBenefit = Math.round(priorityScore * trafficMultiplier);

    const enriched = {
      ...item,
      _id: item._id ? item._id.toString() : item.issueCode,
      issueCode: item.issueCode || 'DEFECT',
      title: item.title || 'Road Defect',
      cost,
      priorityScore,
      priorityLevel: item.priorityLevel || (priorityScore >= 80 ? 'CRITICAL' : priorityScore >= 60 ? 'HIGH' : 'MEDIUM'),
      roadClass: item.roadClass || 'collector',
      trafficMultiplier,
      modeledBenefit,
      safetyOverride: Boolean(item.safetyOverride),
      reportsCount: item.reportsCount || 1,
      createdAt: item.createdAt || new Date().toISOString(),
    };

    if (item.safetyOverride) {
      mandatoryIssues.push({
        ...enriched,
        selectionReason: `Mandatory Public Safety Constraint: ${item.safetyOverrideReason || 'Critical defect or confirmed collision safety override'}`,
      });
    } else {
      optionalIssues.push(enriched);
    }
  }

  // 2. Process Mandatory Safety Items First
  const mandatoryCost = mandatoryIssues.reduce((sum, i) => sum + i.cost, 0);
  const mandatoryBenefit = mandatoryIssues.reduce((sum, i) => sum + i.modeledBenefit, 0);

  let remainingBudget = numericBudget - mandatoryCost;
  let isInfeasible = false;
  let deficitRequired = 0;
  let infeasibilityWarning = '';

  if (remainingBudget < 0) {
    isInfeasible = true;
    deficitRequired = Math.abs(remainingBudget);
    infeasibilityWarning = `INSUFFICIENT BUDGET FOR CRITICAL SAFETY OVERRIDES: Mandatory public-safety defects ($${mandatoryCost.toLocaleString()}) exceed the total available municipal budget ($${numericBudget.toLocaleString()}). An emergency supplemental appropriation of $${deficitRequired.toLocaleString()} is required.`;
    remainingBudget = 0;
  }

  // 3. Exact 0/1 Knapsack Optimization via Dynamic Programming on Optional Items
  const selectedOptional = [];
  const unselectedOptional = [];

  if (optionalIssues.length > 0 && remainingBudget > 0) {
    // Exact GCD calculation for integer knapsack
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    let step = optionalIssues.reduce((g, c) => gcd(g, c.cost), Math.round(remainingBudget));
    if (step < 1) step = 1;
    let capacity = Math.floor(remainingBudget / step);
    if (capacity > 50000) {
      step = Math.ceil(remainingBudget / 50000);
      capacity = Math.floor(remainingBudget / step);
    }

    const n = optionalIssues.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(capacity + 1));

    for (let i = 1; i <= n; i++) {
      const item = optionalIssues[i - 1];
      const itemWeight = Math.ceil(item.cost / step);
      const itemVal = item.modeledBenefit;

      for (let w = 0; w <= capacity; w++) {
        if (itemWeight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - itemWeight] + itemVal);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    // Backtrack to find exact selected items
    let w = capacity;
    const selectedIds = new Set();
    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        const item = optionalIssues[i - 1];
        selectedIds.add(item._id);
        w -= Math.ceil(item.cost / step);
      }
    }

    let runningSpend = 0;
    for (const item of optionalIssues) {
      if (selectedIds.has(item._id)) {
        runningSpend += item.cost;
        selectedOptional.push({
          ...item,
          selectionReason: `Selected by 0/1 Knapsack Optimizer: High modeled benefit density (${(item.modeledBenefit / (item.cost / 1000)).toFixed(2)} benefit/$k).`,
        });
      } else {
        const canFit = (remainingBudget - runningSpend) >= item.cost;
        const reason = canFit
          ? `Deferred: Lower modeled benefit-to-cost density than competing repair candidates.`
          : `Deferred: Exceeds remaining budget capacity ($${item.cost.toLocaleString()} cost vs $${Math.max(0, remainingBudget - runningSpend).toLocaleString()} remaining).`;
        unselectedOptional.push({
          ...item,
          selectionReason: reason,
          deferralReason: reason,
        });
      }
    }
  } else {
    // If no remaining budget for optional items, all optional items are unselected
    for (const item of optionalIssues) {
      const reason = isInfeasible
        ? 'Deferred: Budget fully exhausted by mandatory critical safety overrides.'
        : `Deferred: Exceeds available budget ($${item.cost.toLocaleString()} cost vs $${remainingBudget.toLocaleString()} available).`;
      unselectedOptional.push({
        ...item,
        selectionReason: reason,
        deferralReason: reason,
      });
    }
  }

  // Combine selections
  const selectedIssues = [...mandatoryIssues, ...selectedOptional];
  const unselectedIssues = [...unselectedOptional, ...ineligibleIssues];

  const totalCost = selectedIssues.reduce((sum, item) => sum + item.cost, 0);
  const totalBenefit = selectedIssues.reduce((sum, item) => sum + item.modeledBenefit, 0);
  const remainingFunds = Math.max(0, numericBudget - totalCost);
  const budgetUtilization = numericBudget > 0 ? Math.min(100, Math.round((totalCost / numericBudget) * 100)) : 0;

  // 4. Comparison Baselines against Standard Municipal Heuristics (Spec Section 9)
  const comparisons = {
    knapsack: {
      id: 'knapsack',
      name: 'RoadWise Knapsack (Optimal)',
      totalCost,
      totalBenefit,
      issuesRepaired: selectedIssues.length,
      utilizationPercent: budgetUtilization,
      unaddressedCriticalCount: unselectedIssues.filter((i) => i.priorityLevel === 'CRITICAL').length,
      description: 'Exact 0/1 Knapsack optimization maximizing modeled benefit subject to safety overrides.',
    },
    fcfs: computeHeuristic(
      eligibleIssues,
      numericBudget,
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      'First-Come, First-Served (FCFS)',
      'Oldest reported citizen complaints scheduled first until budget is exhausted.'
    ),
    complaints: computeHeuristic(
      eligibleIssues,
      numericBudget,
      (a, b) => (b.reportsCount || 1) - (a.reportsCount || 1),
      'Highest Complaints First',
      'Defects with the highest citizen complaint density scheduled first.'
    ),
    greedy: computeHeuristic(
      eligibleIssues,
      numericBudget,
      (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0),
      'Highest Priority First (Greedy)',
      'Selects strictly descending priority score without cost-density consideration.'
    ),
    greedyPriority: computeHeuristic(
      eligibleIssues,
      numericBudget,
      (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0),
      'Highest Priority First (Greedy)',
      'Selects strictly descending priority score without cost-density consideration.'
    ),
  };

  return {
    budget: numericBudget,
    totalCost,
    totalSpend: totalCost,
    totalBenefit,
    benefitMetricName: 'modeled benefit',
    benefitLabel: 'Modeled Priority Benefit',
    modelDocumentation: 'Modeled Benefit Formula: ModeledBenefit_i = Math.round(PriorityScore_i * TrafficMultiplier_i). Labeled strictly as modeled benefit.',
    remainingFunds,
    remainingBudget: remainingFunds,
    budgetUtilization,
    infeasible: isInfeasible,
    isInfeasible,
    budgetDeficit: deficitRequired,
    deficitRequired,
    warning: infeasibilityWarning,
    infeasibilityWarning,
    emergencyProcedureRequired: isInfeasible,
    mandatoryCount: mandatoryIssues.length,
    mandatorySelectedCount: mandatoryIssues.length,
    selectedCount: selectedIssues.length,
    unselectedCount: unselectedIssues.length,
    selectedIssues,
    unselectedIssues,
    comparisons,
  };
}

/**
 * Computes a baseline municipal repair heuristic for benchmarking
 */
function computeHeuristic(issues, budget, sortComparator, name, description) {
  const sorted = [...issues].sort(sortComparator);
  let spend = 0;
  let benefit = 0;
  let count = 0;
  const selected = [];
  const unselected = [];

  for (const item of sorted) {
    const cost = Math.max(100, Math.round(Number(item.estimatedCost) || 1500));
    const trafficMultiplier = TRAFFIC_MULTIPLIERS[item.roadClass?.toLowerCase()] || 1.00;
    const priorityScore = Number(item.priorityScore) || 50;
    const itemBenefit = Math.round(priorityScore * trafficMultiplier);

    if (spend + cost <= budget) {
      spend += cost;
      benefit += itemBenefit;
      count++;
      selected.push(item);
    } else {
      unselected.push(item);
    }
  }

  const utilizationPercent = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;
  const unaddressedCriticalCount = unselected.filter(
    (i) => i.safetyOverride || i.priorityLevel === 'CRITICAL' || (i.priorityScore || 0) >= 80
  ).length;

  return {
    name,
    description,
    totalCost: spend,
    totalBenefit: benefit,
    issuesRepaired: count,
    utilizationPercent,
    unaddressedCriticalCount,
  };
}

/**
 * Solves standard 0/1 Knapsack via dynamic programming without mandatory safety overrides
 * Used for generic optimization tasks and testing verification
 */
export function solve01KnapsackDP(params = {}) {
  const candidates = params.candidates || params.issues || [];
  const budget = params.budget || 50000;
  const n = candidates.length;

  if (n === 0 || budget <= 0) {
    return {
      totalCost: 0,
      totalBenefit: 0,
      remainingBudget: budget,
      selected: [],
      selectedIssues: [],
    };
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let step = candidates.reduce((g, c) => gcd(g, Math.round(Number(c.cost ?? c.estimatedCost) || 0)), Math.round(budget));
  if (step < 1) step = 1;
  let capacity = Math.floor(budget / step);
  if (capacity > 50000) {
    step = Math.ceil(budget / 50000);
    capacity = Math.floor(budget / step);
  }

  const dp = Array.from({ length: n + 1 }, () => new Int32Array(capacity + 1));

  for (let i = 1; i <= n; i++) {
    const item = candidates[i - 1];
    const cost = Math.round(Number(item.cost ?? item.estimatedCost) || 0);
    const itemWeight = Math.ceil(cost / step);
    const itemVal = Math.round(Number(item.benefit ?? item.modeledBenefit) || 0);

    for (let w = 0; w <= capacity; w++) {
      if (itemWeight <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - itemWeight] + itemVal);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  let w = capacity;
  const selected = [];
  let totalCost = 0;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      const item = candidates[i - 1];
      selected.unshift(item);
      const cost = Math.round(Number(item.cost ?? item.estimatedCost) || 0);
      totalCost += cost;
      w -= Math.ceil(cost / step);
    }
  }

  return {
    totalCost,
    totalBenefit: dp[n][capacity],
    remainingBudget: Math.max(0, budget - totalCost),
    selected,
    selectedIssues: selected,
  };
}

/**
 * Brute-force 0/1 Knapsack solver for testing verification on small cases (2^N search)
 * Used to mathematically verify that the DP algorithm achieves the absolute global optimum.
 */
export function bruteForceKnapsack(params = {}) {
  const issues = params.candidates || params.issues || [];
  const budget = params.budget || 50000;
  const n = issues.length;

  if (n > 18) {
    throw new Error('Brute-force check only supported for N <= 18 items to prevent CPU freeze.');
  }

  let bestBenefit = -1;
  let bestCost = 0;
  let bestMask = 0;

  const totalCombinations = 1 << n; // 2^N

  for (let mask = 0; mask < totalCombinations; mask++) {
    let currentCost = 0;
    let currentBenefit = 0;
    let valid = true;

    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        const item = issues[i];
        const cost = item.cost !== undefined
          ? Math.round(Number(item.cost))
          : Math.max(100, Math.round(Number(item.estimatedCost) || 1500));
        
        let itemBenefit = 0;
        if (item.benefit !== undefined) {
          itemBenefit = Math.round(Number(item.benefit));
        } else {
          const trafficMultiplier = TRAFFIC_MULTIPLIERS[item.roadClass?.toLowerCase()] || 1.00;
          itemBenefit = Math.round((item.priorityScore || 50) * trafficMultiplier);
        }

        currentCost += cost;
        currentBenefit += itemBenefit;

        if (currentCost > budget) {
          valid = false;
          break;
        }
      }
    }

    if (valid && currentBenefit > bestBenefit) {
      bestBenefit = currentBenefit;
      bestCost = currentCost;
      bestMask = mask;
    }
  }

  const selectedIssues = [];
  for (let i = 0; i < n; i++) {
    if ((bestMask & (1 << i)) !== 0) {
      selectedIssues.push(issues[i]);
    }
  }

  return {
    totalBenefit: bestBenefit,
    bestBenefit,
    totalCost: bestCost,
    bestCost,
    selectedCount: selectedIssues.length,
    selectedIssues,
    selected: selectedIssues,
  };
}
