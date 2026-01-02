const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["WALLET", "CONTACT"], required: true },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "IN_ESCROW", "COMPLETED", "CANCELLED", "DISPUTED"],
      default: "PENDING_PAYMENT",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
