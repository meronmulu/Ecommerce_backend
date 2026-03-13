const mongoose = require("mongoose");
const Message = require("../models/chat.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");
const admin = require("../config/firebase");

// Helper to generate a consistent conversation ID
const getConversationId = (id1, id2, productId) => {
  const ids = [id1.toString(), id2.toString()].sort();
  return productId ? `${ids[0]}_${ids[1]}_${productId}` : `${ids[0]}_${ids[1]}`;
};

// SEND MESSAGE (Hybrid: DB + Socket + FCM)
const sendMessage = async (req, res) => {
  try {
    const { receiverId, productId, message, type } = req.body;
    const senderId = req.user.userId;

    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const conversationId = getConversationId(senderId, receiverId, productId);

    // 1. Save to Database
    const msg = await Message.create({
      senderId,
      receiverId,
      productId: productId || null,
      conversationId,
      message,
      type: type || "text",
    });

    // Populate sender info for the frontend
    const populatedMsg = await Message.findById(msg._id).populate("senderId", "name profileImage");

    // 2. SOCKET EMIT (Real-time)
    const io = req.app.get("socketio");
    if (io) {
      // Emit to receiver's room
      io.to(receiverId.toString()).emit("receive_message", populatedMsg);
      // Emit to sender's room (multi-device sync)
      io.to(senderId.toString()).emit("receive_message", populatedMsg);
    }

    // 3. FCM PUSH NOTIFICATION (Background)
    const receiver = await User.findById(receiverId);
    if (receiver && receiver.fcmToken) {
      const sender = await User.findById(senderId);
      const payload = {
        notification: {
          title: sender ? sender.name : "New Message",
          body: type === "image" ? "📷 Sent an image" : message,
        },
        data: {
          type: "CHAT_MESSAGE",
          senderId: senderId.toString(),
          conversationId,
          productId: productId ? productId.toString() : "",
        },
        token: receiver.fcmToken,
      };

      admin.messaging().send(payload).catch(err => console.error("FCM Error:", err));
    }

    res.status(201).json({ success: true, data: populatedMsg });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET CONVERSATIONS (REST API)
const getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Aggregate to get unique conversations with the last message
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ["$isRead", false] }, 
                  { $eq: ["$receiverId", userId] }
                ]}, 
                1, 
                0
              ] 
            }
          }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      // Lookup for Sender
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.senderId",
          foreignField: "_id",
          as: "sender"
        }
      },
      { $unwind: "$sender" },
      // Lookup for Receiver
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.receiverId",
          foreignField: "_id",
          as: "receiver"
        }
      },
      { $unwind: "$receiver" },
      // Lookup for Product (Optional)
      {
        $lookup: {
          from: "products",
          localField: "lastMessage.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          conversationId: "$_id",
          unreadCount: 1,
          lastMessage: 1,
          otherPerson: {
            $cond: [
              { $eq: ["$lastMessage.senderId", userId] },
              {
                _id: "$receiver._id",
                name: "$receiver.name",
                profileImage: "$receiver.profileImage",
                role: "$receiver.role"
              },
              {
                _id: "$sender._id",
                name: "$sender.name",
                profileImage: "$sender.profileImage",
                role: "$sender.role"
              }
            ]
          },
          product: "$product"
        }
      }
    ]);

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error("Get Conversations Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET CHAT HISTORY (REST API)
const getChatHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { conversationId, receiverId: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { sendMessage, getConversations, getChatHistory };
