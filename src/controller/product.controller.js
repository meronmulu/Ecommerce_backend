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

    // Search Logic (Text Search using Indexes)
    if (search) {
      query.$text = { $search: search };
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

    const products = await Product.find(query, {
      // PROJECTION: Only return fields needed for the list view
      title: 1, 
      price: 1, 
      images: { $slice: 1 }, // Only send the first image
      category: 1,
      brand: 1,
      model: 1,
      location: 1,
      status: 1,
      createdAt: 1,
      sellerId: 1,
      // If doing text search, include score for sorting
      ...(search && { score: { $meta: "textScore" } }),
    })
      .populate("sellerId", "name profileImage location") 
      .sort(search ? { score: { $meta: "textScore" } } : sortObj)
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

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check ownership
    if (product.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You are not authorized to delete this product" });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT STATUS
const updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check ownership
    if (product.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You are not authorized to update this product" });
    }

    product.status = status.toUpperCase();
    await product.save();

    res.json({ success: true, message: "Status updated successfully", data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check ownership
    if (product.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You are not authorized to update this product" });
    }

    // Update with allowed fields from body
    const allowedFields = ['title', 'price', 'description', 'location', 'condition', 'category', 'brand', 'model'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    // Handle specs if provided (might be sent as a JSON string in Multipart)
    let specs = req.body.specs;
    if (typeof specs === 'string') {
      try {
        specs = json.parse(specs);
      } catch (e) {
         // Ignore if not JSON
      }
    }
    if (specs) {
      product.specs = { ...product.specs, ...specs };
    }

    // Handle Image Updates
    if (req.files && req.files.length > 0) {
      // For simplicity, we replace all images if any new ones are uploaded
      // (Advanced version: support adding/removing specific images)
      const imagePaths = req.files.map((file) => file.path.replace(/\\/g, "/"));
      product.images = imagePaths;
    }

    await product.save();

    res.json({ success: true, message: "Product updated successfully", data: product });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  deleteProduct,
  updateProductStatus,
  updateProduct,
};
