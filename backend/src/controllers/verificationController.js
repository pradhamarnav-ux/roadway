import { Report } from '../models/Report.js';
import { RoadIssue } from '../models/RoadIssue.js';
import { calculateDuplicateConfidence } from '../algorithms/duplicateDetection.js';
import { calculateHaversineDistance, evaluateLocationEvidence } from '../algorithms/locationVerification.js';
import { awardReportVerificationPoints } from '../algorithms/rewardEngine.js';
import crypto from 'crypto';

/**
 * Generate unique RoadIssue code (e.g. ISSUE-2026-X1Y2)
 */
function generateIssueCode() {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ISSUE-2026-${hex}`;
}

/**
 * @desc    Get reports in verification queue (UNVERIFIED, NEEDS_INSPECTION, LOCATION_MISMATCH)
 * @route   GET /api/verification/queue
 * @access  Private (Admin / Inspector)
 */
export const getVerificationQueue = async (req, res) => {
  try {
    const { status, damageType } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.verificationStatus = status;
    } else if (!status) {
      // Default: show only pending reports when no filter specified
      filter.verificationStatus = {
        $in: ['UNVERIFIED', 'NEEDS_INSPECTION', 'LOCATION_MISMATCH'],
      };
    }
    // When status === 'ALL', no verificationStatus filter is applied — returns all reports

    if (damageType) {
      filter.damageType = damageType;
    }

    const reports = await Report.find(filter)
      .populate('reporter', 'name email alias')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve verification queue.',
    });
  }
};

/**
 * @desc    Admin or Inspector updates verification status of a report
 * @route   PATCH /api/verification/reports/:id/status
 * @access  Private (Admin / Inspector)
 */
export const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body.status || req.body.verificationStatus;
    const notes = req.body.notes || req.body.inspectorNotes;

    const allowed = [
      'UNVERIFIED',
      'CORROBORATED',
      'LOCATION_MISMATCH',
      'NEEDS_INSPECTION',
      'INSPECTOR_VERIFIED',
      'REJECTED',
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const report = await Report.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { reportId: id }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found.',
      });
    }

    report.verificationStatus = status;

    let linkedIssue = null;
    if (status === 'INSPECTOR_VERIFIED') {
      report.evidenceConsistencyScore = 100;
      report.evidenceBreakdown.inspectorConfirmed = true;

      // When inspector approves, pothole is marked as INSPECTED
      if (report.roadIssue) {
        linkedIssue = await RoadIssue.findById(report.roadIssue);
        if (linkedIssue) {
          linkedIssue.status = 'INSPECTED';
          linkedIssue.verificationStatus = 'INSPECTOR_VERIFIED';
          await linkedIssue.save();
        }
      } else {
        linkedIssue = await RoadIssue.create({
          issueCode: generateIssueCode(),
          title: `${report.damageType.toUpperCase()} on Corridor`,
          description: report.description,
          location: report.rawLocation,
          primaryDamageType: report.damageType,
          severity: report.severity,
          status: 'INSPECTED',
          verificationStatus: 'INSPECTOR_VERIFIED',
          reportsCount: 1,
          linkedReports: [report._id],
        });
        report.roadIssue = linkedIssue._id;
      }
    } else if (status === 'CORROBORATED' && report.evidenceConsistencyScore < 75) {
      report.evidenceConsistencyScore = 80;
    } else if (status === 'REJECTED') {
      report.evidenceConsistencyScore = 0;
    }

    if (notes) {
      if (!report.evidenceBreakdown.notes) report.evidenceBreakdown.notes = [];
      report.evidenceBreakdown.notes.push(
        `[${new Date().toLocaleDateString()}] ${req.user.role.toUpperCase()} (${req.user.name}): ${notes}`
      );
    }

    await report.save();

    // Reward Ledger: Automatically award verified civic points if promoted
    let rewardResult = null;
    if (status === 'INSPECTOR_VERIFIED' || status === 'CORROBORATED') {
      try {
        rewardResult = await awardReportVerificationPoints({
          reportId: report._id,
          isFirstReport: true,
        });
      } catch (rewardErr) {
        console.warn('Reward crediting warning:', rewardErr.message);
      }
    }

    return res.json({
      success: true,
      message:
        status === 'INSPECTOR_VERIFIED'
          ? `Pothole approved, marked as INSPECTED, and user awarded ${rewardResult?.pointsAwarded || 50} civic points!`
          : `Report status updated to ${status}`,
      report,
      roadIssue: linkedIssue,
      rewardResult,
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update report status.',
    });
  }
};

/**
 * @desc    Find duplicate candidates using PostGIS / MongoDB 2dsphere radius matching (30m)
 * @route   GET /api/verification/duplicates
 * @access  Private (Admin / Inspector)
 */
export const getDuplicateReviewQueue = async (req, res) => {
  try {
    const radiusMeters = parseFloat(req.query.radiusMeters) || 30;

    // Fetch all active reports
    const allReports = await Report.find({})
      .populate('reporter', 'name email alias')
      .populate('roadIssue', 'issueCode title status')
      .sort({ createdAt: -1 });

    const duplicateGroups = [];
    const processedPairs = new Set();

    for (let i = 0; i < allReports.length; i++) {
      const repA = allReports[i];
      const [lngA, latA] = repA.rawLocation.coordinates;

      for (let j = i + 1; j < allReports.length; j++) {
        const repB = allReports[j];
        const [lngB, latB] = repB.rawLocation.coordinates;

        const pairKey = [repA._id.toString(), repB._id.toString()].sort().join('_');
        if (processedPairs.has(pairKey)) continue;

        const distance = calculateHaversineDistance(latA, lngA, latB, lngB);

        if (distance <= radiusMeters) {
          processedPairs.add(pairKey);

          const analysis = calculateDuplicateConfidence(
            {
              coordinates: [lngA, latA],
              damageType: repA.damageType,
              description: repA.description,
              createdAt: repA.createdAt,
            },
            {
              coordinates: [lngB, latB],
              damageType: repB.damageType,
              description: repB.description,
              createdAt: repB.createdAt,
            },
            radiusMeters
          );

          if (analysis.confidence >= 40) {
            duplicateGroups.push({
              pairId: pairKey,
              confidence: analysis.confidence,
              isDuplicate: analysis.isDuplicate,
              autoLink: analysis.autoLink,
              distanceMeters: analysis.distanceMeters,
              reasons: analysis.reasons,
              reportA: repA,
              reportB: repB,
            });
          }
        }
      }
    }

    duplicateGroups.sort((a, b) => b.confidence - a.confidence);

    return res.json({
      success: true,
      count: duplicateGroups.length,
      radiusMeters,
      duplicates: duplicateGroups,
    });
  } catch (error) {
    console.error('Error in duplicate review queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process duplicate detection queue.',
    });
  }
};

/**
 * @desc    Merge duplicate reports into a single unified RoadIssue
 * @route   POST /api/verification/duplicates/resolve
 * @access  Private (Admin)
 */
export const resolveDuplicate = async (req, res) => {
  try {
    const { action, reportIds, primaryReportId, roadIssueId } = req.body;

    if (!action || !reportIds || !Array.isArray(reportIds) || reportIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please provide action ("MERGE" | "DISMISS") and at least two report IDs.',
      });
    }

    if (action === 'MERGE') {
      const reports = await Report.find({ _id: { $in: reportIds } });
      if (reports.length < 2) {
        return res.status(404).json({
          success: false,
          error: 'Specified reports could not be found.',
        });
      }

      let issue = null;

      // Link to existing issue or create new unified ground-truth RoadIssue
      if (roadIssueId) {
        issue = await RoadIssue.findById(roadIssueId);
      }

      if (!issue) {
        const primary = reports.find((r) => r._id.toString() === primaryReportId) || reports[0];
        const issueCode = generateIssueCode();

        issue = await RoadIssue.create({
          issueCode,
          title: `Defect: ${primary.damageType.toUpperCase()} near ${primary.manualAddress || 'Reported Location'}`,
          primaryDamageType: primary.damageType,
          severity: primary.severity,
          location: primary.rawLocation,
          address: primary.manualAddress || '',
          status: 'VERIFIED',
          priorityScore: primary.severity === 'critical' ? 85 : primary.severity === 'high' ? 70 : 45,
          priorityLevel: primary.severity === 'critical' ? 'CRITICAL' : primary.severity === 'high' ? 'HIGH' : 'MEDIUM',
          reportsCount: reports.length,
          safetyOverride: primary.severity === 'critical',
        });
      } else {
        issue.reportsCount = (issue.reportsCount || 1) + (reports.length - 1);
        await issue.save();
      }

      // Link all reports to this issue and corroborate them
      for (const rep of reports) {
        const isPrimary = rep._id.toString() === (primaryReportId || reports[0]._id.toString());
        rep.roadIssue = issue._id;
        if (rep.verificationStatus === 'UNVERIFIED' || rep.verificationStatus === 'NEEDS_INSPECTION') {
          rep.verificationStatus = 'CORROBORATED';
          rep.evidenceConsistencyScore = Math.max(rep.evidenceConsistencyScore, 85);
        }
        await rep.save();

        try {
          await awardReportVerificationPoints({
            reportId: rep._id,
            isFirstReport: isPrimary,
          });
        } catch (rewardErr) {
          console.warn('Duplicate merge reward warning:', rewardErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Successfully merged ${reports.length} reports into unified defect ${issue.issueCode}.`,
        roadIssue: issue,
      });
    }

    if (action === 'DISMISS') {
      return res.json({
        success: true,
        message: 'Marked reports as distinct road defects.',
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('Error resolving duplicate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve duplicate complaints.',
    });
  }
};

