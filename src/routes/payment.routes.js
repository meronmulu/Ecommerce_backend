const express = require("express");
const { initPayment, chapaCallback } = require("../controller/payment.controller.js");
const { authenticateUser } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/init", authenticateUser, initPayment); // Only logged-in users
router.post("/callback", chapaCallback); // Chapa calls this

module.exports = router;
