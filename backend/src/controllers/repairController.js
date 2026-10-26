import { RoadIssue } from '../models/RoadIssue.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { awardReportVerificationPoints } from '../algorithms/rewardEngine.js';

/**
 * Standard municipal repair crews available for dispatch
 */
export const MUNICIPAL_REPAIR_CREWS = [
  { id: 'CREW-ALPHA', name: 'Central Rapid Asphalt Crew', zone: 'Central Zone', specialty: 'Pothole Infill & Milling' },
  { id: 'CREW-BETA', name: 'North Arterial Paving Team', zone: 'North Sector', specialty: 'Thermal Cracking & Resurfacing' },
  { id: 'CREW-GAMMA', name: 'Metro Concrete & Drainage Unit', zone: 'South Zone', specialty: 'Manhole Collapse & Culverts' },
  { id: 'CREW-DELTA', name: 'Highway Heavy Maintenance Crew', zone: 'Highway Corridors', specialty: 'Rutting & Deep Sub-base' },
];

/**
 * @desc    Get GIS map defects & unverified complaints with popups and filters
 * @route   GET /api/repairs/map-defects
 * @access  Private (Citizen, Inspector, Admin)
 */
export const getMapDefects = async (req, res) => {
  try {
    const { priority, damageType, verificationStatus, repairStatus, search } = req.query;

    const issueFilter = {};

    if (priority && priority !== 'ALL') {
      issueFilter.priorityLevel = priority.toUpperCase();
    }

    if (damageType && damageType !== 'ALL') {
      issueFilter.primaryDamageType = damageType.toLowerCase();
    }

    if (repairStatus && repairStatus !== 'ALL') {
      issueFilter.status = repairStatus.toUpperCase();
    }

    if (verificationStatus && verificationStatus !== 'ALL') {
      issueFilter.verificationStatus = verificationStatus.toUpperCase();
    }

    if (search) {
      issueFilter.$or = [
        { issueCode: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { workOrderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch verified/scheduled/assigned road issues
    const roadIssues = await RoadIssue.find(issueFilter)
      .populate('assignedInspector', 'name email role')
      .sort({ priorityScore: -1 })
      .lean();

    // Map road issues into unified marker format
    const issueMarkers = roadIssues.map((issue) => {
      const coords = issue.location?.coordinates || [77.2090, 28.6139];
      // Leaflet expects [latitude, longitude], GeoJSON is [longitude, latitude]
      const lat = coords[1];
      const lng = coords[0];

      return {
        _id: issue._id,
        markerType: 'ROAD_ISSUE',
        issueCode: issue.issueCode,
        title: issue.title,
        coordinates: [lat, lng],
        damageType: issue.primaryDamageType,
        severity: issue.severity,
        roadClass: issue.roadClass,
        priorityScore: issue.priorityScore || 0,
        priorityLevel: issue.priorityLevel || 'MEDIUM',
        safetyOverride: Boolean(issue.safetyOverride),
        safetyOverrideReason: issue.safetyOverrideReason || '',
        status: issue.status,
        verificationStatus: issue.verificationStatus || 'CORROBORATED',
        reportsCount: issue.reportsCount || 1,
        accidentCounts: issue.accidentCounts || { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
        estimatedCost: issue.estimatedCost || 1500,
        workOrderNumber: issue.workOrderNumber || null,
        assignedTeam: issue.assignedTeam || null,
        assignedInspector: issue.assignedInspector || null,
        scheduledDate: issue.scheduledDate || null,
        estimatedCompletionDate: issue.estimatedCompletionDate || null,
        completedDate: issue.completedDate || null,
        completionEvidence: issue.completionEvidence || null,
        formulaBreakdown: issue.priorityFactors?.formulaBreakdown || '',
        humanReadableReasons: issue.priorityFactors?.humanReadableReasons || [],
        address: issue.address || 'Municipal Road Corridor',
        createdAt: issue.createdAt,
      };
    });

    // Also fetch raw unlinked UNVERIFIED complaints so admins/inspectors see raw reports as hollow circles
    let unverifiedMarkers = [];
    if (!repairStatus || repairStatus === 'ALL' || repairStatus === 'REPORTED') {
      const reportFilter = {
        roadIssue: null,
        verificationStatus: { $in: ['UNVERIFIED', 'NEEDS_INSPECTION', 'LOCATION_MISMATCH'] },
      };

      if (damageType && damageType !== 'ALL') {
        reportFilter.damageType = damageType.toLowerCase();
      }

      const unlinkedReports = await Report.find(reportFilter)
        .populate('reporter', 'name email')
        .limit(100)
        .lean();

      unverifiedMarkers = unlinkedReports.map((rep) => {
        const coords = rep.rawLocation?.coordinates || [77.2090, 28.6139];
        const lat = coords[1];
        const lng = coords[0];

        return {
          _id: rep._id,
          markerType: 'UNVERIFIED_REPORT',
          issueCode: rep.reportId,
          title: `Raw Citizen Complaint: ${rep.damageType}`,
          description: rep.description,
          photoUrl: rep.photoUrl,
          coordinates: [lat, lng],
          damageType: rep.damageType,
          severity: rep.severity,
          roadClass: 'residential',
          priorityScore: 30,
          priorityLevel: 'LOW',
          safetyOverride: false,
          safetyOverrideReason: '',
          status: 'REPORTED',
          verificationStatus: rep.verificationStatus,
          reportsCount: 1,
          accidentCounts: { nearbyCount: 0, suspectedCount: 0, documentedCount: 0, confirmedCount: 0, totalInjuries: 0 },
          estimatedCost: 1000,
          workOrderNumber: null,
          assignedTeam: null,
          assignedInspector: null,
          address: rep.manualAddress || 'Reported Location',
          createdAt: rep.createdAt,
          reporterName: rep.reporter?.name || 'Anonymous Citizen',
        };
      });
    }

    const allMarkers = [...issueMarkers, ...unverifiedMarkers];

    return res.json({
      success: true,
      count: allMarkers.length,
      roadIssuesCount: issueMarkers.length,
      unverifiedReportsCount: unverifiedMarkers.length,
      markers: allMarkers,
    });
  } catch (error) {
    console.error('Error fetching map defects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve GIS map defect coordinates.',
      details: error.message,
    });
  }
};

/**
 * @desc    Get all road issues with repair lifecycle details
 * @route   GET /api/repairs
 * @access  Private (Admin, Inspector, Citizen)
 */
export const getRepairs = async (req, res) => {
  try {
    const { status, priority, roadClass, assignedTeam, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }
    if (priority && priority !== 'ALL') {
      filter.priorityLevel = priority.toUpperCase();
    }
    if (roadClass && roadClass !== 'ALL') {
      filter.roadClass = roadClass.toLowerCase();
    }
    if (assignedTeam && assignedTeam !== 'ALL') {
      filter.assignedTeam = assignedTeam;
    }
    if (search) {
      filter.$or = [
        { issueCode: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { workOrderNumber: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const issues = await RoadIssue.find(filter)
      .populate('assignedInspector', 'name email role')
      .sort({ priorityScore: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    console.error('Error fetching repairs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve road repairs.',
    });
  }
};

/**
 * @desc    Get single repair by ID with linked reports & history
 * @route   GET /api/repairs/:id
 * @access  Private (Admin, Inspector, Citizen)
 */
export const getRepairById = async (req, res) => {
  try {
    const issue = await RoadIssue.findById(req.params.id)
      .populate('assignedInspector', 'name email role')
      .populate('completionEvidence.inspector', 'name email role')
      .populate('lifecycleHistory.changedBy', 'name email role')
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Road defect not found.',
      });
    }

    // Find linked citizen reports
    const linkedReports = await Report.find({ roadIssue: issue._id })
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      issue,
      linkedReports,
    });
  } catch (error) {
    console.error('Error fetching repair detail:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve repair details.',
    });
  }
};

/**
 * @desc    Approve repair plan and schedule work order
 * @route   PATCH /api/repairs/:id/schedule
 * @access  Private (Admin only)
 */
export const scheduleRepair = async (req, res) => {
  try {
    const { scheduledDate, estimatedCompletionDate, estimatedCost, notes } = req.body;
    const issue = await RoadIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Road issue not found.' });
    }

    const sDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 3 * 86400000);
    const cDate = estimatedCompletionDate ? new Date(estimatedCompletionDate) : new Date(Date.now() + 10 * 86400000);

    // Auto-generate Work Order number if missing
    if (!issue.workOrderNumber) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      issue.workOrderNumber = `WO-2026-${randomSuffix}`;
    }

    issue.status = 'SCHEDULED';
    issue.scheduledDate = sDate;
    issue.estimatedCompletionDate = cDate;
    if (estimatedCost) {
      issue.estimatedCost = Number(estimatedCost);
    }

    issue.lifecycleHistory.push({
      status: 'SCHEDULED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      changedByRole: req.user.role,
      changedAt: new Date(),
      notes: notes || `Work order ${issue.workOrderNumber} approved and repair plan scheduled.`,
    });

    await issue.save();

    return res.json({
      success: true,
      message: `Work order ${issue.workOrderNumber} scheduled successfully.`,
      issue,
    });
  } catch (error) {
    console.error('Error scheduling repair:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to schedule repair.',
      details: error.message,
    });
  }
};

