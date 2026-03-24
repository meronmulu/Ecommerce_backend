// server/models/product.model.js

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Matches Step 1 UI
    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true, // e.g. "mobile", "laptop"
    },
    // Matches Step 2 UI
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    // Matches Step 3 UI
    condition: {
      type: String,
      required: true,
      // Using flexible string to match UI values like "Like New", "Good"
    },
    // Group all technical details here
    specs: {
      storage: String, // "256GB"
      ram: String, // "8GB"
      processor: String, // "Intel i7" (Laptop only)
      core: String, // "i5" (Laptop only)
      generation: String, // "11th Gen" (Laptop only)
    },
    // Matches Step 5 UI
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    // Matches Step 4 UI (Image URLs)
    images: {
      type: [String],
      validate: [arrayLimit, "{PATH} exceeds the limit of 10"],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SOLD", "HIDDEN"],
      default: "ACTIVE",
    },
    location: {
      type: String,
      default: "Addis Ababa", // Default for MVP
    },
  },
  { timestamps: true },
);

// Compound indexes for common filter combinations
productSchema.index({ category: 1, status: 1, createdAt: -1 });
productSchema.index({ sellerId: 1, status: 1 });

// Text index for search functionality
productSchema.index(
  { brand: "text", model: "text", description: "text" },
  { weights: { brand: 10, model: 5, description: 1 } }
);

function arrayLimit(val) {
  return val.length <= 10;
}

module.exports = mongoose.model("Product", productSchema);
