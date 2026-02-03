const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
  createProduct,
  getProducts,
} = require("../controller/product.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.get("/", getProducts);
// Upload 3 images
router.post("/", authenticateUser, upload.array("images", 5), createProduct);

module.exports = router;