/**
 * @desc    Assign repair team and inspector
 * @route   PATCH /api/repairs/:id/assign
 * @access  Private (Admin only)
 */
export const assignRepairTeam = async (req, res) => {
  try {
    const { assignedTeam, assignedInspectorId, estimatedCompletionDate, notes } = req.body;

    if (!assignedTeam) {
      return res.status(400).json({
        success: false,
        error: 'Please specify an assigned repair crew.',
      });
    }

    const issue = await RoadIssue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Road defect not found.' });
    }

    if (!issue.workOrderNumber) {
      issue.workOrderNumber = `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    issue.assignedTeam = assignedTeam;
    if (assignedInspectorId) {
      issue.assignedInspector = assignedInspectorId;
    }
    if (estimatedCompletionDate) {
      issue.estimatedCompletionDate = new Date(estimatedCompletionDate);
    }

    issue.status = 'ASSIGNED';

    issue.lifecycleHistory.push({
      status: 'ASSIGNED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      changedByRole: req.user.role,
      changedAt: new Date(),
      notes: notes || `Dispatched to ${assignedTeam}. Work order ${issue.workOrderNumber}.`,
    });

    await issue.save();

    return res.json({
      success: true,
      message: `Successfully dispatched defect to ${assignedTeam}.`,
      issue,
    });
  } catch (error) {
    console.error('Error assigning repair team:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assign repair team.',
      details: error.message,
    });
  }
};

/**
 * @desc    Start on-site repair work
 * @route   PATCH /api/repairs/:id/start
 * @access  Private (Admin / Inspector)
 */
export const startRepair = async (req, res) => {
  try {
    const { notes } = req.body;
    const issue = await RoadIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Road issue not found.' });
    }

    issue.status = 'IN_PROGRESS';

    issue.lifecycleHistory.push({
      status: 'IN_PROGRESS',
      changedBy: req.user._id,
      changedByName: req.user.name,
      changedByRole: req.user.role,
      changedAt: new Date(),
      notes: notes || `Repair crew active on-site. Milling/infill initiated.`,
    });

    await issue.save();

    return res.json({
      success: true,
      message: `Defect ${issue.issueCode} is now IN_PROGRESS.`,
      issue,
    });
  } catch (error) {
    console.error('Error starting repair:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start repair.',
    });
  }
};

/**
 * @desc    Inspector submits post-repair completion evidence
 * @route   POST /api/repairs/:id/inspect
 * @access  Private (Inspector / Admin)
 */
export const submitInspectionEvidence = async (req, res) => {
  try {
    const { notes, passed = true } = req.body;
    const issue = await RoadIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Road issue not found.' });
    }

    // Require completion photo upload if provided via multer
    let photoUrl = '/uploads/sample_completion.jpg';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      photoUrl = req.body.photoUrl;
    }

    issue.status = 'INSPECTED';
    issue.completionEvidence = {
      photoUrl,
      notes: notes || 'Field inspection passed. Structural surface restored to specification.',
      inspector: req.user._id,
      inspectedAt: new Date(),
    };

    issue.lifecycleHistory.push({
      status: 'INSPECTED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      changedByRole: req.user.role,
      changedAt: new Date(),
      notes: `Field Inspector signed off on repair quality. Evidence photo recorded. Notes: ${notes || 'Restored'}`,
    });

    await issue.save();

    // Automatically reward citizen(s) who reported this pothole when inspector marks it INSPECTED
    let pointsAwardedTotal = 0;
    try {
      const linkedReports = await Report.find({ roadIssue: issue._id });
      for (const rep of linkedReports) {
        rep.verificationStatus = 'INSPECTOR_VERIFIED';
        rep.evidenceConsistencyScore = 100;
        await rep.save();
        const reward = await awardReportVerificationPoints({ reportId: rep._id, isFirstReport: true });
        if (reward?.pointsAwarded) {
          pointsAwardedTotal += reward.pointsAwarded;
        }
      }
    } catch (rewardErr) {
      console.warn('Reward crediting warning during repair inspection:', rewardErr.message);
    }

    return res.json({
      success: true,
      message: `Repair signed off as INSPECTED by ${req.user.name}. Citizen awarded points for verified report.`,
      issue,
      pointsAwardedTotal,
    });
  } catch (error) {
    console.error('Error submitting inspection evidence:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit inspection evidence.',
      details: error.message,
    });
  }
};

/**
 * @desc    Final administrative sign-off and closure
 * @route   PATCH /api/repairs/:id/close
 * @access  Private (Admin only)
 */
export const closeRepair = async (req, res) => {
  try {
    const { notes } = req.body;
    const issue = await RoadIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Road defect not found.' });
    }

    issue.status = 'CLOSED';
    issue.completedDate = new Date();

    issue.lifecycleHistory.push({
      status: 'CLOSED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      changedByRole: req.user.role,
      changedAt: new Date(),
      notes: notes || 'Work order officially closed. Municipal pavement asset sign-off complete.',
    });

    await issue.save();

    // Also update linked reports so citizen tracking shows completed
    const linkedReports = await Report.find({ roadIssue: issue._id });
    for (const rep of linkedReports) {
      rep.verificationStatus = 'INSPECTOR_VERIFIED';
      await rep.save();

      try {
        await awardReportVerificationPoints({
          reportId: rep._id,
          isFirstReport: false,
        });
      } catch (rewardErr) {
        console.warn('Reward crediting warning in closeRepair:', rewardErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Work order ${issue.workOrderNumber || issue.issueCode} officially CLOSED.`,
      issue,
    });
  } catch (error) {
    console.error('Error closing repair:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to close repair.',
      details: error.message,
    });
  }
};

