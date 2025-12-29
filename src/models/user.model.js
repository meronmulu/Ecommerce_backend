const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    phone: String,

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER"
    },

    isVerified: { type: Boolean, default: false },

    walletBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
