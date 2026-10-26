/**
 * Explainable Multi-Criteria Priority Scoring Module (Spec Section 8)
 * 
 * Formula:
 * P = 0.25 * S + 0.20 * T + 0.15 * A + 0.25 * C + 0.10 * E + 0.05 * W
 * 
 * Normalized Criteria (all factors in [0, 100]):
 * 1. Defect Severity (S): Low: 25, Medium: 50, High: 75, Critical: 100
 * 2. Road Hierarchy / Traffic (T): Residential: 25, Collector: 50, Arterial: 75, Highway: 100
 * 3. Accident & Safety Risk (A): Base = 10 (Zero accidents != zero risk), Suspected*15, Documented*25, Confirmed*40, Injuries*20 (capped at 100)
 * 4. Public Complaint Density & Age (C): Reports count (log scale) + Days unresolved * 1.5 (capped at 100)
 * 5. Repair Cost Efficiency (E): Inverse normalized repair cost (lower cost per commuter = higher efficiency)
 * 6. Weather / Seasonal Vulnerability (W): Monsoon / freeze-thaw risk index (0 to 100)
 * 
 * Benchmark Calibration Case (Spec Section 8):
 * S=75, T=75, A=70, C=68, E=80, W=90
 * 0.25(75) + 0.20(75) + 0.15(70) + 0.25(68) + 0.10(80) + 0.05(90) = 18.75 + 15.00 + 10.50 + 17.00 + 8.00 + 4.50 = 73.75 exactly.
 */

export const PRIORITY_WEIGHTS = {
  DEFECT_SEVERITY: 0.25,
  ROAD_HIERARCHY: 0.20,
  ACCIDENT_SAFETY: 0.15,
  COMPLAINT_DENSITY: 0.25,
  COST_EFFICIENCY: 0.10,
  WEATHER_SEASON: 0.05,
};

export const DEFAULT_THRESHOLDS = {
  LOW: 40,
  MEDIUM: 40,
  HIGH: 70,
  CRITICAL: 85,
};

/**
 * Normalizes defect severity to 0-100 scale
 */
export function computeSeverityScore(severity = 'medium') {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 100;
    case 'high':
      return 75;
    case 'medium':
      return 50;
    case 'low':
    default:
      return 25;
  }
}

/**
 * Normalizes road hierarchy to 0-100 scale
 */
export function computeRoadHierarchyScore(roadClass = 'collector') {
  switch (roadClass?.toLowerCase()) {
    case 'highway':
      return 100;
    case 'arterial':
      return 75;
    case 'collector':
      return 50;
    case 'residential':
    default:
      return 25;
  }
}

/**
 * Normalizes accident & safety risk to 0-100 scale
 * Cardinal Rule: Zero accidents does NOT mean zero safety risk (Base = 10)
 */
export function computeAccidentSafetyScore(accidentCounts = {}) {
  if (!accidentCounts || typeof accidentCounts !== 'object') {
    return 10;
  }
  const suspectedCount = Number(accidentCounts.suspectedCount) || 0;
  const documentedCount = Number(accidentCounts.documentedCount) || 0;
  const confirmedCount = Number(accidentCounts.confirmedCount) || 0;
  const totalInjuries = Number(accidentCounts.totalInjuries) || 0;

  let score = 10; // Mandatory base safety risk
  score += suspectedCount * 15;
  score += documentedCount * 25;
  score += confirmedCount * 40;
  score += totalInjuries * 20;
  return Math.min(100, Math.max(10, score));
}

/**
 * Normalizes complaint density and age to 0-100 scale
 */
export function computeComplaintDensityScore({ reportsCount = 1, daysOpen = 0 } = {}) {
  let countScore = 20;
  if (reportsCount >= 10) {
    countScore = 90;
  } else if (reportsCount >= 6) {
    countScore = 75;
  } else if (reportsCount >= 4) {
    countScore = 60;
  } else if (reportsCount >= 2) {
    countScore = 40;
  }

  const ageScore = Math.min(30, daysOpen * 1.5);
  return Math.min(100, countScore + ageScore);
}

/**
 * Normalizes repair cost efficiency (inverse scale: lower cost = higher score)
 */
export function computeCostEfficiencyScore(estimatedCost = 1500) {
  // Benchmark standard repair: $500-$4500
  const normalized = Math.round(100 - ((estimatedCost - 500) / 45));
  return Math.min(100, Math.max(10, normalized));
}

/**
 * Evaluates weather / seasonal vulnerability (0-100)
 */
export function computeWeatherSeasonScore(condition = 'monsoon') {
  switch (condition?.toLowerCase()) {
    case 'monsoon':
    case 'extreme_rain':
      return 90;
    case 'freeze_thaw':
    case 'winter':
      return 75;
    case 'rain':
      return 60;
    case 'dry':
    default:
      return 30;
  }
}

/**
 * Calculates Explainable Multi-Criteria Priority Score
 * 
 * @param {Object} params
 * @returns {Object} score, priorityLevel, safetyOverride, reasons, formulaBreakdown
 */
