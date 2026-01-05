const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  cancelOrder,
  getAllOrders
} = require("../controller/order.controller");
const {authenticateUser,authorizeRoles} = require("../middlewares/authMiddleware");

router.post("/", authenticateUser, createOrder);
router.get("/my", authenticateUser, getMyOrders);
router.patch("/:id/cancel", authenticateUser, cancelOrder);
router.get("/all", authenticateUser,authorizeRoles("ADMIN"), getAllOrders);



module.exports = router;
