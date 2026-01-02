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
    const product = await Product.findById(req.params.id);
     if (!product) { 
      return res.status(404).json(
      { 
        success: false, 
        message: "Product not found" 
      }); 
    }
      if ( product.sellerId.toString() !== req.user.userId && req.user.role !== "ADMIN" )  { 
        return res.status(403).json({
           success: false, 
           message: "Not authorized"
           }); 
          }
            Object.assign(product, req.body); 
            await product.save(); 
            res.status(200).json({ 
              success: true,
               message: "Product updated", 
               data: product, }); 
          } catch (error) {
             res.status(500).json({ 
              success: false, 
              message: error.message }); } };





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
