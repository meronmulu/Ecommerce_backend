// src/routes/product.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
  createProduct,
  getProducts,
} = require("../controller/product.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.get("/", getProducts);
router.post("/", authenticateUser, upload.array("images", 5), createProduct);

module.exports = router;
