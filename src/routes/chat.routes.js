// src/routes/chat.routes.js

const express = require("express");
const router = express.Router();
const { sendMessage, getChat } = require("../controller/chat.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/", authenticateUser, sendMessage);
router.get("/:receiverId", authenticateUser, getChat);

module.exports = router;
