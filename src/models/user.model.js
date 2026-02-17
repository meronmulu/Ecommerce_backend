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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },

    role: {
      type: String,
      enum: ["USER", "VERIFIED_SELLER", "ADMIN"],
      default: "USER",
      index: true, // Add index for faster queries
    },

    // Phone Verification
    isPhoneVerified: { type: Boolean, default: false, index: true },
    otp: {
      type: String,
      select: false, // Don't return OTP by default
    },
    otpExpires: {
      type: Date,
      select: false, // Don't return by default
    },

    // ID Verification (KYC)
    kyc: {
      type: kycSchema,
      default: () => ({}),
    },

    // Wallet
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
      get: (v) => Math.round(v * 100) / 100, // Round to 2 decimal places
      set: (v) => Math.round(v * 100) / 100,
    },

    // Device tokens for push notifications
    deviceTokens: [
      {
        type: String,
        select: false,
      },
    ],

    // Account status
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpires;
        delete ret.__v;
        delete ret.deviceTokens;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
    toObject: { getters: true },
  },
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, isPhoneVerified: 1 });
userSchema.index({ "kyc.status": 1 });

// Virtual for full profile URL
userSchema.virtual("profileImageUrl").get(function () {
  return this.profileImage ? `/uploads/users/${this.profileImage}` : null;
});

// Method to check if user is verified seller
userSchema.methods.isVerifiedSeller = function () {
  return this.role === "VERIFIED_SELLER";
};

// Method to check if user can sell
userSchema.methods.canSell = function () {
  return this.isPhoneVerified && this.isActive;
};

// Method to check if user can request verification
userSchema.methods.canRequestVerification = function () {
  return (
    this.role !== "VERIFIED_SELLER" &&
    this.kyc.status !== "PENDING" &&
    this.isActive
  );
};

// Static method to find active verified sellers
userSchema.statics.findVerifiedSellers = function () {
  return this.find({
    role: "VERIFIED_SELLER",
    isActive: true,
  }).select("name email phone kyc.submittedAt");
};

module.exports = mongoose.model("User", userSchema);
