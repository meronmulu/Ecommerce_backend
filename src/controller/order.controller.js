// ================== FILE: server/controller/order.controller.js ==================

const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const { v4: uuidv4 } = require("uuid"); // Install with: npm install uuid

// 1. CREATE ORDER (Generates QR Token)
const createOrder = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    // Safety Checks
    if (!product || product.status !== "ACTIVE") {
      return res.status(400).json({ message: "Product unavailable or sold" });
    }
    if (product.sellerId.toString() === req.user.userId) {
      return res.status(400).json({ message: "You cannot buy your own item" });
    }

    // Generate Secret Unique Token for this transaction (The QR Code content)
    const deliveryToken = uuidv4();

    const order = await Order.create({
      buyerId: req.user.userId,
      sellerId: product.sellerId,
      productId: product._id,
      amount: product.price,
      deliveryToken: deliveryToken, // Stored securely
    });

    // Notify Seller (Real-time)
    const io = req.app.get("socketio");
    io.to(product.sellerId.toString()).emit("order_notification", {
      message: "New Order Received! Wait for payment.",
      orderId: order._id,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. SELLER MARKS SHIPPED
const markShipped = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Not authorized" });

    if (order.status !== "ESCROW_HELD") {
      return res
        .status(400)
        .json({ message: "Cannot ship. Funds not secured yet." });
    }

    order.status = "SHIPPED";
    await order.save();

    // Notify Buyer
    const io = req.app.get("socketio");
    io.to(order.buyerId.toString()).emit("order_update", {
      message: "Seller has shipped your item!",
      orderId: order._id,
      status: "SHIPPED",
    });

    res.json({ success: true, message: "Item marked as shipped" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. CONFIRM DELIVERY (QR SCAN LOGIC)
// Scenario: Seller scans Buyer's QR Code and sends the token here
const confirmDelivery = async (req, res) => {
  try {
    const { orderId, scannedToken } = req.body;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only seller can perform the scan action
    if (order.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Not authorized" });

    // Validate Token
    if (order.deliveryToken !== scannedToken) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid QR Code. Token mismatch." });
    }

    // Update Status & Start Timer
    order.status = "DELIVERED";
    order.deliveredAt = Date.now();
    // Set auto-confirm timer for 24 hours from now
    order.autoConfirmAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await order.save();

    // Notify Buyer (Real-time)
    const io = req.app.get("socketio");
    io.to(order.buyerId.toString()).emit("order_update", {
      message: "Delivery Verified! You have 24 hours to inspect.",
      orderId: order._id,
      status: "DELIVERED",
    });

    res.json({
      success: true,
      message: "Delivery Verified! 24hr Inspection Timer Started.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. COMPLETE ORDER (FUNDS RELEASE)
// Triggered manually by Buyer, OR automatically by Cron Job
const completeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Only Buyer can manually accept
    if (order.buyerId.toString() !== req.user.userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: "Only buyer can accept item" });
    }

    if (order.status !== "DELIVERED") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Item must be delivered first" });
    }

    if (order.status === "COMPLETED") {
       await session.abortTransaction();
       session.endSession();
       return res.status(400).json({ success: false, message: "Already completed" });
    }

    // 1. Add money to Seller Wallet
    await User.findByIdAndUpdate(order.sellerId, 
      { $inc: { walletBalance: order.amount } },
      { session }
    );

    // 2. Mark Product Sold
    await Product.findByIdAndUpdate(order.productId, 
      { status: "SOLD" },
      { session }
    );

    // 3. Mark Order Complete
    order.status = "COMPLETED";
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Notify Seller (External to transaction)
    const io = req.app.get("socketio");
    if (io) {
      io.to(order.sellerId.toString()).emit("wallet_update", {
        message: `You received ${order.amount} ETB!`,
        amount: order.amount,
      });
    }

    res.json({ success: true, message: "Funds released to seller!" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. GET MY ORDERS
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyerId: req.user.userId }, { sellerId: req.user.userId }],
    })
      .populate("productId", "title brand model price images")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  markShipped,
  confirmDelivery,
  completeOrder,
  getMyOrders,
};
