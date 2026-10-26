import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    damageType: {
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
    description: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      required: true,
    },
    rawLocation: {
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
    manualAddress: {
      type: String,
      default: '',
    },
    deviceAccuracyMeters: {
      type: Number,
      default: null,
    },
    deviceCoordinates: {
      latitude: Number,
      longitude: Number,
    },
    exifCoordinates: {
      latitude: Number,
      longitude: Number,
    },
    verificationStatus: {
      type: String,
      enum: [
        'UNVERIFIED',
        'CORROBORATED',
        'LOCATION_MISMATCH',
        'NEEDS_INSPECTION',
        'INSPECTOR_VERIFIED',
        'REJECTED',
      ],
      default: 'UNVERIFIED',
      index: true,
    },
    evidenceConsistencyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 40,
    },
    evidenceBreakdown: {
      devicePinDeltaMeters: Number,
      exifPinDeltaMeters: Number,
      exifMatched: Boolean,
      gpsPinMatched: Boolean,
      roadProximityPassed: Boolean,
      independentReportsNearby: Number,
      inspectorConfirmed: Boolean,
      notes: [String],
    },
    roadIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadIssue',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for radius duplicate detection and map spatial queries
reportSchema.index({ rawLocation: '2dsphere' });

export const Report = mongoose.model('Report', reportSchema);
