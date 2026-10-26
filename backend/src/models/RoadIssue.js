import mongoose from 'mongoose';

const roadIssueSchema = new mongoose.Schema(
  {
    issueCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    primaryDamageType: {
      type: String,
      required: true,
      enum: ['pothole', 'severe_crack', 'rutting', 'manhole_collapse', 'erosion', 'other'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      default: '',
    },
    roadClass: {
      type: String,
      enum: ['residential', 'local', 'collector', 'arterial', 'highway'],
      default: 'collector',
    },
    status: {
      type: String,
      enum: ['REPORTED', 'VERIFIED', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTED', 'CLOSED'],
      default: 'REPORTED',
      index: true,
    },
    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    priorityLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    priorityFactors: {
      defectSeverityScore: { type: Number, default: 0 },
      roadHierarchyScore: { type: Number, default: 0 },
      accidentSafetyScore: { type: Number, default: 0 },
      complaintDensityScore: { type: Number, default: 0 },
      costEfficiencyScore: { type: Number, default: 0 },
      weatherSeasonScore: { type: Number, default: 0 },
      formulaBreakdown: { type: String, default: '' },
      humanReadableReasons: { type: [String], default: [] },
    },
    safetyOverride: {
      type: Boolean,
      default: false,
      index: true,
    },
    safetyOverrideReason: {
      type: String,
      default: '',
    },
    estimatedCost: {
      type: Number,
      default: 1500, // USD
      min: 100,
    },
    workOrderNumber: {
      type: String,
      default: null,
      index: true,
    },
    assignedTeam: {
      type: String,
      default: null,
    },
    assignedInspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    estimatedCompletionDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'CORROBORATED', 'NEEDS_INSPECTION', 'INSPECTOR_VERIFIED', 'REJECTED'],
      default: 'CORROBORATED',
    },
    completionEvidence: {
      photoUrl: String,
      notes: String,
      inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      inspectedAt: Date,
    },
    lifecycleHistory: [
      {
        status: {
          type: String,
          enum: ['REPORTED', 'VERIFIED', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTED', 'CLOSED'],
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedByName: String,
        changedByRole: String,
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    reportsCount: {
      type: Number,
      default: 1,
    },
    accidentCounts: {
      nearbyCount: { type: Number, default: 0 },
      suspectedCount: { type: Number, default: 0 },
      documentedCount: { type: Number, default: 0 },
      confirmedCount: { type: Number, default: 0 },
      totalInjuries: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

roadIssueSchema.index({ location: '2dsphere' });

export const RoadIssue = mongoose.model('RoadIssue', roadIssueSchema);
