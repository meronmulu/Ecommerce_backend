const express = require("express");
const router = express.Router();
const { addMoneyToWallet } = require("../controller/wallet.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/topup", authenticateUser, addMoneyToWallet);

module.exports = router;
