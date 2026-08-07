// server/routes/product.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload"); // Your existing Multer config
const {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  deleteProduct,
  updateProductStatus,
  updateProduct,
} = require("../controller/product.controller");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

// PUBLIC ROUTES (Browsing)
router.get("/", getProducts);
router.get("/my", authenticate, getMyProducts);
router.get("/:id", getProductById);

// PROTECTED ROUTES (Selling)
// 'images' is the field name Flutter must use. '10' is max count.
router.post("/", authenticate, authorize("VERIFIED_SELLER", "ADMIN"), upload.array("images", 10), createProduct);

// Management Routes
router.patch("/:id", authenticate, authorize("VERIFIED_SELLER", "ADMIN"), upload.array("images", 10), updateProduct);
router.patch("/:id/status", authenticate, authorize("VERIFIED_SELLER", "ADMIN"), updateProductStatus);
router.delete("/:id", authenticate, authorize("VERIFIED_SELLER", "ADMIN"), deleteProduct);

module.exports = router;
