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
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    // Email Verification
    isEmailVerified: { type: Boolean, default: false, index: true },
    emailOTP: { type: String, select: false },
    emailOTPExpires: { type: Date, select: false },

    // Password Reset
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // Phone (optional)
    phone: { type: String, required: false },

    role: {
      type: String,
      enum: ["USER", "VERIFIED_SELLER", "ADMIN"],
      default: "USER",
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
    },

    // Security fields
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.emailOTP;
        delete ret.emailOTPExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isEmailVerified: 1 });

// Methods
userSchema.methods.isVerifiedSeller = function () {
  return this.role === "VERIFIED_SELLER";
};

userSchema.methods.canSell = function () {
  return this.isEmailVerified && this.isActive;
};

module.exports = mongoose.model("User", userSchema);
