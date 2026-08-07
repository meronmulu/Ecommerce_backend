// src/routes/withdrawal.routes.js

const express = require("express");
const router = express.Router();
const { requestWithdrawal, getMyWithdrawals } = require("../controller/withdrawal.controller");
const { authenticate } = require("../middlewares/authMiddleware");

router.get("/my", authenticate, getMyWithdrawals);
router.post("/", authenticate, requestWithdrawal);

module.exports = router;
