import mongoose from 'mongoose';

const rewardLedgerSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
    },
    actionType: {
      type: String,
      required: true,
      enum: [
        'FIRST_REPORT_VERIFIED',
        'QUALITY_PHOTO_EXIF',
        'CORROBORATION_VERIFIED',
        'BADGE_BONUS',
        'PERK_REDEMPTION',
      ],
    },
    pointsDelta: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
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

export const RewardLedger = mongoose.model('RewardLedger', rewardLedgerSchema);
