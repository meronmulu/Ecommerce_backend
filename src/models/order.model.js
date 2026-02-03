const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    amount: { type: Number, required: true },

    // QR Code Secret
    deliveryToken: { type: String },

    status: {
      type: String,
      enum: [
        "PENDING", // Created
        "ESCROW_HELD", // Paid (Money held by App)
        "SHIPPED", // Seller on the way
        "DELIVERED", // QR Scanned
        "COMPLETED", // Funds Released
        "DISPUTED", // Issue reported
        "CANCELLED", // Cancelled
      ],
      default: "PENDING",
    },

    deliveredAt: { type: Date },
    autoConfirmAt: { type: Date }, // 24hr timer
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
