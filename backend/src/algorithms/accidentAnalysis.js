/**
 * Accident Analysis & Attribution Module
 * 
 * Safety & Honesty Constraint:
 * Nearby accidents are NEVER automatically counted as pothole-caused.
 * Accidents are segregated into 4 ethical tiers:
 * 1. NEARBY_ACCIDENT (Within 50m spatial/temporal buffer, no causation established)
 * 2. SUSPECTED_CONTRIBUTION (Anecdotal or preliminary claim)
 * 3. DOCUMENTED_CONTRIBUTION (Official incident report identifies defect)
 * 4. CONFIRMED_CONTRIBUTION (Forensic municipal engineering sign-off)
 */

export const ATTRIBUTION_TIERS = {
  NEARBY_ACCIDENT: 'NEARBY_ACCIDENT',
  SUSPECTED_CONTRIBUTION: 'SUSPECTED_CONTRIBUTION',
  DOCUMENTED_CONTRIBUTION: 'DOCUMENTED_CONTRIBUTION',
  CONFIRMED_CONTRIBUTION: 'CONFIRMED_CONTRIBUTION',
};

export const ACCIDENT_VERIFICATION_STATUSES = {
  UNVERIFIED: 'UNVERIFIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
};

/**
 * Aggregates accident metrics for a road issue.
 * 
 * @param {Array<Object>} accidents - List of accident records
 * @returns {Object} { nearbyCount, suspectedCount, documentedCount, confirmedCount, totalInjuries, safetyRiskScore }
 */
export function aggregateAccidentMetrics(accidents = []) {
  let nearbyCount = 0;
  let suspectedCount = 0;
  let documentedCount = 0;
  let confirmedCount = 0;
  let totalInjuries = 0;

  for (const acc of accidents) {
    // If the accident record was rejected/fraudulent, skip it from attribution
    if (acc.verificationStatus === ACCIDENT_VERIFICATION_STATUSES.REJECTED) {
      continue;
    }

    if (acc.attributionTier === ATTRIBUTION_TIERS.NEARBY_ACCIDENT) {
      nearbyCount++;
    } else if (acc.attributionTier === ATTRIBUTION_TIERS.SUSPECTED_CONTRIBUTION) {
      suspectedCount++;
    } else if (acc.attributionTier === ATTRIBUTION_TIERS.DOCUMENTED_CONTRIBUTION) {
      documentedCount++;
    } else if (acc.attributionTier === ATTRIBUTION_TIERS.CONFIRMED_CONTRIBUTION) {
      confirmedCount++;
    }

    if (acc.attributionTier !== ATTRIBUTION_TIERS.NEARBY_ACCIDENT) {
      totalInjuries += acc.injuriesCount || 0;
    }
  }

  // Base safety risk starts at 10 (zero accidents does NOT mean zero safety risk)
  let safetyRiskScore = 10;
  safetyRiskScore += suspectedCount * 15;
  safetyRiskScore += documentedCount * 25;
  safetyRiskScore += confirmedCount * 40;
  safetyRiskScore += totalInjuries * 20;

  safetyRiskScore = Math.min(100, safetyRiskScore);

  return {
    nearbyCount,
    suspectedCount,
    documentedCount,
    confirmedCount,
    totalInjuries,
    safetyRiskScore,
  };
}