export function calculatePriorityScore({
  defectSeverityScore = 50,
  roadHierarchyScore = 50,
  accidentSafetyScore = 10,
  complaintDensityScore = 20,
  costEfficiencyScore = 50,
  weatherSeasonScore = 30,
  // Escalation flags
  isCriticalDamageOnMajorRoad = false,
  hasConfirmedAccidents = false,
  thresholds = DEFAULT_THRESHOLDS,
  weights = PRIORITY_WEIGHTS,
} = {}) {
  // Normalize each factor to 0-100
  const S = Math.max(0, Math.min(100, defectSeverityScore));
  const T = Math.max(0, Math.min(100, roadHierarchyScore));
  const A = Math.max(0, Math.min(100, accidentSafetyScore));
  const C = Math.max(0, Math.min(100, complaintDensityScore));
  const E = Math.max(0, Math.min(100, costEfficiencyScore));
  const W = Math.max(0, Math.min(100, weatherSeasonScore));

  const weightedScore =
    weights.DEFECT_SEVERITY * S +
    weights.ROAD_HIERARCHY * T +
    weights.ACCIDENT_SAFETY * A +
    weights.COMPLAINT_DENSITY * C +
    weights.COST_EFFICIENCY * E +
    weights.WEATHER_SEASON * W;

  const rawScore = Math.round(weightedScore * 100) / 100;

  // Safety Escalation Override
  let safetyOverride = false;
  let safetyOverrideReason = '';

  if (hasConfirmedAccidents) {
    safetyOverride = true;
    safetyOverrideReason = 'SAFETY OVERRIDE (Confirmed Accident Causation): Vehicular collision causality officially confirmed.';
  } else if (isCriticalDamageOnMajorRoad) {
    safetyOverride = true;
    safetyOverrideReason = 'SAFETY OVERRIDE (Corridor Hazard Override): Critical defect on arterial or highway corridor.';
  }

  const score = safetyOverride ? Math.max(90, rawScore) : rawScore;

  // Determine Level with configurable thresholds
  const criticalCutoff = thresholds.CRITICAL ?? thresholds.critical ?? 85;
  const highCutoff = thresholds.HIGH ?? thresholds.high ?? 70;
  const mediumCutoff = thresholds.MEDIUM ?? thresholds.medium ?? 40;
  const lowCutoff = thresholds.LOW ?? thresholds.low ?? 0;

  let priorityLevel = 'LOW';
  if (safetyOverride || score >= criticalCutoff) {
    priorityLevel = 'CRITICAL';
  } else if (score >= highCutoff) {
    priorityLevel = 'HIGH';
  } else if (score >= mediumCutoff) {
    priorityLevel = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
  }

  const formulaBreakdown =
    `P = ${weights.DEFECT_SEVERITY}(${S}) + ${weights.ROAD_HIERARCHY}(${T}) + ${weights.ACCIDENT_SAFETY}(${A}) + ${weights.COMPLAINT_DENSITY}(${C}) + ${weights.COST_EFFICIENCY}(${E}) + ${weights.WEATHER_SEASON}(${W}) = ${score}`;

  // Human-readable explanatory reasons
  const humanReadableReasons = [];

  if (safetyOverride) {
    humanReadableReasons.push(`🚨 MANDATORY SAFETY OVERRIDE: ${safetyOverrideReason}`);
  }

  if (S >= 75) {
    humanReadableReasons.push(`High defect severity hazard rating (${S}/100) contributes ${(weights.DEFECT_SEVERITY * S).toFixed(2)} pts.`);
  } else {
    humanReadableReasons.push(`Defect severity rated at ${S}/100 (+${(weights.DEFECT_SEVERITY * S).toFixed(2)} pts).`);
  }

  if (T >= 75) {
    humanReadableReasons.push(`High commuter traffic transit corridor / arterial road class (${T}/100) contributes ${(weights.ROAD_HIERARCHY * T).toFixed(2)} pts.`);
  }

  if (A > 10) {
    humanReadableReasons.push(`Elevated vehicular accident history (${A}/100) contributes ${(weights.ACCIDENT_SAFETY * A).toFixed(2)} pts.`);
  } else {
    humanReadableReasons.push(`Base municipal road safety risk factor applied (10/100, zero accidents does not mean zero safety risk).`);
  }

  if (C >= 50) {
    humanReadableReasons.push(`High citizen complaint density and unresolved duration (${C}/100) contributes ${(weights.COMPLAINT_DENSITY * C).toFixed(2)} pts.`);
  }

  if (E >= 70) {
    humanReadableReasons.push(`Favorable repair cost-efficiency profile (${E}/100) provides +${(weights.COST_EFFICIENCY * E).toFixed(2)} pts.`);
  }

  if (W >= 70) {
    humanReadableReasons.push(`Seasonal weather vulnerability / monsoon wash-out risk (${W}/100) adds +${(weights.WEATHER_SEASON * W).toFixed(2)} pts.`);
  }

  return {
    score,
    priorityLevel,
    safetyOverride,
    safetyOverrideReason,
    thresholds: { low: lowCutoff, medium: mediumCutoff, high: highCutoff, critical: criticalCutoff },
    factors: {
      defectSeverityScore: S,
      roadHierarchyScore: T,
      accidentSafetyScore: A,
      complaintDensityScore: C,
      costEfficiencyScore: E,
      weatherSeasonScore: W,
      formulaBreakdown,
    },
    humanReadableReasons,
  };
}
