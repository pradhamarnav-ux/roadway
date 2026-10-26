import mongoose from 'mongoose';

const accidentSchema = new mongoose.Schema(
  {
    accidentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roadIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadIssue',
      required: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
    attributionTier: {
      type: String,
      enum: [
        'NEARBY_ACCIDENT',
        'SUSPECTED_CONTRIBUTION',
        'DOCUMENTED_CONTRIBUTION',
        'CONFIRMED_CONTRIBUTION',
      ],
      default: 'NEARBY_ACCIDENT',
      required: true,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      default: 'UNVERIFIED',
      required: true,
      index: true,
    },
    injurySeverity: {
      type: String,
      enum: ['none', 'minor', 'serious', 'fatal'],
      default: 'none',
    },
    injuriesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vehiclesInvolved: {
      type: Number,
      default: 1,
    },
    policeReportRef: {
      type: String,
      default: null,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    evidenceFiles: [
      {
        url: { type: String, required: true },
        filename: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    evidenceNotes: {
      type: String,
      default: '',
    },
    // Minimal Personal Data: Strictly no victim names, phone numbers, driver licenses, or private medical details stored
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isSynthetic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

accidentSchema.index({ location: '2dsphere' });

export const Accident = mongoose.model('Accident', accidentSchema);
