const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: false },
    type: { 
      type: String, 
      enum: ["DEPOSIT", "ORDER_PAYMENT"], 
      default: "ORDER_PAYMENT" 
    },
    tx_ref: { type: String, required: true, unique: true },
    amount: Number,
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Payment", paymentSchema);