/**
 * @desc    Get inspection tasks assigned to the logged-in field inspector
 * @route   GET /api/repairs/inspector/tasks
 * @access  Private (Inspector / Admin)
 */
export const getInspectorTasks = async (req, res) => {
  try {
    const filter = {
      status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'INSPECTED', 'VERIFIED'] },
    };

    // If inspector, find either assigned to them or unassigned in need of inspection
    if (req.user.role === 'inspector') {
      filter.$or = [
        { assignedInspector: req.user._id },
        { assignedInspector: null },
      ];
    }

    const tasks = await RoadIssue.find(filter)
      .populate('assignedInspector', 'name email role')
      .sort({ priorityScore: -1 })
      .lean();

    return res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('Error fetching inspector tasks:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inspector tasks.',
    });
  }
};

/**
 * @desc    Get high-level command center analytics for charts & KPIs
 * @route   GET /api/repairs/analytics/overview
 * @access  Private (Admin / Inspector)
 */
export const getRepairAnalytics = async (req, res) => {
  try {
    const issues = await RoadIssue.find({}).lean();
    const reports = await Report.find({}).lean();

    const statusCounts = {
      REPORTED: 0,
      VERIFIED: 0,
      SCHEDULED: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      INSPECTED: 0,
      CLOSED: 0,
    };

    const priorityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    const roadClassCounts = {
      highway: 0,
      arterial: 0,
      collector: 0,
      residential: 0,
    };

    let totalEstimatedSpend = 0;
    let totalCompletedSpend = 0;
    let safetyOverrideCount = 0;

    for (const issue of issues) {
      if (statusCounts[issue.status] !== undefined) {
        statusCounts[issue.status]++;
      }
      if (priorityCounts[issue.priorityLevel] !== undefined) {
        priorityCounts[issue.priorityLevel]++;
      }
      const rClass = issue.roadClass || 'collector';
      if (roadClassCounts[rClass] !== undefined) {
        roadClassCounts[rClass]++;
      }

      totalEstimatedSpend += issue.estimatedCost || 0;
      if (issue.status === 'CLOSED' || issue.status === 'INSPECTED') {
        totalCompletedSpend += issue.estimatedCost || 0;
      }
      if (issue.safetyOverride) {
        safetyOverrideCount++;
      }
    }

    return res.json({
      success: true,
      totalIssues: issues.length,
      totalCitizenComplaints: reports.length,
      statusCounts,
      priorityCounts,
      roadClassCounts,
      safetyOverrideCount,
      totalEstimatedSpend,
      totalCompletedSpend,
      activeWorkOrders: statusCounts.SCHEDULED + statusCounts.ASSIGNED + statusCounts.IN_PROGRESS,
      closedRepairs: statusCounts.CLOSED,
      availableCrews: MUNICIPAL_REPAIR_CREWS,
    });
  } catch (error) {
    console.error('Error fetching repair analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve repair analytics.',
    });
  }
};