/**
 * @desc    Get city triage overview statistics
 * @route   GET /api/verification/stats
 * @access  Private (Admin / Inspector)
 */
export const getTriageStats = async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const uniqueIssues = await RoadIssue.countDocuments();

    const unverifiedCount = await Report.countDocuments({ verificationStatus: 'UNVERIFIED' });
    const corroboratedCount = await Report.countDocuments({ verificationStatus: 'CORROBORATED' });
    const needsInspectionCount = await Report.countDocuments({ verificationStatus: 'NEEDS_INSPECTION' });
    const mismatchCount = await Report.countDocuments({ verificationStatus: 'LOCATION_MISMATCH' });
    const verifiedDuplicates = await Report.countDocuments({ roadIssue: { $ne: null } });

    // Calculate potential duplicates within 30m
    const allReports = await Report.find({}, 'rawLocation damageType');
    let possibleDuplicates = 0;
    for (let i = 0; i < allReports.length; i++) {
      for (let j = i + 1; j < allReports.length; j++) {
        const coordsA = allReports[i]?.rawLocation?.coordinates;
        const coordsB = allReports[j]?.rawLocation?.coordinates;
        if (!coordsA || coordsA.length < 2 || !coordsB || coordsB.length < 2) continue;

        const [lngA, latA] = coordsA;
        const [lngB, latB] = coordsB;
        const dist = calculateHaversineDistance(latA, lngA, latB, lngB);
        if (dist <= 30) {
          possibleDuplicates++;
          break; // Count once per clustered report
        }
      }
    }

    return res.json({
      success: true,
      stats: {
        totalReports,
        uniqueIssues,
        possibleDuplicates,
        verifiedDuplicates,
        unverifiedCount,
        corroboratedCount,
        needsInspectionCount,
        mismatchCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve triage stats.',
    });
  }
};
