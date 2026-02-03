const Product = require("../models/product.model");

const createProduct = async (req, res) => {
  try {
    // Check for 3 images
    if (!req.files || req.files.length < 3) {
      return res
        .status(400)
        .json({ message: "Upload 3 images: Front, Back, Info." });
    }
    const imagePaths = req.files.map((file) => file.path.replace(/\\/g, "/"));
    const product = await Product.create({
      ...req.body,
      images: imagePaths,
      sellerId: req.user.userId,
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    // Populate Seller info so Frontend can see "VERIFIED_SELLER" role and show Blue Badge
    const products = await Product.find({ status: "ACTIVE" }).populate(
      "sellerId",
      "name role isPhoneVerified",
    );

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct, getProducts };
