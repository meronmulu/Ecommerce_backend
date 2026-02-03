const mongoose = require("mongoose");
const withdrawalSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    bankName: String,
    accountNumber: String,
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Withdrawal", withdrawalSchema);
