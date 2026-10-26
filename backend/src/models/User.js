import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['citizen', 'admin', 'inspector'],
      default: 'citizen',
      required: true,
    },
    alias: {
      type: String,
      default: function () {
        return `CivicHero_${Math.floor(1000 + Math.random() * 9000)}`;
      },
    },
    optOutLeaderboard: {
      type: Boolean,
      default: false,
    },
    useAliasOnLeaderboard: {
      type: Boolean,
      default: false,
    },
    pointsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    badges: [
      {
        id: String,
        name: String,
        description: String,
        awardedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
