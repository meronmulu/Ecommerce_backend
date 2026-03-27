// src/routes/payment.routes.js

const express = require("express");
const router = express.Router();
const {
  initPayment,
  initDeposit,
  chapaCallback,
  verifyPaymentManual,
} = require("../controller/payment.controller");
const { authenticate } = require("../middlewares/authMiddleware");

router.post("/init", authenticate, initPayment);
router.post("/init-deposit", authenticate, initDeposit);
router.get("/verify/:tx_ref", authenticate, verifyPaymentManual);
router.post("/callback", chapaCallback); 

module.exports = router;
