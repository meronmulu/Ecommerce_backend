// server/controller/product.controller.js

const Product = require("../models/product.model");
const User = require("../models/user.model");

// CREATE PRODUCT (The Sell Wizard Endpoint)
const createProduct = async (req, res) => {
  try {
    // 1. Image Validation
    if (!req.files || req.files.length < 3) {
      return res
        .status(400)
        .json({ message: "Please upload at least 3 images." });
    }

    // 2. Destructure Data (Coming from Flutter Multipart Request)
    const {
      category,
      brand,
      model,
      condition,
      price,
      description,
      // Specs are sent as individual fields by Flutter Multipart
      storage,
      ram,
      processor,
      core,
      generation,
      location,
    } = req.body;

    // 3. Process Image Paths
    // Replaces backslashes for Windows server compatibility
    const imagePaths = req.files.map((file) => file.path.replace(/\\/g, "/"));

    // 4. Create Database Entry
    const seller = await User.findById(req.user.userId);
    const product = await Product.create({
      sellerId: req.user.userId, // From Auth Token
      category,
      brand,
      model,
      condition,
      price: Number(price), // Ensure number type
      description,
      images: imagePaths,
      location: location || (seller ? seller.location : "Addis Ababa"),
      // Group the specs
      specs: {
        storage,
        ram,
        processor,
        core,
        generation,
      },
    });

    res.status(201).json({
      success: true,
      message: "Product listed successfully!",
      data: product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET ALL PRODUCTS (For Home/Search Page)
const getProducts = async (req, res) => {
  try {
    const { category, search, status, sort, limit, sellerId, location } = req.query;
    
    // Default to ACTIVE if status not provided, but allow "ALL" or specific statuses
    let query = {};
    if (status && status.toUpperCase() !== "ALL") {
      query.status = status.toUpperCase();
    } else if (!status) {
      query.status = "ACTIVE";
    }

    // Filter by Seller
    if (sellerId) {
      query.sellerId = sellerId;
    }

    // Filter by Location
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    // Filter by Category
    if (category) {
      query.category = category.toLowerCase();
    }

    // Search Logic (Regex)
    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Determine sort order
    let sortObj = { createdAt: -1 }; // Default: Newest first
    if (sort === "sold") {
      sortObj = { updatedAt: -1 }; // Most recently updated (sold) first
    } else if (sort === "trending") {
      sortObj = { views: -1, createdAt: -1 }; 

    }

    // Determine limit
    const queryLimit = limit ? parseInt(limit, 10) : 0; // 0 means no limit in Mongoose

    const products = await Product.find(query)
      .populate("sellerId", "name role isEmailVerified location profileImage") // Added profileImage
      .sort(sortObj)
      .limit(queryLimit);

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE PRODUCT (For Details Page)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "sellerId",
      "name role isEmailVerified phone location profileImage",
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct, getProducts, getProductById };
