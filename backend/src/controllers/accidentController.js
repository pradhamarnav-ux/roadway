import { Accident } from '../models/Accident.js';
import { RoadIssue } from '../models/RoadIssue.js';
import {
  aggregateAccidentMetrics,
  ATTRIBUTION_TIERS,
  ACCIDENT_VERIFICATION_STATUSES,
} from '../algorithms/accidentAnalysis.js';
import { calculateHaversineDistance } from '../algorithms/locationVerification.js';
import crypto from 'crypto';

/**
 * Generate unique accident tracking ID (e.g. ACC-2026-A1B2)
 */
function generateAccidentId() {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ACC-2026-${hex}`;
}

/**
 * Recalculate accident counts and safety risk score for a RoadIssue
 */
export async function syncIssueAccidentMetrics(issueId) {
  if (!issueId) return;
  const accidents = await Accident.find({ roadIssue: issueId });
  const metrics = aggregateAccidentMetrics(accidents);

  const issue = await RoadIssue.findById(issueId);
  if (issue) {
    issue.accidentCounts = {
      nearbyCount: metrics.nearbyCount,
      suspectedCount: metrics.suspectedCount,
      documentedCount: metrics.documentedCount,
      confirmedCount: metrics.confirmedCount,
      totalInjuries: metrics.totalInjuries,
    };

    if (!issue.priorityFactors) issue.priorityFactors = {};
    issue.priorityFactors.accidentSafetyScore = metrics.safetyRiskScore;

    // Safety override if confirmed accident or critical defect
    if (metrics.confirmedCount > 0) {
      issue.safetyOverride = true;
      issue.safetyOverrideReason = 'Safety Escalation: Confirmed vehicular collision attributed to road defect.';
      issue.priorityLevel = 'CRITICAL';
    } else if (issue.severity !== 'critical') {
      if (issue.safetyOverrideReason?.includes('Confirmed vehicular collision')) {
        issue.safetyOverride = false;
        issue.safetyOverrideReason = '';
      }
    }

    await issue.save();
  }
}

/**
 * @desc    Report an accident near a road defect (Citizen or Traffic Officer)
 * @route   POST /api/accidents
 * @access  Private
 */
export const createAccident = async (req, res) => {
  try {
    const {
      roadIssueId,
      latitude,
      longitude,
      occurredAt,
      injurySeverity,
      injuriesCount,
      vehiclesInvolved,
      policeReportRef,
      evidenceNotes,
      claimedContribution,
      verificationStatus,
    } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        error: 'Accident location coordinates (latitude, longitude) are required.',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    let targetIssueId = roadIssueId;

    // If roadIssueId not provided, search for nearest road issue within 50m
    if (!targetIssueId) {
      const nearbyIssues = await RoadIssue.find({
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 50, // 50m radius per spec
          },
        },
      });

      if (nearbyIssues.length > 0) {
        targetIssueId = nearbyIssues[0]._id;
      }
    }

    // If still no issue found, create a new RoadIssue representing the reported defect location
    if (!targetIssueId) {
      const newIssueCode = `ISSUE-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const createdIssue = await RoadIssue.create({
        issueCode: newIssueCode,
        title: `Road Defect near accident location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        primaryDamageType: 'pothole',
        severity: 'medium',
        location: { type: 'Point', coordinates: [lng, lat] },
        status: 'REPORTED',
      });
      targetIssueId = createdIssue._id;
    }

    // Default attribution tier:
    // If citizen claims pothole contributed -> SUSPECTED_CONTRIBUTION
    // Otherwise -> NEARBY_ACCIDENT (never automatically attributed)
    const initialAttribution =
      claimedContribution === true || claimedContribution === 'true'
        ? ATTRIBUTION_TIERS.SUSPECTED_CONTRIBUTION
        : ATTRIBUTION_TIERS.NEARBY_ACCIDENT;

    // Evidence file handling (photo upload via multer or JSON url)
    let photoUrl = req.body.photoUrl || null;
    const evidenceFiles = [];

    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
      evidenceFiles.push({
        url: photoUrl,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        uploadedAt: new Date(),
      });
    } else if (req.body.evidenceFiles && Array.isArray(req.body.evidenceFiles)) {
      evidenceFiles.push(...req.body.evidenceFiles);
    } else if (photoUrl) {
      evidenceFiles.push({
        url: photoUrl,
        filename: 'evidence_photo.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date(),
      });
    }

    const accidentId = generateAccidentId();

    const accident = await Accident.create({
      accidentId,
      roadIssue: targetIssueId,
      location: { type: 'Point', coordinates: [lng, lat] },
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      attributionTier: initialAttribution,
      verificationStatus: verificationStatus || ACCIDENT_VERIFICATION_STATUSES.UNVERIFIED,
      injurySeverity: injurySeverity || 'none',
      injuriesCount: Math.max(0, parseInt(injuriesCount, 10) || 0),
      vehiclesInvolved: Math.max(1, parseInt(vehiclesInvolved, 10) || 1),
      policeReportRef: policeReportRef ? policeReportRef.trim() : null,
      photoUrl,
      evidenceFiles,
      evidenceNotes: evidenceNotes ? evidenceNotes.trim() : '',
      reportedBy: req.user._id,
      isSynthetic: false,
    });

    // Update parent RoadIssue's 5 counts
    await syncIssueAccidentMetrics(targetIssueId);

    const updatedIssue = await RoadIssue.findById(targetIssueId);

    return res.status(201).json({
      success: true,
      message: 'Accident report recorded.',
      accident,
      issueAccidentCounts: updatedIssue?.accidentCounts,
    });
  } catch (error) {
    console.error('Error reporting accident:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record accident report.',
      details: error.message,
    });
  }
};

/**
 * @desc    Get all accidents for admin evidence review
 * @route   GET /api/accidents
 * @access  Private (Admin / Inspector)
 */
export const getAllAccidents = async (req, res) => {
  try {
    const { attributionTier, injurySeverity, verificationStatus } = req.query;
    const filter = {};

    if (attributionTier) filter.attributionTier = attributionTier;
    if (injurySeverity) filter.injurySeverity = injurySeverity;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const accidents = await Accident.find(filter)
      .populate('roadIssue', 'issueCode title location primaryDamageType status accidentCounts safetyOverride priorityLevel')
      .populate('reportedBy', 'name alias')
      .populate('reviewedBy', 'name email')
      .sort({ occurredAt: -1 });

    return res.json({
      success: true,
      count: accidents.length,
      accidents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve accident records.',
    });
  }
};

/**
 * @desc    Get accidents linked to a specific RoadIssue
 * @route   GET /api/accidents/issue/:issueId
 * @access  Private
 */
export const getAccidentsByIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const accidents = await Accident.find({ roadIssue: issueId })
      .populate('reportedBy', 'name alias')
      .populate('reviewedBy', 'name')
      .sort({ occurredAt: -1 });

    const metrics = aggregateAccidentMetrics(accidents);

    return res.json({
      success: true,
      count: accidents.length,
      metrics,
      accidents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch accidents for this issue.',
    });
  }
};

/**
 * @desc    Admin reviews & updates accident attribution tier & verification status with evidence notes
 * @route   PATCH /api/accidents/:id/attribution
 * @access  Private (Admin)
 */
export const updateAccidentAttribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { attributionTier, verificationStatus, evidenceNotes } = req.body;

    if (attributionTier && !Object.values(ATTRIBUTION_TIERS).includes(attributionTier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid attribution tier. Allowed: ${Object.values(ATTRIBUTION_TIERS).join(', ')}`,
      });
    }

    if (verificationStatus && !Object.values(ACCIDENT_VERIFICATION_STATUSES).includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid verification status. Allowed: ${Object.values(ACCIDENT_VERIFICATION_STATUSES).join(', ')}`,
      });
    }

    if (!attributionTier && !verificationStatus && !evidenceNotes) {
      return res.status(400).json({
        success: false,
        error: 'Please provide attributionTier, verificationStatus, or evidenceNotes to update.',
      });
    }

    const accident = await Accident.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { accidentId: id }],
    });

    if (!accident) {
      return res.status(404).json({
        success: false,
        error: 'Accident record not found.',
      });
    }

    const oldTier = accident.attributionTier;
    const oldStatus = accident.verificationStatus;

    if (attributionTier) {
      accident.attributionTier = attributionTier;

      // Auto-escalate verificationStatus to VERIFIED if confirmed or documented and previously UNVERIFIED
      if (
        (attributionTier === ATTRIBUTION_TIERS.DOCUMENTED_CONTRIBUTION ||
          attributionTier === ATTRIBUTION_TIERS.CONFIRMED_CONTRIBUTION) &&
        accident.verificationStatus === ACCIDENT_VERIFICATION_STATUSES.UNVERIFIED &&
        !verificationStatus
      ) {
        accident.verificationStatus = ACCIDENT_VERIFICATION_STATUSES.VERIFIED;
      }
    }

    if (verificationStatus) {
      accident.verificationStatus = verificationStatus;
    }

    accident.reviewedBy = req.user._id;

    if (evidenceNotes) {
      accident.evidenceNotes = accident.evidenceNotes
        ? `${accident.evidenceNotes}\n[Review by ${req.user.name}]: ${evidenceNotes}`
        : `[Review by ${req.user.name}]: ${evidenceNotes}`;
    }

    await accident.save();

    // Recalculate 5 counts for linked RoadIssue
    await syncIssueAccidentMetrics(accident.roadIssue);

    const updatedIssue = await RoadIssue.findById(accident.roadIssue);

    return res.json({
      success: true,
      message: `Accident updated. Attribution: ${oldTier} ➔ ${accident.attributionTier}, Verification: ${oldStatus} ➔ ${accident.verificationStatus}.`,
      accident,
      issueAccidentCounts: updatedIssue?.accidentCounts,
    });
  } catch (error) {
    console.error('Error updating accident attribution:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update accident attribution tier.',
    });
  }
};

/**
 * @desc    Get citywide aggregated accident metrics
 * @route   GET /api/accidents/stats
 * @access  Private (Admin / Inspector)
 */
export const getAccidentStats = async (req, res) => {
  try {
    const totalAccidents = await Accident.countDocuments();
    const nearbyCount = await Accident.countDocuments({
      attributionTier: ATTRIBUTION_TIERS.NEARBY_ACCIDENT,
      verificationStatus: { $ne: ACCIDENT_VERIFICATION_STATUSES.REJECTED },
    });
    const suspectedCount = await Accident.countDocuments({
      attributionTier: ATTRIBUTION_TIERS.SUSPECTED_CONTRIBUTION,
      verificationStatus: { $ne: ACCIDENT_VERIFICATION_STATUSES.REJECTED },
    });
    const documentedCount = await Accident.countDocuments({
      attributionTier: ATTRIBUTION_TIERS.DOCUMENTED_CONTRIBUTION,
      verificationStatus: { $ne: ACCIDENT_VERIFICATION_STATUSES.REJECTED },
    });
    const confirmedCount = await Accident.countDocuments({
      attributionTier: ATTRIBUTION_TIERS.CONFIRMED_CONTRIBUTION,
      verificationStatus: { $ne: ACCIDENT_VERIFICATION_STATUSES.REJECTED },
    });

    const injuryAgg = await Accident.aggregate([
      {
        $match: {
          attributionTier: { $ne: ATTRIBUTION_TIERS.NEARBY_ACCIDENT },
          verificationStatus: { $ne: ACCIDENT_VERIFICATION_STATUSES.REJECTED },
        },
      },
      {
        $group: {
          _id: null,
          totalInjuries: { $sum: '$injuriesCount' },
        },
      },
    ]);
    const totalInjuries = injuryAgg[0]?.totalInjuries || 0;

    const unverifiedCount = await Accident.countDocuments({
      verificationStatus: ACCIDENT_VERIFICATION_STATUSES.UNVERIFIED,
    });
    const underReviewCount = await Accident.countDocuments({
      verificationStatus: ACCIDENT_VERIFICATION_STATUSES.UNDER_REVIEW,
    });
    const verifiedCount = await Accident.countDocuments({
      verificationStatus: ACCIDENT_VERIFICATION_STATUSES.VERIFIED,
    });
    const rejectedCount = await Accident.countDocuments({
      verificationStatus: ACCIDENT_VERIFICATION_STATUSES.REJECTED,
    });

    return res.json({
      success: true,
      stats: {
        totalAccidents,
        nearbyCount,
        suspectedCount,
        documentedCount,
        confirmedCount,
        totalInjuries,
        unverifiedCount,
        underReviewCount,
        verifiedCount,
        rejectedCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve accident statistics.',
    });
  }
};
