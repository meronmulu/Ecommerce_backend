const express = require("express");
const { sendMessage, getChat } = require("../controller/chat.controller");
const { authenticateUser } = require("../middlewares/authMiddleware");

const router = express.Router();

// Send message to a user
router.post("/", authenticateUser, sendMessage);

// Get chat with a specific user (optional: filter by product)
router.get("/:receiverId", authenticateUser, getChat);

module.exports = router;
