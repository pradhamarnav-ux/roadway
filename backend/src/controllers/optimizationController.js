import { RoadIssue } from '../models/RoadIssue.js';
import { optimizeRepairPlan } from '../algorithms/repairOptimization.js';
import {
  calculatePriorityScore,
  computeSeverityScore,
  computeRoadHierarchyScore,
  computeAccidentSafetyScore,
  computeComplaintDensityScore,
  computeCostEfficiencyScore,
  computeWeatherSeasonScore,
  DEFAULT_THRESHOLDS,
} from '../algorithms/priorityScoring.js';

/**
 * @desc    Generate optimized 0/1 Knapsack repair plan comparing against baseline heuristics
 * @route   POST /api/optimization/plan
 * @access  Private (Admin / Inspector)
 */
export const generateRepairPlan = async (req, res) => {
  try {
    const { budget = 50000, roadClass } = req.body;
    const filter = {
      status: { $in: ['VERIFIED', 'SCHEDULED', 'REPORTED'] },
    };

    if (roadClass) {
      filter.roadClass = roadClass;
    }

    const issues = await RoadIssue.find(filter).lean();

    const plan = optimizeRepairPlan({
      issues,
      budget: Number(budget) || 50000,
    });

    return res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Error generating repair plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate budget repair plan.',
      details: error.message,
    });
  }
};

/**
 * @desc    Apply optimization plan: schedule selected defects
 * @route   POST /api/optimization/apply
 * @access  Private (Admin)
 */
export const applyRepairPlan = async (req, res) => {
  try {
    const { selectedIssueIds = [], scheduledDate } = req.body;

    if (!Array.isArray(selectedIssueIds) || selectedIssueIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one road issue ID to schedule.',
      });
    }

    const date = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 7 * 86400000); // 1 week out

    const result = await RoadIssue.updateMany(
      { _id: { $in: selectedIssueIds } },
      {
        $set: {
          status: 'SCHEDULED',
          scheduledDate: date,
        },
      }
    );

    return res.json({
      success: true,
      message: `Successfully scheduled ${result.modifiedCount} road defects for municipal repair work.`,
      scheduledCount: result.modifiedCount,
      scheduledDate: date,
    });
  } catch (error) {
    console.error('Error applying repair plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply repair plan.',
      details: error.message,
    });
  }
};

/**
 * @desc    Get priority factor analytics & distribution for Recharts visualization
 * @route   GET /api/optimization/priority-analysis
 * @access  Private (Admin / Inspector)
 */
