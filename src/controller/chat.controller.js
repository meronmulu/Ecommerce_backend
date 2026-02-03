const Message = require("../models/chat.model");

// SEND MESSAGE
const sendMessage = async (req, res) => {
  try {
    const { receiverId, productId, message } = req.body;
    const senderId = req.user.userId;

    if (!receiverId || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    // 1. Save to Database
    const msg = await Message.create({
      senderId,
      receiverId,
      productId,
      message,
    });

    // 2. SOCKET EMIT (Real-time)
    const io = req.app.get("socketio");

    // Emit to the Receiver's private room
    io.to(receiverId).emit("receive_message", msg);

    // Also emit to Sender (optional, useful if they have multiple devices open)
    // io.to(senderId).emit("receive_message", msg);

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET CHAT (No changes needed here, this loads history)
const getChat = async (req, res) => {
  try {
    const { receiverId, productId } = req.params;
    const messages = await Message.find({
      productId: productId || null,
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
