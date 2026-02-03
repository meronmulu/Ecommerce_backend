const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    message: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Message", messageSchema);
