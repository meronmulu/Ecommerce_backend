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
      enum: ["Mobile", "Tablet", "PC"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    condition: {
      type: String,
      enum: ["NEW", "USED"],
      required: true,
    },

    brand: String,
    model: String,

    specifications: {
      type: Map,
      of: String,
      default: {},
    },

    images: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SOLD", "BLOCKED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
