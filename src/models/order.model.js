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
    amount: {
      type: Number,
      required: true,
    },
    // UPDATED STATUS ENUMS FOR ESCROW
    status: {
      type: String,
      enum: [
        "PENDING", // Order created, not paid
        "ESCROW_HELD", // Paid, Money held by App
        "SHIPPED", // Seller sent item
        "DELIVERED", // Item reached buyer
        "COMPLETED", // Buyer accepted, Money released
        "DISPUTED", // Problem reported
        "CANCELLED", // Cancelled before payment
      ],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
