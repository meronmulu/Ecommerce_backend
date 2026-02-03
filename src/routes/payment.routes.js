const express = require("express");
const router = express.Router();
const {
  initPayment,
  chapaCallback,
} = require("../controller/payment.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/init", authenticateUser, initPayment);
router.post("/callback", chapaCallback);
module.exports = router;
