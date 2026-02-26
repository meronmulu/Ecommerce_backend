// src/routes/withdrawal.routes.js

const express = require("express");
const router = express.Router();
const { requestWithdrawal } = require("../controller/withdrawal.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/", authenticateUser, requestWithdrawal);

module.exports = router;
