const express = require("express");
const router = express.Router();

const {createProduct,getProducts,getProductById,updateProduct,deleteProduct,} = require("../controller/product.controller");

const {authenticateUser,} = require("../middlewares/authMiddleware");

// public
router.get("/", getProducts);
router.get("/:id", getProductById);

// protected
router.post("/", authenticateUser, createProduct);
router.put("/:id", authenticateUser, updateProduct);
router.delete("/:id", authenticateUser, deleteProduct);

module.exports = router;
