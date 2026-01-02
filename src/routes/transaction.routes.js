const express = require("express");
const router = express.Router();
const { topUpWallet, getMyTransactions } = require("../controllers/transaction.controller");
const { authenticateUser } = require("../middleware/auth.middleware");

// Top-up wallet
router.post("/topup", authenticateUser, topUpWallet);

// Get transaction history
router.get("/my", authenticateUser, getMyTransactions);

module.exports = router;
