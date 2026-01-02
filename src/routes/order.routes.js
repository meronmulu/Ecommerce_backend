const express = require("express");
const router = express.Router();
const { createWalletOrder, getMyOrders, getSoldProducts } = require("../controllers/order.controller");
const { authenticateUser } = require("../middleware/auth.middleware");

// Buy product with wallet
router.post("/wallet", authenticateUser, createWalletOrder);

// View buyer orders
router.get("/my", authenticateUser, getMyOrders);

// View seller sold products
router.get("/sold", authenticateUser, getSoldProducts);

module.exports = router;
