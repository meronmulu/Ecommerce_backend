const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");

// CREATE ORDER
const createOrder = async (req, res) => {
  try {
    const product = await Product.findById(req.body.productId);

    if (!product || product.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ success: false, message: "Product not available" });
    }

    if (product.sellerId.toString() === req.user.userId) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot buy your own product" });
    }

    const order = await Order.create({
      buyerId: req.user.userId,
      sellerId: product.sellerId,
      productId: product._id,
      amount: product.price,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MY ORDERS
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyerId: req.user.userId }, { sellerId: req.user.userId }],
    })
      .populate("productId", "title price images")
      .populate("buyerId", "name")
      .populate("sellerId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// COMPLETE ORDER (THE RELEASE FUND LOGIC)
const completeOrder = async (req, res) => {
  try {
    // Find order and populate seller to give them money
    const order = await Order.findById(req.params.id).populate("sellerId");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // SECURITY: Only the Buyer can say "I received it"
    if (order.buyerId.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the buyer can complete this order" });
    }

    // Check if funds are actually held
    if (order.status !== "ESCROW_HELD" && order.status !== "DELIVERED") {
      return res
        .status(400)
        .json({ message: "Funds are not in Escrow or not paid yet" });
    }

    if (order.status === "COMPLETED") {
      return res.status(400).json({ message: "Order already completed" });
    }

    // 1. RELEASE FUNDS TO SELLER
    const seller = order.sellerId;
    seller.walletBalance = (seller.walletBalance || 0) + order.amount;
    await seller.save();

    // 2. Mark Product as SOLD
    await Product.findByIdAndUpdate(order.productId, { status: "SOLD" });

    // 3. Mark Order as COMPLETED
    order.status = "COMPLETED";
    await order.save();

    res.json({
      success: true,
      message: "Order completed. Funds released to Seller.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllOrders = async (req, res) => {
  // Keep your existing admin logic
  try {
    const orders = await Order.find()
      .populate("productId")
      .populate("buyerId")
      .populate("sellerId");
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  // Keep your existing cancel logic
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Not found" });
    if (order.status !== "PENDING")
      return res.status(400).json({ message: "Cannot cancel paid order" });
    order.status = "CANCELLED";
    await order.save();
    res.json({ success: true, message: "Cancelled" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  completeOrder,
  getAllOrders,
  cancelOrder,
};
