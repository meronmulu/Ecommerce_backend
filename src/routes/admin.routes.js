const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getPendingKyc,
  approveKyc,
  rejectKyc,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} = require("../controller/admin.controller");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

// All admin routes are protected and require "ADMIN" role
router.use(authenticate, authorize("ADMIN"));

// User & KYC Management
router.get("/users", getAllUsers);
router.get("/kyc/pending", getPendingKyc);
router.put("/kyc/:userId/approve", approveKyc);
router.put("/kyc/:userId/reject", rejectKyc);

// Withdrawal Management
router.get("/withdrawals/pending", getPendingWithdrawals);
router.put("/withdrawals/:id/approve", approveWithdrawal);
router.put("/withdrawals/:id/reject", rejectWithdrawal);

module.exports = router;
