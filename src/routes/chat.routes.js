// src/routes/chat.routes.js

const express = require("express");
const router = express.Router();
const { sendMessage, getConversations, getChatHistory } = require("../controller/chat.controller");
const { authenticate } = require("../middlewares/authMiddleware");

router.post("/", authenticate, sendMessage);
router.get("/conversations", authenticate, getConversations);
router.get("/history/:conversationId", authenticate, getChatHistory);

module.exports = router;