export const getPriorityAnalysis = async (req, res) => {
  try {
    const issues = await RoadIssue.find({}).sort({ priorityScore: -1 }).lean();

    const priorityDistribution = {
      CRITICAL: issues.filter((i) => i.priorityLevel === 'CRITICAL' || i.safetyOverride).length,
      HIGH: issues.filter((i) => i.priorityLevel === 'HIGH' && !i.safetyOverride).length,
      MEDIUM: issues.filter((i) => i.priorityLevel === 'MEDIUM' && !i.safetyOverride).length,
      LOW: issues.filter((i) => i.priorityLevel === 'LOW' && !i.safetyOverride).length,
    };

    const safetyOverrideCount = issues.filter((i) => i.safetyOverride).length;

    // Average 6 normalized factor scores for radar & bar charts
    let sumS = 0;
    let sumT = 0;
    let sumA = 0;
    let sumC = 0;
    let sumE = 0;
    let sumW = 0;
    const count = issues.length || 1;

    for (const issue of issues) {
      const f = issue.priorityFactors || {};
      sumS += f.defectSeverityScore || computeSeverityScore(issue.severity);
      sumT += f.roadHierarchyScore || computeRoadHierarchyScore(issue.roadClass);
      sumA += f.accidentSafetyScore || computeAccidentSafetyScore(issue.accidentCounts);
      sumC += f.complaintDensityScore || computeComplaintDensityScore({ reportsCount: issue.reportsCount });
      sumE += f.costEfficiencyScore || computeCostEfficiencyScore(issue.estimatedCost);
      sumW += f.weatherSeasonScore || 50;
    }

    const factorAverages = [
      { factor: 'Defect Severity (S)', weight: 0.25, average: Math.round(sumS / count) },
      { factor: 'Road Hierarchy (T)', weight: 0.20, average: Math.round(sumT / count) },
      { factor: 'Accident Safety (A)', weight: 0.15, average: Math.round(sumA / count) },
      { factor: 'Complaint Density (C)', weight: 0.25, average: Math.round(sumC / count) },
      { factor: 'Cost Efficiency (E)', weight: 0.10, average: Math.round(sumE / count) },
      { factor: 'Weather Vulnerability (W)', weight: 0.05, average: Math.round(sumW / count) },
    ];

    const safetyOverrideIssues = issues.filter((i) => i.safetyOverride).map((i) => ({
      _id: i._id,
      issueCode: i.issueCode,
      title: i.title,
      severity: i.severity,
      roadClass: i.roadClass,
      priorityScore: i.priorityScore,
      safetyOverrideReason: i.safetyOverrideReason,
    }));

    return res.json({
      success: true,
      totalIssues: issues.length,
      safetyOverrideCount,
      priorityDistribution,
      factorAverages,
      safetyOverrideIssues,
      topPriorityIssues: issues.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fetching priority analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve priority factor analysis.',
    });
  }
};

/**
 * @desc    Recalculate priorities across all road defects with explainable breakdown
 * @route   POST /api/optimization/recalculate-priorities
 * @access  Private (Admin)
 */
export const recalculateAllPriorities = async (req, res) => {
  try {
    const { thresholds } = req.body;
    const issues = await RoadIssue.find({});

    let updatedCount = 0;

    for (const issue of issues) {
      const daysOpen = Math.max(
        0,
        Math.round((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      const S = computeSeverityScore(issue.severity);
      const T = computeRoadHierarchyScore(issue.roadClass);
      const A = computeAccidentSafetyScore(issue.accidentCounts);
      const C = computeComplaintDensityScore({ reportsCount: issue.reportsCount, daysOpen });
      const E = computeCostEfficiencyScore(issue.estimatedCost);
      const W = computeWeatherSeasonScore('monsoon');

      const isCriticalDamageOnMajorRoad =
        issue.severity === 'critical' &&
        (issue.roadClass === 'arterial' || issue.roadClass === 'highway');

      const hasConfirmedAccidents = (issue.accidentCounts?.confirmedCount || 0) > 0;

      const calc = calculatePriorityScore({
        defectSeverityScore: S,
        roadHierarchyScore: T,
        accidentSafetyScore: A,
        complaintDensityScore: C,
        costEfficiencyScore: E,
        weatherSeasonScore: W,
        isCriticalDamageOnMajorRoad,
        hasConfirmedAccidents,
        thresholds: thresholds || DEFAULT_THRESHOLDS,
      });

      issue.priorityScore = calc.score;
      issue.priorityLevel = calc.priorityLevel;
      issue.safetyOverride = calc.safetyOverride;
      issue.safetyOverrideReason = calc.safetyOverrideReason;
      issue.priorityFactors = {
        defectSeverityScore: S,
        roadHierarchyScore: T,
        accidentSafetyScore: A,
        complaintDensityScore: C,
        costEfficiencyScore: E,
        weatherSeasonScore: W,
        formulaBreakdown: calc.factors.formulaBreakdown,
        humanReadableReasons: calc.humanReadableReasons,
      };

      await issue.save();
      updatedCount++;
    }

    return res.json({
      success: true,
      message: `Successfully recalculated priorities for ${updatedCount} road defects.`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error recalculating priorities:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to recalculate defect priorities.',
    });
  }
};
