// server/routes/product.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload"); // Your existing Multer config
const {
  createProduct,
  getProducts,
  getProductById,
} = require("../controller/product.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

// PUBLIC ROUTES (Browsing)
router.get("/", getProducts);
router.get("/:id", getProductById);

// PROTECTED ROUTES (Selling)
// 'images' is the field name Flutter must use. '10' is max count.
router.post("/", authenticateUser, upload.array("images", 10), createProduct);

module.exports = router;
