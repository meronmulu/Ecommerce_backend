// server/controller/product.controller.js

const Product = require("../models/product.model");

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
    const product = await Product.create({
      sellerId: req.user.userId, // From Auth Token
      category,
      brand,
      model,
      condition,
      price: Number(price), // Ensure number type
      description,
      images: imagePaths,
      location: location || "Addis Ababa",
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
    const { category, search } = req.query;
    let query = { status: "ACTIVE" };

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

    const products = await Product.find(query)
      .populate("sellerId", "name role isEmailVerified") // Get seller info
      .sort({ createdAt: -1 }); // Newest first

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
      "name role isEmailVerified phone",
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
