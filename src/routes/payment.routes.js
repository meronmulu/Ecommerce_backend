// src/routes/payment.routes.js

const express = require("express");
const router = express.Router();
const {
  initPayment,
  chapaCallback,
} = require("../controller/payment.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/init", authenticateUser, initPayment);
router.post("/callback", chapaCallback); // This might not need auth

module.exports = router;
