/**
 * Duplicate Detection Algorithm Module
 * 
 * Determines whether an incoming citizen complaint corresponds to an
 * existing RoadIssue or another Report based on:
 * - Distance delta (default <= 30m radius)
 * - Damage type equality
 * - Description similarity (Jaccard / Token-overlap)
 * - Temporal proximity
 */

import { calculateHaversineDistance } from './locationVerification.js';

/**
 * Calculates token-based Jaccard similarity between two text strings.
 */
export function calculateTextSimilarity(text1 = '', text2 = '') {
  const tokenize = (str) =>
    new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const set1 = tokenize(text1);
  const set2 = tokenize(text2);

  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return Math.round((intersection.size / union.size) * 100) / 100;
}

/**
 * Calculates duplicate confidence score (0 to 100).
 * 
 * @param {Object} report1 - { coordinates: [lng, lat], damageType, description, createdAt }
 * @param {Object} report2 - { coordinates: [lng, lat], damageType, description, createdAt }
 * @param {number} [maxRadiusMeters=30]
 * @returns {Object} { confidence: number, isDuplicate: boolean, autoLink: boolean, reasons: string[] }
 */
export function calculateDuplicateConfidence(report1, report2, maxRadiusMeters = 30) {
  const [lng1, lat1] = report1.coordinates;
  const [lng2, lat2] = report2.coordinates;

  const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);

  const reasons = [];

  // Out of radius immediately drops duplicate probability
  if (distance > maxRadiusMeters) {
    return {
      confidence: 0,
      isDuplicate: false,
      autoLink: false,
      distanceMeters: distance,
      reasons: [`Distance (${distance}m) exceeds duplicate search radius (${maxRadiusMeters}m).`],
    };
  }

  // Distance weight (up to 35 pts per spec)
  const distanceScore = Math.max(0, 35 * (1 - distance / maxRadiusMeters));
  reasons.push(`Distance proximity: ${distance.toFixed(1)}m (+${distanceScore.toFixed(0)} pts)`);

  // Damage type weight (35 pts per spec)
  let damageScore = 0;
  if (report1.damageType === report2.damageType) {
    damageScore = 35;
    reasons.push(`Identical damage type (${report1.damageType}) (+35 pts)`);
  } else {
    reasons.push(`Differing damage types: ${report1.damageType} vs ${report2.damageType}`);
  }

  // Text similarity weight (20 pts)
  const textSim = calculateTextSimilarity(report1.description, report2.description);
  const textScore = Math.round(textSim * 20);
  reasons.push(`Description similarity: ${(textSim * 100).toFixed(0)}% (+${textScore} pts)`);

  // Temporal proximity weight (10 pts)
  let timeScore = 10;
  if (report1.createdAt && report2.createdAt) {
    const diffDays = Math.abs(new Date(report1.createdAt) - new Date(report2.createdAt)) / (1000 * 3600 * 24);
    if (diffDays <= 7) {
      timeScore = 10;
      reasons.push(`Reported within ${diffDays.toFixed(1)} days (+10 pts)`);
    } else if (diffDays <= 30) {
      timeScore = 5;
      reasons.push(`Reported within ${diffDays.toFixed(1)} days (+5 pts)`);
    } else {
      timeScore = 0;
    }
  }

  const confidence = Math.min(100, Math.round(distanceScore + damageScore + textScore + timeScore));
  const autoLink = confidence >= 80;
  const isDuplicate = confidence >= 50;

  return {
    confidence,
    isDuplicate,
    autoLink,
    distanceMeters: distance,
    reasons,
  };
}
