const Message = require("../models/chat.model");

// SEND MESSAGE
const sendMessage = async (req, res) => {
  try {
    const { receiverId, productId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: "receiverId and message are required" });
    }

    const msg = await Message.create({
      senderId: req.user.userId,
      receiverId,
      productId,
      message,
    });

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET CHAT BETWEEN LOGGED-IN USER AND RECEIVER
const getChat = async (req, res) => {
  try {
    const { receiverId, productId } = req.params;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: "receiverId is required" });
    }

    // Fetch messages where either sender/receiver matches
    const messages = await Message.find({
      productId: productId || null, // optional filter by product
      $or: [
        { senderId: req.user.userId, receiverId },
        { senderId: receiverId, receiverId: req.user.userId },
      ],
    }).sort("createdAt");

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { sendMessage, getChat };
