// server/models/user.model.js

const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
      default: "NONE",
    },
    idImage: { type: String },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // Email Verification (instead of phone)
    isEmailVerified: { type: Boolean, default: false, index: true },
    emailOTP: {
      type: String,
      select: false,
    },
    emailOTPExpires: {
      type: Date,
      select: false,
    },

    // Phone (optional now)
    phone: {
      type: String,
      required: false,
    },

    role: {
      type: String,
      enum: ["USER", "VERIFIED_SELLER", "ADMIN"],
      default: "USER",
      index: true,
    },

    // KYC for ID Verification
    kyc: {
      type: kycSchema,
      default: () => ({}),
    },

    // Wallet
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
      get: (v) => Math.round(v * 100) / 100,
      set: (v) => Math.round(v * 100) / 100,
    },

    // Security fields
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.emailOTP;
        delete ret.emailOTPExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  },
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isEmailVerified: 1 });
userSchema.index({ "kyc.status": 1 });

// Method to check if user is verified seller
userSchema.methods.isVerifiedSeller = function () {
  return this.role === "VERIFIED_SELLER";
};

// Method to check if user can sell
userSchema.methods.canSell = function () {
  return this.isEmailVerified && this.isActive;
};

// Method to check if user can request verification
userSchema.methods.canRequestVerification = function () {
  return (
    this.role !== "VERIFIED_SELLER" &&
    this.kyc.status !== "PENDING" &&
    this.isActive
  );
};

module.exports = mongoose.model("User", userSchema);
