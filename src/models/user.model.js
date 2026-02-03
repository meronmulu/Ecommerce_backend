const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },

    // ROLES:
    // USER: Standard (Can buy/sell immediately)
    // VERIFIED_SELLER: Super User (Blue Badge, Online Shop)
    // ADMIN: Approves requests
    role: {
      type: String,
      enum: ["USER", "VERIFIED_SELLER", "ADMIN"],
      default: "USER",
    },

    // 1. Phone Verification (OTP)
    isPhoneVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    // 2. ID Verification (For Blue Badge Request)
    kyc: {
      status: {
        type: String,
        enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
        default: "NONE",
      },
      idImage: { type: String }, // Path to ID image
      submittedAt: { type: Date },
    },

    // Wallet (Atomic Safe)
    walletBalance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
