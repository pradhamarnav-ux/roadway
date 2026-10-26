import { Report } from '../models/Report.js';
import { extractExifGps } from '../utils/exifExtractor.js';
import { evaluateLocationEvidence } from '../algorithms/locationVerification.js';
import crypto from 'crypto';

/**
 * Generate a unique public report ticket ID (e.g. RW-2026-A1B2)
 */
function generateTicketId() {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RW-2026-${randomHex}`;
}

/**
 * @desc    Submit a new citizen road damage complaint
 * @route   POST /api/reports
 * @access  Private (Citizen / Any authenticated user)
 */
export const createReport = async (req, res) => {
  try {
    const {
      damageType,
      severity,
      description,
      latitude,
      longitude,
      deviceLatitude,
      deviceLongitude,
      deviceAccuracyMeters,
      manualAddress,
    } = req.body;

    // 1. Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a photo of the road damage for evidence verification.',
      });
    }

    if (!damageType || !description || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required report fields: damageType, description, latitude, and longitude are mandatory.',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude coordinates provided.',
      });
    }

    // 2. Parse device location if supplied
    let deviceCoords = null;
    if (deviceLatitude && deviceLongitude) {
      const devLat = parseFloat(deviceLatitude);
      const devLng = parseFloat(deviceLongitude);
      if (!isNaN(devLat) && !isNaN(devLng)) {
        deviceCoords = { latitude: devLat, longitude: devLng };
      }
    }

    // 3. Extract EXIF metadata from uploaded image
    const exifCoords = extractExifGps(req.file.path);

    // 4. Run location evidence verification check
    const evidence = evaluateLocationEvidence({
      claimedCoords: { latitude: lat, longitude: lng },
      deviceCoords,
      exifCoords,
      independentReportsCount: 0,
      isInspectorVerified: false,
    });

    // 5. Generate ticket ID and store report
    const reportId = generateTicketId();
    const photoUrl = `/uploads/${req.file.filename}`;

    const newReport = await Report.create({
      reportId,
      reporter: req.user._id,
      damageType,
      severity: severity || 'medium',
      description: description.trim(),
      photoUrl,
      rawLocation: {
        type: 'Point',
        coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
      },
      manualAddress: manualAddress ? manualAddress.trim() : '',
      deviceAccuracyMeters: deviceAccuracyMeters ? parseFloat(deviceAccuracyMeters) : null,
      deviceCoordinates: deviceCoords,
      exifCoordinates: exifCoords ? { latitude: exifCoords.latitude, longitude: exifCoords.longitude } : null,
      verificationStatus: 'UNVERIFIED', // Initial status is always UNVERIFIED per spec
      evidenceConsistencyScore: evidence.score,
      evidenceBreakdown: evidence.breakdown,
    });

    return res.status(201).json({
      success: true,
      message: 'Road damage complaint recorded successfully.',
      report: newReport,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create report due to a server error.',
      details: error.message,
    });
  }
};

/**
 * @desc    Get reports submitted by current citizen
 * @route   GET /api/reports/my
 * @access  Private
 */
export const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate('roadIssue')
      .sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve your submitted reports.',
    });
  }
};

/**
 * @desc    Get report details by reportId or ObjectId
 * @route   GET /api/reports/:id
 * @access  Private
 */
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    let report = null;

    if (id.startsWith('RW-')) {
      report = await Report.findOne({ reportId: id })
        .populate('reporter', 'name email alias')
        .populate('roadIssue');
    } else {
      report = await Report.findById(id)
        .populate('reporter', 'name email alias')
        .populate('roadIssue');
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        error: `Report not found with ID ${id}`,
      });
    }

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch report details.',
    });
  }
};

/**
 * @desc    Get all reports (Admin & Inspector view)
 * @route   GET /api/reports
 * @access  Private (Admin / Inspector)
 */
export const getAllReports = async (req, res) => {
  try {
    const { damageType, verificationStatus } = req.query;
    const filter = {};

    if (damageType) filter.damageType = damageType;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const reports = await Report.find(filter)
      .populate('reporter', 'name email alias')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reports list.',
    });
  }
};
