// server/models/user.model.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailOTP: { type: String, select: false },
    emailOTPExpires: { type: Date, select: false },
    phone: { type: String },
    profileImage: { type: String },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    role: {
      type: String,
      enum: ["USER", "VERIFIED_SELLER", "ADMIN"],
      default: "USER",
    },
    kyc: {
      status: {
        type: String,
        enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
        default: "NONE",
      },
      // CHANGED: Now storing 3 separate images
      frontImage: { type: String },
      backImage: { type: String },
      faceImage: { type: String },

      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      rejectionReason: { type: String },
    },
    walletBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
