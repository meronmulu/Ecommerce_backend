const express = require("express");
const router = express.Router();
const {
  createOrder,
  markShipped,
  confirmDelivery,
  completeOrder,
  getMyOrders,
} = require("../controller/order.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/", authenticateUser, createOrder);
router.get("/my", authenticateUser, getMyOrders);
router.put("/:id/shipped", authenticateUser, markShipped);
router.post("/verify-delivery", authenticateUser, confirmDelivery); // QR Scan
router.put("/:id/complete", authenticateUser, completeOrder); // Fund Release

module.exports = router;
