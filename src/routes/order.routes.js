const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  cancelOrder,
  getAllOrders,
  completeOrder, // Import the new function
} = require("../controller/order.controller");
const {
  authenticateUser,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

// Create Order
router.post("/", authenticateUser, createOrder);

// Get My Orders
router.get("/my", authenticateUser, getMyOrders);

// Cancel Order
router.patch("/:id/cancel", authenticateUser, cancelOrder);

// Buyer Confirms Receipt (Releases Money)
router.put("/:id/complete", authenticateUser, completeOrder);

// Admin Get All
router.get("/all", authenticateUser, authorizeRoles("ADMIN"), getAllOrders);

module.exports = router;
