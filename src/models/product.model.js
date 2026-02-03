const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      enum: ["mobile", "tablet", "laptop"],
      lowercase: true,
      trim: true,
      required: true,
    },
    condition: {
      type: String,
      enum: ["new", "like new", "used", "defective"],
      lowercase: true,
      trim: true,
      required: true,
    },
    title: String,
    description: String,
    price: { type: Number, required: true },

    // 3 Images: Front, Back, Info
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length === 3,
        message: "Exactly 3 images required (Front, Back, Info)",
      },
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SOLD", "HIDDEN"],
      default: "ACTIVE",
    },
  },
  { timestamps: true },
);

function arrayLimit(val) {
  return val.length >= 0;
} // Logic handled in controller

module.exports = mongoose.model("Product", productSchema);
