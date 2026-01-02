const Product = require("../models/product.model");

// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      sellerId: req.user.userId, // from JWT
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL PRODUCTS (public)
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "ACTIVE" })
      .populate("sellerId", "name email");

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("sellerId", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE PRODUCT (seller or admin)
const updateProduct = async (req, res) => {
  try {
    // 🚫 Reject invalid JSON (Postman mistake protection)
    if (typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON body",
      });
    }

    const product = await Product.findById(req.params.id);

    // ❌ Product not found
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // 🔐 Authorization check
    if (
      product.sellerId.toString() !== req.user.userId &&
      req.user.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // 🚫 Prevent forbidden field updates
    delete req.body.sellerId;
    delete req.body.createdAt;
    delete req.body.updatedAt;
    delete req.body.__v;

    // ✅ Force update (works for title, specs, everything)
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Product updated",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (
      product.sellerId.toString() !== req.user.userId &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
