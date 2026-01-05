const express = require("express");
const { requestWithdrawal } = require("../controller/withdrawal.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

const router = express.Router();

// Seller requests withdrawal
router.post("/", authenticateUser, requestWithdrawal);

// Admin approves withdrawal
// router.put("/:id/approve", authenticateUser, authorizeRoles("ADMIN"), approveWithdrawal);

module.exports = router;
