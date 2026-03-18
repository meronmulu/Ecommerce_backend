// server/routes/product.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload"); // Your existing Multer config
const {
  createProduct,
  getProducts,
  getProductById,
  deleteProduct,
  updateProductStatus,
  updateProduct,
} = require("../controller/product.controller");
const { authenticate } = require("../middlewares/authMiddleware");

// PUBLIC ROUTES (Browsing)
router.get("/", getProducts);
router.get("/:id", getProductById);

// PROTECTED ROUTES (Selling)
// 'images' is the field name Flutter must use. '10' is max count.
router.post("/", authenticate, upload.array("images", 10), createProduct);

// Management Routes
router.patch("/:id", authenticate, upload.array("images", 10), updateProduct);
router.patch("/:id/status", authenticate, updateProductStatus);
router.delete("/:id", authenticate, deleteProduct);

module.exports = router;
