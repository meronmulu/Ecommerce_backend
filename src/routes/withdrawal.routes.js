// src/routes/withdrawal.routes.js

const express = require("express");
const router = express.Router();
const { requestWithdrawal } = require("../controller/withdrawal.controller");
const { authenticate } = require("../middlewares/authMiddleware");

router.post("/", authenticate, requestWithdrawal);

module.exports = router;
