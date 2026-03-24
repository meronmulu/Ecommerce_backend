// src/routes/order.routes.js

const express = require("express");
const router = express.Router();
const {
  createOrder,
  markShipped,
  confirmDelivery,
  completeOrder,
  getMyOrders,
} = require("../controller/order.controller");
const { authenticate } = require("../middlewares/authMiddleware");

router.post("/", authenticate, createOrder);
router.get("/my", authenticate, getMyOrders);
router.put("/:id/shipped", authenticate, markShipped);
router.post("/verify-delivery", authenticate, confirmDelivery);
router.put("/:id/complete", authenticate, completeOrder);

module.exports = router;
